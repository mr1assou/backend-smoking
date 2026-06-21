import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { RelaxSoundsController } from './relax-sounds.controller';
import { RelaxSoundsRepository } from './relax-sounds.repository';
import { RelaxSoundsService } from './relax-sounds.service';

@Module({
  imports: [StorageModule],
  controllers: [RelaxSoundsController],
  providers: [RelaxSoundsRepository, RelaxSoundsService],
  exports: [RelaxSoundsService],
})
export class RelaxSoundsModule {}
