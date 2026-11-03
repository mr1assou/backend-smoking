import { Module } from '@nestjs/common';
import { PostsCacheRepository } from './posts-cache.repository';

@Module({
  providers: [PostsCacheRepository],
  exports: [PostsCacheRepository],
})
export class PostsCacheModule {}
