import { Injectable, Logger } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { HasuraService } from '../hasura/hasura.service';

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly hasuraService: HasuraService,
  ) {}

  async handleUserCreated(data: any) {
    try {
      const { id, email_addresses, public_metadata } = data;
      const primaryEmail = email_addresses.find((e: any) => e.id === data.primary_email_address_id);

      if (!primaryEmail) {
        throw new Error('No primary email found for user');
      }

      await this.clerkService.syncUserWithHasura(
        id,
        primaryEmail.email_address,
        public_metadata,
      );

      this.logger.log(`User created and synced: ${id}`);
      return { status: 'success', type: 'user.created' };
    } catch (error) {
      this.logger.error(`Error handling user creation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleUserUpdated(data: any) {
    try {
      const { id, email_addresses, public_metadata } = data;
      const primaryEmail = email_addresses.find((e: any) => e.id === data.primary_email_address_id);

      if (!primaryEmail) {
        throw new Error('No primary email found for user');
      }

      await this.clerkService.syncUserWithHasura(
        id,
        primaryEmail.email_address,
        public_metadata,
      );

      this.logger.log(`User updated and synced: ${id}`);
      return { status: 'success', type: 'user.updated' };
    } catch (error) {
      this.logger.error(`Error handling user update: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleUserDeleted(data: any) {
    try {
      const { id } = data;
      
      const deleteUserMutation = `
        mutation DeleteUser($userId: String!) {
          delete_users(where: { id: { _eq: $userId } }) {
            affected_rows
          }
        }
      `;

      await this.hasuraService.executeQuery(deleteUserMutation, { userId: id });

      this.logger.log(`User deleted: ${id}`);
      return { status: 'success', type: 'user.deleted' };
    } catch (error) {
      this.logger.error(`Error handling user deletion: ${error.message}`, error.stack);
      throw error;
    }
  }
}