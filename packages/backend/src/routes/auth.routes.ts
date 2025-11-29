import { Router } from 'express';
import passport from '../config/passport.config';
import { generateToken } from '../utils/jwt';
import { authMiddleware } from '../middlewares/auth.middleware';

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

// Google OAuth Routes
router.get(
  '/google/login',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed' }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5137'}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = req.user as any;
  res.json({
    user: {
      ...user,
      profileId: user.profileId || null,
      // BigInt'i string'e çevir
      totalDonated: user.totalDonated?.toString() || '0',
    },
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
