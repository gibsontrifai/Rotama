import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type SpotlightRow = {
  id: string;
  title: string;
  area: string;
  priority: 'Critical' | 'High' | 'Medium';
  status: 'Open' | 'In Progress' | 'Blocked' | 'Done';
  owner_name: string;
  due_date_label: string;
  progress: number;
  source: 'Incident' | 'Inspection' | 'Audit';
  source_ref: string;
};

type SourceMixRow = {
  source: 'Incident' | 'Inspection' | 'Audit';
  total_count: number;
  active_count: number;
  overdue_count: number;
  average_progress: number;
};

type ShiftRow = {
  shift: 'Shift A' | 'Shift B' | 'Shift C';
  area: string;
  checklist_completion: number;
  incident_count: number;
};

type UpcomingInspectionRow = {
  schedule_code: string;
  area: string;
  pic_name: string;
  time_label: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
};

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getSummary(snapshotLabel = 'seed-2026-04', spotlightLimit = 4) {
    const [kpiResult, agingResult, spotlightResult, sourceMixResult, shiftResult, upcomingResult] =
      await Promise.all([
        this.databaseService.query<{
          open_findings: number;
          critical_risk: number;
          inspections_this_week: number;
          near_miss_reports: number;
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE a.status <> 'Done') AS open_findings,
             COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.priority = 'Critical') AS critical_risk,
             COUNT(*) FILTER (WHERE a.source = 'Inspection') AS inspections_this_week,
             COUNT(*) FILTER (WHERE a.source = 'Incident') AS near_miss_reports
           FROM safetyhub.action_items a`,
        ),
        this.databaseService.query<{
          overdue_count: number;
          due_today_count: number;
          due_soon_count: number;
          blocked_count: number;
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date < CURRENT_DATE) AS overdue_count,
             COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date = CURRENT_DATE) AS due_today_count,
             COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 2) AS due_soon_count,
             COUNT(*) FILTER (WHERE a.status = 'Blocked') AS blocked_count
           FROM safetyhub.action_items a`,
        ),
        this.databaseService.query<SpotlightRow>(
          `SELECT
             a.id,
             a.title,
             a.area,
             a.priority,
             a.status,
             a.owner_name,
             to_char(a.due_at, 'DD Mon, HH24:MI') AS due_date_label,
             a.progress,
             a.source,
             a.source_ref
           FROM safetyhub.action_items a
           WHERE a.status <> 'Done'
           ORDER BY
             CASE a.priority
               WHEN 'Critical' THEN 1
               WHEN 'High' THEN 2
               ELSE 3
             END,
             a.due_at ASC
           LIMIT $1`,
          [spotlightLimit],
        ),
        this.databaseService.query<SourceMixRow>(
          `SELECT
             a.source,
             COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE a.status <> 'Done') AS active_count,
             COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date < CURRENT_DATE) AS overdue_count,
             COALESCE(ROUND(AVG(a.progress)), 0)::int AS average_progress
           FROM safetyhub.action_items a
           GROUP BY a.source
           ORDER BY
             CASE a.source
               WHEN 'Incident' THEN 1
               WHEN 'Inspection' THEN 2
               ELSE 3
             END`,
        ),
        this.databaseService.query<ShiftRow>(
          `SELECT
             d.shift,
             d.area,
             d.checklist_completion,
             d.incident_count
           FROM safetyhub.dashboard_shift_performance d
           WHERE d.snapshot_label = $1
           ORDER BY d.shift`,
          [snapshotLabel],
        ),
        this.databaseService.query<UpcomingInspectionRow>(
          `SELECT
             s.schedule_code,
             s.area,
             s.pic_name,
             to_char(s.scheduled_at, 'HH24:MI') AS time_label,
             s.status
           FROM safetyhub.inspection_schedules s
           WHERE s.scheduled_at BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
           ORDER BY s.scheduled_at`,
        ),
      ]);

    return {
      kpis: {
        openFindings: Number(kpiResult.rows[0]?.open_findings || 0),
        criticalRisk: Number(kpiResult.rows[0]?.critical_risk || 0),
        inspectionsThisWeek: Number(kpiResult.rows[0]?.inspections_this_week || 0),
        nearMissReports: Number(kpiResult.rows[0]?.near_miss_reports || 0),
      },
      capaSummary: {
        overdueCount: Number(agingResult.rows[0]?.overdue_count || 0),
        dueTodayCount: Number(agingResult.rows[0]?.due_today_count || 0),
        dueSoonCount: Number(agingResult.rows[0]?.due_soon_count || 0),
        blockedCount: Number(agingResult.rows[0]?.blocked_count || 0),
        spotlightItems: spotlightResult.rows.map((item) => ({
          id: item.id,
          title: item.title,
          area: item.area,
          priority: item.priority,
          status: item.status,
          owner: item.owner_name,
          dueDate: item.due_date_label,
          progress: item.progress,
          source: item.source,
          sourceRef: item.source_ref,
        })),
      },
      sourceMix: sourceMixResult.rows.map((item) => ({
        source: item.source,
        total: Number(item.total_count),
        active: Number(item.active_count),
        overdue: Number(item.overdue_count),
        averageProgress: Number(item.average_progress),
      })),
      shiftPerformance: shiftResult.rows.map((item) => ({
        shift: item.shift,
        area: item.area,
        completion: Number(item.checklist_completion),
        incidents: item.incident_count,
      })),
      upcomingInspections: upcomingResult.rows.map((item) => ({
        code: item.schedule_code,
        time: item.time_label,
        area: item.area,
        pic: item.pic_name,
        status: item.status,
      })),
    };
  }
}
