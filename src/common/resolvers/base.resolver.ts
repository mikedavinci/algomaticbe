import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class BaseResolver {
  @Query(() => String)
  healthCheck(): string {
    return 'OK';
  }
}
