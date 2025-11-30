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
        // Create new user (cüzdan sonra zkLogin ile bağlanır)
        user = await prisma.user.create({
          data: {
            email: intraUser.email,
            username: intraUser.login,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            avatar: intraUser.image?.link || intraUser.image_url,
            intraId: intraUser.id,
            // realWalletAddress boş kalır; zkLogin ile bağlanır
          },
        });
      } else if (!user.intraId) {
        // Link 42 Intra account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            intraId: intraUser.id,
            username: intraUser.login,
            firstName: intraUser.first_name,
            lastName: intraUser.last_name,
            avatar: intraUser.image?.link || intraUser.image_url,
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

// Google OAuth Strategy (zkLogin için)
const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Google profil bilgilerini döndür (kullanıcı oluşturmuyoruz, sadece zkLogin için kullanacağız)
      return done(null, {
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        idToken: (profile as any)._json?.id_token, // id_token varsa
      });
    } catch (error) {
      return done(error, null);
    }
  }
);

passport.use('google', googleStrategy);

export default passport;
