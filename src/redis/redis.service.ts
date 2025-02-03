import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client!: RedisClientType;
  private isConnected: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private async initializeClient() {
    this.client = (createClient as any)({
      username: 'default',
      password: this.configService.get<string>('REDIS_PASSWORD'),
      socket: {
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      },
    });

    this.client.on('error', (err: Error) =>
      console.error('Redis Client Error', err)
    );
    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });
    this.client.on('disconnect', () => {
      console.log('Redis client disconnected');
      this.isConnected = false;
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }

    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    const result = await this.client.exists(key);
    return result === 1;
  }
}
