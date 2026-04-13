import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1). Default: 1.',
    schema: { type: 'integer', minimum: 1, example: 1 },
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Page size. Default: 50. Allowed: 1-100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
  })
  @ApiOkResponse({ description: 'Notification list.' })
  async list(@Query('page') page?: string, @Query('size') size?: string) {
    return this.notificationsService.list({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Patch(':notificationId/read')
  @ApiOkResponse({ description: 'Mark notification as read and return latest list.' })
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }
}
