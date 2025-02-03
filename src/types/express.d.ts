import { User } from '../entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
      hasuraClaims?: Record<string, any>;
      rawBody?: Buffer;
    }
  }
}