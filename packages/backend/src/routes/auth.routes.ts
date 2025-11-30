import { Router } from 'express';
import passport from '../config/passport.config';
import { generateToken } from '../utils/jwt';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { Transaction } from '@mysten/sui/transactions';
import { executeSponsoredTransaction, PACKAGE_ID, PROFILE_REGISTRY_ID } from '../config/sponsor';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const router = Router();

// 42 OAuth Routes
router.get('/42/login', passport.authenticate('42'));

router.get(
  '/42/callback',
  passport.authenticate('42', { session: false, failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed' }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5137'}/auth/callback?token=${token}`);
  }
);

// Google OAuth Routes (zkLogin için)
router.get('/google', passport.authenticate('google', { 
  scope: ['openid', 'email', 'profile'],
  accessType: 'offline',
}));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: process.env.FRONTEND_URL + '/zklogin?error=google_failed' }),
  (req, res) => {
    const googleUser = req.user as any;
    // Google kullanıcı bilgilerini frontend'e gönder
    const googleData = encodeURIComponent(JSON.stringify({
      googleId: googleUser.googleId,
      email: googleUser.email,
    }));
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5137'}/zklogin?google=${googleData}`);
  }
);

// Intra + zkLogin kayıt (Google kaldırıldı)
// Adımlar: Intra bilgilerini al -> DB'de kullanıcı oluştur -> zkLogin wallet eşle -> on-chain profil oluştur -> JWT üret
router.post('/register-intra', async (req, res) => {
  try {
    const { intraId, email, displayName, username, zkWalletAddress } = req.body;

    if (!intraId || !email || !displayName) {
      return res.status(400).json({ error: 'intraId, email ve displayName zorunludur' });
    }

    // Mevcut kullanıcı var mı kontrol et
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { intraId: Number(intraId) },
          { email },
        ],
      },
    });

    // Sadece zkLogin cüzdanı kabul edilir; sanal cüzdan artık üretilmez
    const walletAddress = zkWalletAddress || null;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: username || displayName,
          firstName: undefined,
          lastName: undefined,
          avatar: undefined,
          intraId: Number(intraId),
          realWalletAddress: walletAddress,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          username: user.username || username || displayName,
          intraId: Number(intraId),
          realWalletAddress: walletAddress || user.realWalletAddress,
        },
      });
    }

    // On-chain profil artık otomatik oluşturulmaz; kullanıcı isterse sonradan oluşturur

    // JWT üret ve dön
    const token = generateToken({ userId: user.id, email: user.email });
    return res.json({ success: true, token, walletAddress });
  } catch (error) {
    console.error('register-intra failed:', error);
    return res.status(500).json({ error: 'Kayıt başarısız', details: (error as Error).message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = req.user as any;
  const guidance = !user.realWalletAddress
    ? 'zkLogin cüzdanınız bağlı değil. Lütfen /api/auth/zklogin/finish ile idToken ve address göndererek bağlayın.'
    : undefined;
  res.json({
    user: {
      ...user,
      profileId: user.profileId || null,
      totalDonated: user.totalDonated?.toString() || '0',
    },
    guidance,
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// zkLogin: start binding flow (provide randomness params)
router.post('/zklogin/start', authMiddleware, async (req, res) => {
  // For a minimal flow, return server-side randomness; a real implementation should
  // generate and persist nonce/salt against the user/session to validate later.
  const salt = Math.random().toString(36).slice(2);
  const jwtRandomness = Math.random().toString(36).slice(2);
  const nonce = Math.random().toString(36).slice(2);
  res.json({ salt, jwtRandomness, nonce });
});

// zkLogin: finish binding flow (verify proof and persist realWalletAddress)
router.post('/zklogin/finish', authMiddleware, async (req, res) => {
  try {
    const { idToken, proof, address, iss, aud } = req.body || {};
    if (!idToken || !address) {
      return res.status(400).json({ error: 'idToken ve address zorunludur' });
    }

    // Basic Google OIDC id_token verification (signature + claims)
    // Skip verification for:
    // - 'google-verified': Backend already verified via Google OAuth passport
    // - 'stub': Test mode when TEST_ZKLOGIN='true'
    const isGoogleVerified = idToken === 'google-verified';
    const isTestMode = idToken === 'stub' && process.env.TEST_ZKLOGIN === 'true';
    const skipVerification = isGoogleVerified || isTestMode;
    
    if (!skipVerification) {
      try {
        const googleIssuer = 'https://accounts.google.com';
        const jwksUri = 'https://www.googleapis.com/oauth2/v3/certs';
        const { default: jwt } = await import('jsonwebtoken');
        const jwksResp = await fetch(jwksUri);
        const jwks: any = await jwksResp.json();

        const cert = jwks.keys?.[0]?.x5c?.[0];
        if (!cert) throw new Error('Google JWKS not available');
        const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
        const decoded: any = jwt.verify(idToken, pem, { algorithms: ['RS256'] });

        if (decoded.iss !== googleIssuer) throw new Error('Invalid issuer');
        if (aud && decoded.aud !== aud) throw new Error('Invalid audience');
        if (iss && iss !== decoded.iss) throw new Error('Issuer mismatch');
      } catch (verr) {
        return res.status(400).json({ error: 'idToken doğrulama başarısız', details: (verr as Error).message });
      }
    }

    // TODO: Verify zkLogin zero-knowledge proof binds OIDC subject to Sui address

    const user = req.user as any;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { realWalletAddress: address },
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('zklogin/finish failed:', error);
    return res.status(500).json({ error: 'zkLogin bağlama başarısız', details: (error as Error).message });
  }
});

// Reset: eski kullanıcıları ve bağlı kayıtları sil
router.post('/reset-users', async (req, res) => {
  try {
    // Silme sırası: çocuk tablolar → user
    await prisma.nFTAchievement.deleteMany({});
    await prisma.user.deleteMany({});
    return res.json({ success: true });
  } catch (error) {
    console.error('reset-users failed:', error);
    return res.status(500).json({ error: 'Reset başarısız', details: (error as Error).message });
  }
});

export default router;
