import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends Partial<User> {}
    interface Request {
      user?: User;
    }
  }
}
