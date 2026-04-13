import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiQuery({
    name: 'snapshotLabel',
    required: false,
    description: 'Snapshot label for dashboard shift and report slices.',
    example: 'seed-2026-04',
  })
  @ApiQuery({
    name: 'spotlightLimit',
    required: false,
    description: 'Max number of CAPA spotlight items.',
    example: 4,
  })
  @ApiOkResponse({
    description: 'Dashboard summary payload.',
  })
  async getSummary(
    @Query('snapshotLabel') snapshotLabel?: string,
    @Query('spotlightLimit') spotlightLimit?: string,
  ) {
    const parsedLimit = Number(spotlightLimit || 4);
    const normalizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 4;

    return this.dashboardService.getSummary(snapshotLabel || 'seed-2026-04', normalizedLimit);
  }
}
