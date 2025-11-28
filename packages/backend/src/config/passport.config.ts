import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';
import axios from 'axios';

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

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { intraId: intraUser.id },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: intraUser.email,
            username: intraUser.login,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            avatar: intraUser.image?.link || intraUser.image_url,
            intraId: intraUser.id,
          },
        });
      } else {
        // Update user info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            avatar: intraUser.image?.link || intraUser.image_url,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
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
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            username: email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5),
          },
        });
      } else if (!user.googleId) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
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
