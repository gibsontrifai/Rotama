import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiQuery({
    name: 'details',
    required: false,
    description: 'Set true or 1 to include diagnostics fields in response.',
    schema: {
      type: 'string',
      enum: ['true', '1'],
    },
  })
  @ApiOkResponse({
    description: 'Service health response.',
  })
  @Public()
  async getHealth(@Query('details') details?: string) {
    const includeDetails = details === '1' || details === 'true';
    return this.appService.getHealth(includeDetails);
  }
}
