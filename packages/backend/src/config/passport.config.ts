import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';
import axios from 'axios';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Generate a virtual wallet address for users who don't connect a real wallet
function generateVirtualWalletAddress(): string {
  const keypair = Ed25519Keypair.generate();
  return keypair.getPublicKey().toSuiAddress();
}

// 42 OAuth Strategy
const oauth42Strategy = new OAuth2Strategy(
  {
    authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
    tokenURL: 'https://api.intra.42.fr/oauth/token',
    clientID: process.env.OAUTH_42_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_42_CLIENT_SECRET || '',
    callbackURL: process.env.OAUTH_42_CALLBACK_URL || 'http://localhost:3000/api/auth/42/callback',
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      // Fetch user data from 42 API
      const response = await axios.get('https://api.intra.42.fr/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const intraUser = response.data;

      // Find existing user by intraId OR email (to merge accounts)
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { intraId: intraUser.id },
            { email: intraUser.email },
          ],
        },
      });

      if (!user) {
        // Create new user with virtual wallet address
        user = await prisma.user.create({
          data: {
            email: intraUser.email,
            username: intraUser.login,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            avatar: intraUser.image?.link || intraUser.image_url,
            intraId: intraUser.id,
            suiWalletAddress: generateVirtualWalletAddress(), // Auto-generate virtual wallet
          },
        });
      } else if (!user.intraId) {
        // Link 42 Intra account to existing user (e.g., if they signed up with Google first)
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            intraId: intraUser.id,
            username: intraUser.login,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            avatar: intraUser.image?.link || intraUser.image_url,
            // Ensure virtual wallet exists
            suiWalletAddress: user.suiWalletAddress || generateVirtualWalletAddress(),
          },
        });
      } else {
        // Update existing 42 user info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            avatar: intraUser.image?.link || intraUser.image_url,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            // Ensure virtual wallet exists
            suiWalletAddress: user.suiWalletAddress || generateVirtualWalletAddress(),
          },
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
);

// Google OAuth Strategy
const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;

      if (!email) {
        return done(new Error('No email found'), null);
      }

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
      });

      if (!user) {
        // Create new user with virtual wallet address
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const defaultAvatar = 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/sui.svg';

        // Generate username from name or email
        let username = '';
        if (firstName && lastName) {
          username = (firstName + lastName).toLowerCase().replace(/\s+/g, '');
        } else if (firstName) {
          username = firstName.toLowerCase().replace(/\s+/g, '');
        } else {
          username = email.split('@')[0];
        }

        // Add random suffix to ensure uniqueness
        username = username + '_' + Math.random().toString(36).substring(2, 7);

        user = await prisma.user.create({
          data: {
            email,
            googleId,
            firstName,
            lastName,
            avatar: profile.photos?.[0]?.value || defaultAvatar, // Sui logo if no photo
            username,
            suiWalletAddress: generateVirtualWalletAddress(), // Auto-generate virtual wallet
          },
        });
      } else if (!user.googleId) {
        // Link Google account to existing user (e.g., if they signed up with 42 Intra first)
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            // Update info if not already set
            firstName: user.firstName || profile.name?.givenName,
            lastName: user.lastName || profile.name?.familyName,
            avatar: user.avatar || profile.photos?.[0]?.value,
            // Ensure virtual wallet exists
            suiWalletAddress: user.suiWalletAddress || generateVirtualWalletAddress(),
          },
        });
      } else {
        // Update existing Google user info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            // Ensure virtual wallet exists
            suiWalletAddress: user.suiWalletAddress || generateVirtualWalletAddress(),
          },
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
);

passport.use('42', oauth42Strategy);
passport.use('google', googleStrategy);

export default passport;
