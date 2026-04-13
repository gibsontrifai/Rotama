import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type InspectionRow = {
  id: string;
  area: string;
  inspector: string;
  score: number;
  status: 'Open Action' | 'Closed';
};

type NextIdRow = {
  next_number: number;
};

@Injectable()
export class InspectionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(params?: { page?: number; size?: number }) {
    const page = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const size = Number.isFinite(params?.size) ? Math.min(100, Math.max(1, Number(params?.size))) : 50;
    const offset = (page - 1) * size;

    const result = await this.databaseService.query<InspectionRow>(
      `SELECT
         i.id,
         i.area,
         i.inspector_name AS inspector,
         i.score::int AS score,
         i.status
       FROM safetyhub.inspections i
       ORDER BY i.inspected_at DESC
       LIMIT $1
       OFFSET $2`,
      [size, offset],
    );

    return result.rows.map((item) => ({
      id: item.id,
      area: item.area,
      inspector: item.inspector,
      score: Number(item.score),
      status: item.status,
    }));
  }

  async create(payload: { area: string; inspector: string; score: number; checklistCategories?: string[] }) {
    const nextIdResult = await this.databaseService.query<NextIdRow>(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(i.id, '[^0-9]', '', 'g'), '')::int), 1400) + 1 AS next_number
       FROM safetyhub.inspections i`,
    );

    const nextNumber = Number(nextIdResult.rows[0]?.next_number || 1401);
    const inspectionId = `INSP-${String(nextNumber).padStart(4, '0')}`;
    const normalizedScore = Math.max(0, Math.min(100, payload.score));
    const computedStatus = normalizedScore >= 90 ? 'Closed' : 'Open Action';

    const insertResult = await this.databaseService.query<InspectionRow>(
      `INSERT INTO safetyhub.inspections (
         id,
         area,
         inspector_name,
         score,
         status,
         checklist_categories,
         inspected_at
       )
       VALUES ($1, $2, $3, $4, $5::inspection_status, $6, NOW())
       RETURNING
         id,
         area,
         inspector_name AS inspector,
         score::int AS score,
         status`,
      [
        inspectionId,
        payload.area.trim(),
        payload.inspector.trim(),
        normalizedScore,
        computedStatus,
        payload.checklistCategories && payload.checklistCategories.length > 0 ? payload.checklistCategories : [],
      ],
    );

    const created = insertResult.rows[0];

    return {
      id: created.id,
      area: created.area,
      inspector: created.inspector,
      score: Number(created.score),
      status: created.status,
    };
  }
}
