import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type IncidentRow = {
  id: string;
  title: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  area: string;
  status: 'Open' | 'Investigating' | 'Closed';
  pic: string;
  reported_at_label: string;
};

@Injectable()
export class IncidentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(params?: {
    status?: string;
    area?: string;
    q?: string;
    page?: number;
    size?: number;
  }) {
    const page = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const size = Number.isFinite(params?.size) ? Math.min(100, Math.max(1, Number(params?.size))) : 50;
    const offset = (page - 1) * size;

    const result = await this.databaseService.query<IncidentRow>(
      `SELECT
         i.id,
         i.title,
         i.severity,
         i.area,
         i.status,
         i.pic_name AS pic,
         to_char(i.reported_at, 'DD Mon, HH24:MI') AS reported_at_label
       FROM safetyhub.incidents i
       WHERE (NULLIF($1::text, '') IS NULL OR i.status::text = $1::text)
         AND (NULLIF($2::text, '') IS NULL OR i.area ILIKE '%' || $2 || '%')
         AND (NULLIF($3::text, '') IS NULL OR i.title ILIKE '%' || $3 || '%')
       ORDER BY i.reported_at DESC
       LIMIT $4
       OFFSET $5`,
      [params?.status || null, params?.area || null, params?.q || null, size, offset],
    );

    return result.rows.map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      area: item.area,
      status: item.status,
      pic: item.pic,
      reportedAt: item.reported_at_label,
    }));
  }
}
