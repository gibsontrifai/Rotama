import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExportReportDto } from './dto/export-report.dto';
import { UpdateFocusMetricsDto } from './dto/update-focus-metrics.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dataset')
  @ApiOkResponse({ description: 'Reports dataset.' })
  async dataset() {
    return this.reportsService.getDataset();
  }

  @Post('focus-metrics')
  @Roles('administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string', enum: ['TRIR', 'Near Miss', 'CAPA'] },
          example: ['TRIR', 'Near Miss', 'CAPA'],
        },
      },
      required: ['metrics'],
    },
  })
  @ApiOkResponse({ description: 'Updated focus metrics and latest dataset.' })
  async updateFocusMetrics(@Body() body: UpdateFocusMetricsDto) {
    return this.reportsService.updateFocusMetrics(body.metrics);
  }

  @Post('export')
  @Roles('administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['pdf', 'excel'], example: 'pdf' },
      },
      required: ['target'],
    },
  })
  @ApiOkResponse({ description: 'Report export process result.' })
  async export(@Body() body: ExportReportDto) {
    return this.reportsService.exportReport(body.target);
  }
}
