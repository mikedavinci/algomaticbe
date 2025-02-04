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

  private async addDatabaseSource(): Promise<void> {
    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not defined in environment variables');
      }

      // Parse database URL to get components
      const dbUrlMatch = databaseUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
      if (!dbUrlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, username, password, host, port, database] = dbUrlMatch;

      const response = await axios.post(
        this.metadataEndpoint,
        {
          type: 'pg_add_source',
          args: {
            name: 'default',
            configuration: {
              connection_info: {
                database_url: {
                  from_env: 'DATABASE_URL'
                },
                pool_settings: {
                  max_connections: 50,
                  idle_timeout: 180,
                  retries: 1,
                  connection_lifetime: 600
                },
                use_prepared_statements: true,
                isolation_level: "read-committed"
              }
            },
            replace_configuration: true
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': this.adminSecret,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to add database source: ${JSON.stringify(response.data)}`);
      }

      console.log('Successfully added database source');
    } catch (error: any) {
      if (error.response?.data?.code === 'already-exists') {
        console.log('Database source already exists');
        return;
      }
      console.error('Error adding database source:', error.response?.data || error.message);
      throw error;
    }
  }

  async trackTable(
    tableName: string,
    schemaName: string = 'public',
  ): Promise<void> {
    try {
      // First ensure the database source exists
      await this.addDatabaseSource();

      const response = await axios.post(
        this.metadataEndpoint,
        {
          type: 'pg_track_table',
          args: {
            source: 'default',
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
            source: 'default',
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
      console.error('Error creating event trigger:', error.response?.data || error.message);
      throw error;
    }
  }
}
