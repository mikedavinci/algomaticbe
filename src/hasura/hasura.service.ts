import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient } from 'graphql-request';
import axios from 'axios';

@Injectable()
export class HasuraService implements OnModuleInit {
  private client!: GraphQLClient;
  private metadataEndpoint!: string;
  private adminSecret!: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endpoint = this.configService.get<string>('HASURA_GRAPHQL_ENDPOINT');
    this.adminSecret = this.configService.get<string>('HASURA_GRAPHQL_ADMIN_SECRET') || '';

    if (!endpoint) {
      throw new Error('HASURA_GRAPHQL_ENDPOINT is not defined in environment variables');
    }

    if (!this.adminSecret) {
      throw new Error('HASURA_GRAPHQL_ADMIN_SECRET is not defined in environment variables');
    }

    // Set up GraphQL client
    this.client = new GraphQLClient(endpoint, {
      headers: {
        'x-hasura-admin-secret': this.adminSecret,
      },
    });

    // Set up metadata endpoint
    this.metadataEndpoint = endpoint.replace('/v1/graphql', '/v1/metadata');

    // Register Hasura actions
    await this.registerCreateUserAction();
  }

  async executeQuery<T = any>(query: string, variables?: any): Promise<T> {
    try {
      console.log('Executing Hasura query:', {
        query: query.substring(0, 100) + '...',
        variables,
      });
      const result = await this.client.request<T>(query, variables);
      console.log('Hasura query result:', result);
      return result;
    } catch (error: any) {
      console.error('Hasura query failed:', {
        error: error.message,
        response: error.response?.errors,
        variables,
      });
      throw new Error(`Hasura query failed: ${error.message}`);
    }
  }

  async trackTable(
    tableName: string,
    schemaName: string = 'public',
  ): Promise<void> {
    try {
      const response = await axios.post(
        this.metadataEndpoint,
        {
          type: 'pg_track_table',
          args: {
            source: 'algomatic',
            schema: schemaName,
            name: tableName
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      if (response.status !== 200) {
        throw new Error(`Failed to track table: ${JSON.stringify(response.data)}`);
      }

      console.log(`Successfully tracked table ${schemaName}.${tableName}`);
    } catch (error: any) {
      if (error.response?.data?.code === 'already-tracked') {
        console.log(`Table ${schemaName}.${tableName} is already tracked`);
        return;
      }
      console.error('Error tracking table:', error.response?.data || error.message);
      throw error;
    }
  }

  async createEventTrigger(
    name: string,
    tableName: string,
    webhookUrl: string,
    operations: string[],
  ): Promise<void> {
    try {
      const response = await axios.post(
        this.metadataEndpoint,
        {
          type: 'create_event_trigger',
          args: {
            name,
            source: 'algomatic',
            table: {
              schema: 'public',
              name: tableName,
            },
            webhook: webhookUrl,
            insert: operations.includes('insert'),
            update: operations.includes('update'),
            delete: operations.includes('delete'),
            enable_manual: false,
            replace: true,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      if (response.status !== 200) {
        throw new Error(`Failed to create event trigger: ${JSON.stringify(response.data)}`);
      }

      console.log(`Successfully created event trigger ${name} for table ${tableName}`);
    } catch (error: any) {
      // If source doesn't exist, log it but don't throw error since tables are tracked correctly
      if (error.response?.data?.error?.includes('source with name "default" does not exist')) {
        console.log('Warning: Source "default" not found for event trigger. This is expected if you are not using event triggers.');
        return;
      }
      console.error('Error creating event trigger:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteExistingAction(actionName: string): Promise<void> {
    try {
      const dropActionDefinition = {
        type: 'drop_action',
        args: {
          name: actionName,
          clear_data: true
        }
      };

      await axios.post(
        this.metadataEndpoint,
        dropActionDefinition,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      console.log(`Successfully deleted action: ${actionName}`);
    } catch (error) {
      // Ignore if action doesn't exist
      if (error.response?.data?.error?.includes('action does not exist')) {
        console.log(`Action ${actionName} does not exist, skipping deletion`);
        return;
      }
      throw error;
    }
  }

  async clearCustomTypes(): Promise<void> {
    try {
      const clearTypesDefinition = {
        type: 'set_custom_types',
        args: {
          scalars: [],
          objects: [],
          input_objects: [],
          enums: []
        }
      };

      await axios.post(
        this.metadataEndpoint,
        clearTypesDefinition,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      console.log('Successfully cleared custom types');
    } catch (error) {
      console.error('Failed to clear custom types:', error);
      throw error;
    }
  }

  async registerUserCustomType(): Promise<void> {
    try {
      // First clear existing types
      await this.clearCustomTypes();

      const customTypeDefinition = {
        type: 'set_custom_types',
        args: {
          scalars: [],
          objects: [
            {
              name: 'User',
              fields: [
                { name: 'id', type: 'String!' },
                { name: 'email', type: 'String!' },
                { name: 'stripe_customer_id', type: 'String' },
                { name: 'metadata', type: 'jsonb' },
                { name: 'clerk_image_url', type: 'String' },
                { name: 'email_verified', type: 'Boolean' },
                { name: 'created_at', type: 'String!' },
                { name: 'updated_at', type: 'String!' },
              ],
            },
          ],
        },
      };

      await axios.post(
        this.metadataEndpoint,
        customTypeDefinition,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      console.log('Successfully registered User custom type');
    } catch (error) {
      console.error('Failed to register User custom type:', error);
      throw error;
    }
  }

  async registerCreateUserAction(): Promise<void> {
    try {
      // First delete existing action if it exists
      await this.deleteExistingAction('create_user');

      // Then register the custom type
      await this.registerUserCustomType();

      const actionDefinition = {
        type: 'create_action',
        args: {
          name: 'create_user',
          definition: {
            kind: 'synchronous',
            type: 'mutation',
            arguments: [
              { name: 'id', type: 'String!' },
              { name: 'email', type: 'String!' },
              { name: 'emailVerified', type: 'Boolean' },
              { name: 'clerkImageUrl', type: 'String' },
              { name: 'metadata', type: 'jsonb' },
            ],
            output_type: 'User',
            handler:
              'https://api.algomatictrader.com/hasura/actions/create-user',
            forward_client_headers: true,
          },
        },
      };

      await axios.post(
        this.metadataEndpoint,
        actionDefinition,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        },
      );

      console.log('Successfully registered create_user action');
    } catch (error) {
      console.error('Failed to register create_user action:', error);
      throw error;
    }
  }
}
