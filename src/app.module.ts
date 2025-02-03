import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

// Hasura Integration
import { HasuraModule } from './hasura/hasura.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queues/queue.module';
import { QueueDashboardModule } from './queues/dashboard/queue-dashboard.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { clerkMiddleware } from '@clerk/express';
import { ClerkClientProvider } from './providers/clerk-client.provider';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      subscriptions: {
        'graphql-ws': true,
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize:
          configService.get('NODE_ENV') !== 'production' ? true : true,
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? {
                rejectUnauthorized: true,
                ca: configService.get('CA_CERT_PATH'),
              }
            : {
                rejectUnauthorized: false,
                ca: configService.get('CA_CERT_PATH'),
              },
      }),
      inject: [ConfigService],
    }),

    // Redis and Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Hasura Integration
    HasuraModule,

    // Feature modules
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    PaymentsModule,
    WebhooksModule,
    QueueModule,
    QueueDashboardModule,
    RedisModule,
    EmailModule,
    CommonModule,
  ],
  providers: [
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
