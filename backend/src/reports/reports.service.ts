import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type TrendPeriod = '30d' | '90d' | 'ytd';
type FocusMetric = 'TRIR' | 'Near Miss' | 'CAPA';

type AreaSafetyRow = {
  area: string;
  inspections: number;
  incidents: number;
  compliance: number;
  trir: number;
  near_miss: number;
  capa: number;
};

type TrendRow = {
  area: string;
  period: TrendPeriod;
  bucket_order: number;
  metric_value: number;
};

type FocusMetricRow = {
  metric: FocusMetric;
};

@Injectable()
export class ReportsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDataset(snapshotLabel = 'seed-2026-04') {
    const [areaResult, trendResult, focusMetricsResult] = await Promise.all([
      this.databaseService.query<AreaSafetyRow>(
        `SELECT
           r.area,
           r.inspections,
           r.incidents,
           r.compliance,
           r.trir,
           r.near_miss,
           r.capa
         FROM safetyhub.report_area_safety_snapshot r
         WHERE r.snapshot_label = $1
         ORDER BY r.area ASC`,
        [snapshotLabel],
      ),
      this.databaseService.query<TrendRow>(
        `SELECT
           t.area,
           t.period,
           t.bucket_order,
           t.metric_value
         FROM safetyhub.report_trends t
         ORDER BY t.area ASC, t.period ASC, t.bucket_order ASC`,
      ),
      this.databaseService.query<FocusMetricRow>(
        `SELECT f.metric
         FROM safetyhub.report_focus_metrics f
         ORDER BY
           CASE f.metric
             WHEN 'TRIR' THEN 1
             WHEN 'Near Miss' THEN 2
             ELSE 3
           END`,
      ),
    ]);

    const areaSafetyRows = areaResult.rows.map((row) => ({
      area: row.area,
      inspections: Number(row.inspections),
      incidents: Number(row.incidents),
      compliance: Number(row.compliance),
      trir: Number(row.trir),
      nearMiss: Number(row.near_miss),
      capa: Number(row.capa),
    }));

    const byAreaPeriod = trendResult.rows.reduce<Record<string, Record<TrendPeriod, number[]>>>(
      (acc, row) => {
        if (!acc[row.area]) {
          acc[row.area] = {
            '30d': [],
            '90d': [],
            ytd: [],
          };
        }

        acc[row.area][row.period].push(Number(row.metric_value));
        return acc;
      },
      {},
    );

    const allAreaAggregate = this.buildAllAreaTrend(byAreaPeriod);

    return {
      areaSafetyRows,
      trendByAreaAndPeriod: {
        'All Areas': allAreaAggregate,
        ...byAreaPeriod,
      },
      allFocusMetrics: focusMetricsResult.rows.map((row) => row.metric),
    };
  }

  async updateFocusMetrics(metrics: FocusMetric[]) {
    await this.databaseService.query('DELETE FROM safetyhub.report_focus_metrics');

    if (metrics.length > 0) {
      const valuesSql = metrics.map((_, index) => `($${index + 1}::focus_metric)`).join(', ');
      await this.databaseService.query(
        `INSERT INTO safetyhub.report_focus_metrics (metric)
         VALUES ${valuesSql}`,
        metrics,
      );
    }

    return this.getDataset();
  }

  async exportReport(target: 'pdf' | 'excel') {
    return {
      target,
      status: 'processed',
      generatedAt: new Date().toISOString(),
    };
  }

  private buildAllAreaTrend(data: Record<string, Record<TrendPeriod, number[]>>) {
    const periods: TrendPeriod[] = ['30d', '90d', 'ytd'];
    const output: Record<TrendPeriod, number[]> = {
      '30d': [],
      '90d': [],
      ytd: [],
    };

    for (const period of periods) {
      const matrix = Object.values(data).map((row) => row[period] || []);
      const maxLength = matrix.reduce((max, row) => Math.max(max, row.length), 0);

      output[period] = Array.from({ length: maxLength }, (_, index) =>
        matrix.reduce((sum, row) => sum + Number(row[index] || 0), 0),
      );
    }

    return output;
  }
}
