import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient } from 'graphql-request';

@Injectable()
export class HasuraService implements OnModuleInit {
  // Annotate the client property with the proper type.
  private client!: GraphQLClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endpoint = this.configService.get<string>('HASURA_GRAPHQL_ENDPOINT');
    const adminSecret = this.configService.get<string>(
      'HASURA_GRAPHQL_ADMIN_SECRET',
    );

    if (!endpoint) {
      throw new Error(
        'HASURA_GRAPHQL_ENDPOINT is not defined in environment variables',
      );
    }

    if (!adminSecret) {
      throw new Error(
        'HASURA_GRAPHQL_ADMIN_SECRET is not defined in environment variables',
      );
    }

    // Now this.client is typed as GraphQLClient.
    this.client = new GraphQLClient(endpoint, {
      headers: {
        'x-hasura-admin-secret': adminSecret,
      },
    });
  }

  async executeQuery<T = any>(query: string, variables?: any): Promise<T> {
    try {
      // Since client is now typed as GraphQLClient, you can safely use the generic here.
      return await this.client.request<T>(query, variables);
    } catch (error: any) {
      throw new Error(`Hasura query failed: ${error.message}`);
    }
  }

  async trackTable(
    tableName: string,
    schemaName: string = 'public',
  ): Promise<void> {
    const trackTableMutation = `
      mutation TrackTable($tableName: String!, $schemaName: String!) {
        track_table(table: { name: $tableName, schema: $schemaName }) {
          ok
        }
      }
    `;
    await this.executeQuery(trackTableMutation, { tableName, schemaName });
  }

  async createEventTrigger(
    name: string,
    tableName: string,
    webhookUrl: string,
    operations: string[],
  ): Promise<void> {
    const createTriggerMutation = `
      mutation CreateEventTrigger(
        $name: String!
        $tableName: String!
        $webhookUrl: String!
        $operations: [String!]!
      ) {
        create_event_trigger(
          name: $name
          table: { name: $tableName, schema: "public" }
          webhook: $webhookUrl
          events: $operations
          replace: true
        ) {
          ok
        }
      }
    `;
    await this.executeQuery(createTriggerMutation, {
      name,
      tableName,
      webhookUrl,
      operations,
    });
  }
}
