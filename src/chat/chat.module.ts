import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StorageModule } from '../storage/storage.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatPubSubService } from './chat-pubsub.service';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  imports: [JwtModule.register({}), StorageModule],
  controllers: [ChatController],
  providers: [ChatRepository, ChatService, ChatPubSubService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
