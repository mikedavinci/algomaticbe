import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clerk } from '@clerk/express';
import { HasuraService } from '../hasura/hasura.service';

@Injectable()
export class ClerkService {
  constructor(
    private readonly configService: ConfigService,
    private readonly hasuraService: HasuraService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    
    // Initialize Clerk client by setting the secret key in the environment
    process.env.CLERK_SECRET_KEY = secretKey;
  }

  async verifyToken(token: string): Promise<{
    userId: string;
    hasuraClaims: Record<string, any>;
  }> {
    try {
      // Get session from token
      const sessionId = token.split('_')[1]; // Clerk tokens are in format "sess_xxx"
      const session = await Clerk.sessions.verifySession(sessionId, token);
      
      if (!session) {
        throw new Error('Invalid token');
      }

      // Get user details
      const user = await Clerk.users.getUser(session.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Default role is 'user'
      const defaultRole = 'user';
      
      // Get user's roles from Clerk metadata or organization
      const userRoles = user.publicMetadata?.roles || [defaultRole];

      // Construct Hasura claims
      const hasuraClaims = {
        'x-hasura-allowed-roles': userRoles,
        'x-hasura-default-role': defaultRole,
        'x-hasura-user-id': user.id,
      };

      return {
        userId: user.id,
        hasuraClaims,
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async syncUserWithHasura(userId: string, email: string, metadata: any): Promise<void> {
    const syncUserMutation = `
      mutation SyncUser($userId: String!, $email: String!, $metadata: jsonb) {
        insert_users_one(
          object: {
            id: $userId,
            email: $email,
            metadata: $metadata
          },
          on_conflict: {
            constraint: users_pkey,
            update_columns: [email, metadata]
          }
        ) {
          id
        }
      }
    `;

    await this.hasuraService.executeQuery(syncUserMutation, {
      userId,
      email,
      metadata,
    });
  }
}