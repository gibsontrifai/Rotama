import { Module } from '@nestjs/common';
import { MailService } from '../common/mail/mail.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MailService],
})
export class UsersModule {}
