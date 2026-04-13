import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';

@ApiTags('inspections')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

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
  @ApiOkResponse({ description: 'Inspection list.' })
  async list(@Query('page') page?: string, @Query('size') size?: string) {
    return this.inspectionsService.list({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Post()
  @Roles('administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        area: { type: 'string', example: '' },
        inspector: { type: 'string', example: '' },
        score: { type: 'number', example: 80 },
        checklistCategories: {
          type: 'array',
          items: { type: 'string' },
          example: ['Apar', 'Hidrant'],
        },
      },
      required: ['area', 'inspector', 'score'],
    },
  })
  @ApiCreatedResponse({ description: 'Inspection created.' })
  async create(@Body() body: CreateInspectionDto) {
    return this.inspectionsService.create({
      area: body.area,
      inspector: body.inspector,
      score: body.score,
      checklistCategories: body.checklistCategories,
    });
  }
}
