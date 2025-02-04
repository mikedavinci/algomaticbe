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
  }

  async executeQuery<T = any>(query: string, variables?: any): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error: any) {
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
          type: 'track_table',
          args: {
            table: {
              schema: schemaName,
              name: tableName,
            },
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
        throw new Error(`Failed to track table: ${response.data}`);
      }

      console.log(`Successfully tracked table ${schemaName}.${tableName}`);
    } catch (error: any) {
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
        throw new Error(`Failed to create event trigger: ${response.data}`);
      }

      console.log(`Successfully created event trigger ${name} for table ${tableName}`);
    } catch (error: any) {
      console.error('Error creating event trigger:', error.response?.data || error.message);
      throw error;
    }
  }
}
