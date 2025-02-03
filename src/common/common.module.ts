import { Module } from '@nestjs/common';
import { BaseResolver } from './resolvers/base.resolver';

@Module({
  providers: [BaseResolver],
})
export class CommonModule {}
