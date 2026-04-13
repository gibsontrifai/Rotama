import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'area', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search by incident title.' })
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
  @ApiOkResponse({ description: 'Incident list.' })
  async list(
    @Query('status') status?: string,
    @Query('area') area?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.incidentsService.list({
      status,
      area,
      q,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }
}
