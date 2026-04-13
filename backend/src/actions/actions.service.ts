import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type ActionStatus = 'Open' | 'In Progress' | 'Blocked' | 'Done';
type ActionPriority = 'Critical' | 'High' | 'Medium';
type ActionSource = 'Incident' | 'Inspection' | 'Audit';
type AttachmentKind = 'Photo' | 'Document';

type ActionRow = {
  id: string;
  title: string;
  area: string;
  source: ActionSource;
  source_ref: string;
  priority: ActionPriority;
  status: ActionStatus;
  owner_name: string;
  due_date_label: string;
  progress: number;
};

type ActionUpdateRow = {
  action_id: string;
  title: string;
  detail: string;
  time_label: string;
};

type AttachmentRow = {
  action_id: string;
  id: string;
  name: string;
  kind: AttachmentKind;
  uploaded_at_label: string;
  mime_type: string | null;
  size_label: string | null;
  preview_url: string | null;
};

type NextNumberRow = {
  next_number: number;
};

@Injectable()
export class ActionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(params?: { page?: number; size?: number }) {
    const page = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const size = Number.isFinite(params?.size) ? Math.min(100, Math.max(1, Number(params?.size))) : 50;
    const offset = (page - 1) * size;

    const [actionsResult, updatesResult, attachmentsResult] = await Promise.all([
      this.databaseService.query<ActionRow>(
        `SELECT
           a.id,
           a.title,
           a.area,
           a.source,
           a.source_ref,
           a.priority,
           a.status,
           a.owner_name,
           to_char(a.due_at, 'DD Mon, HH24:MI') AS due_date_label,
           a.progress
         FROM safetyhub.action_items a
          ORDER BY a.created_at DESC
          LIMIT $1
          OFFSET $2`,
          [size, offset],
      ),
      this.databaseService.query<ActionUpdateRow>(
        `SELECT
           u.action_id,
           u.title,
           u.detail,
           to_char(u.happened_at, 'DD Mon, HH24:MI') AS time_label
         FROM safetyhub.action_updates u
         ORDER BY u.happened_at DESC`,
      ),
      this.databaseService.query<AttachmentRow>(
        `SELECT
           at.action_id,
           at.id,
           at.name,
           at.kind,
           to_char(at.uploaded_at, 'DD Mon, HH24:MI') AS uploaded_at_label,
           at.mime_type,
           at.size_label,
           at.preview_url
         FROM safetyhub.action_attachments at
         ORDER BY at.uploaded_at DESC`,
      ),
    ]);

    const updatesByAction = updatesResult.rows.reduce<Record<string, Array<{ title: string; detail: string; time: string }>>>(
      (acc, row) => {
        if (!acc[row.action_id]) {
          acc[row.action_id] = [];
        }
        acc[row.action_id].push({
          title: row.title,
          detail: row.detail,
          time: row.time_label,
        });
        return acc;
      },
      {},
    );

    const attachmentsByAction = attachmentsResult.rows.reduce<
      Record<
        string,
        Array<{
          id: string;
          name: string;
          kind: AttachmentKind;
          uploadedAt: string;
          mimeType?: string;
          sizeLabel?: string;
          previewUrl?: string;
        }>
      >
    >((acc, row) => {
      if (!acc[row.action_id]) {
        acc[row.action_id] = [];
      }
      acc[row.action_id].push({
        id: row.id,
        name: row.name,
        kind: row.kind,
        uploadedAt: row.uploaded_at_label,
        mimeType: row.mime_type || undefined,
        sizeLabel: row.size_label || undefined,
        previewUrl: row.preview_url || undefined,
      });
      return acc;
    }, {});

    return actionsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      area: row.area,
      source: row.source,
      sourceRef: row.source_ref,
      priority: row.priority,
      status: row.status,
      owner: row.owner_name,
      dueDate: row.due_date_label,
      progress: Number(row.progress),
      updates: updatesByAction[row.id] || [],
      attachments: attachmentsByAction[row.id] || [],
    }));
  }

  async create(payload: {
    title: string;
    area: string;
    source: ActionSource;
    sourceRef: string;
    priority: ActionPriority;
    owner: string;
    dueDate: string;
  }) {
    const nextIdResult = await this.databaseService.query<NextNumberRow>(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(a.id, '[^0-9]', '', 'g'), '')::int), 3200) + 1 AS next_number
       FROM safetyhub.action_items a`,
    );

    const nextNumber = Number(nextIdResult.rows[0]?.next_number || 3201);
    const actionId = `ACT-${nextNumber}`;

    await this.databaseService.query(
      `INSERT INTO safetyhub.action_items (
         id,
         title,
         area,
         source,
         source_ref,
         priority,
         status,
         owner_name,
         due_at,
         progress
      ) VALUES ($1, $2, $3, $4::safetyhub.action_source, $5, $6::safetyhub.action_priority, 'Open', $7, $8, 0)`,
      [
        actionId,
        payload.title.trim(),
        payload.area.trim(),
        payload.source,
        payload.sourceRef.trim(),
        payload.priority,
        payload.owner.trim(),
        this.parseActionDate(payload.dueDate),
      ],
    );

    await this.databaseService.query(
      `INSERT INTO safetyhub.action_updates (
         action_id,
         title,
         detail,
         happened_at
       ) VALUES ($1, 'Action created', $2, NOW())`,
      [actionId, `${payload.source} ${payload.sourceRef} membuat CAPA baru untuk area ${payload.area}.`],
    );

    return this.getById(actionId);
  }

  async updateOwner(actionId: string, owner: string) {
    await this.databaseService.query(
      `UPDATE safetyhub.action_items
       SET owner_name = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [actionId, owner.trim()],
    );

    return this.getById(actionId);
  }

  async updateStatus(actionId: string, status: ActionStatus) {
    await this.databaseService.query(
      `UPDATE safetyhub.action_items
       SET status = $2::safetyhub.action_status,
           progress = CASE
             WHEN $2::safetyhub.action_status = 'Done' THEN 100
             ELSE progress
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [actionId, status],
    );

    return this.getById(actionId);
  }

  async updateProgress(actionId: string, payload: { progress: number; status: ActionStatus; note: string }) {
    const normalizedProgress = Math.max(0, Math.min(100, payload.progress));

    await this.databaseService.query(
      `UPDATE safetyhub.action_items
       SET progress = $2,
             status = $3::safetyhub.action_status,
           updated_at = NOW()
       WHERE id = $1`,
      [actionId, normalizedProgress, payload.status],
    );

    await this.databaseService.query(
      `INSERT INTO safetyhub.action_updates (
         action_id,
         title,
         detail,
         happened_at
       ) VALUES (
         $1,
         'Progress updated',
         $2,
         NOW()
       )`,
      [
        actionId,
        payload.note.trim().length > 0
          ? payload.note.trim()
          : `Progress diperbarui ke ${normalizedProgress}% dengan status ${payload.status}.`,
      ],
    );

    return this.getById(actionId);
  }

  async addAttachment(
    actionId: string,
    payload: {
      name: string;
      kind: AttachmentKind;
      mimeType?: string;
      sizeLabel?: string;
      previewUrl?: string;
    },
  ) {
    const nextAttachmentIdResult = await this.databaseService.query<NextNumberRow>(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(at.id, '[^0-9]', '', 'g'), '')::int), 9000) + 1 AS next_number
       FROM safetyhub.action_attachments at`,
    );

    const nextNumber = Number(nextAttachmentIdResult.rows[0]?.next_number || 9001);
    const attachmentId = `ATT-${nextNumber}`;

    await this.databaseService.query(
      `INSERT INTO safetyhub.action_attachments (
         id,
         action_id,
         name,
         kind,
         uploaded_at,
         mime_type,
         size_label,
         preview_url
      ) VALUES ($1, $2, $3, $4::safetyhub.attachment_kind, NOW(), $5, $6, $7)`,
      [
        attachmentId,
        actionId,
        payload.name.trim(),
        payload.kind,
        payload.mimeType || null,
        payload.sizeLabel || null,
        payload.previewUrl || null,
      ],
    );

    return this.getById(actionId);
  }

  async removeAttachment(actionId: string, attachmentId: string) {
    await this.databaseService.query(
      `DELETE FROM safetyhub.action_attachments
       WHERE id = $1
         AND action_id = $2`,
      [attachmentId, actionId],
    );

    return this.getById(actionId);
  }

  async getById(actionId: string) {
    const actions = await this.list();
    return actions.find((item) => item.id === actionId) || null;
  }

  private parseActionDate(label: string) {
    const match = label.trim().match(/^(\d{1,2})\s([A-Za-z]{3}),\s(\d{2}):(\d{2})$/);

    if (!match) {
      return new Date();
    }

    const [, dayValue, monthLabel, hourValue, minuteValue] = match;
    const monthMap: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const month = monthMap[monthLabel];
    if (month === undefined) {
      return new Date();
    }

    return new Date(new Date().getFullYear(), month, Number(dayValue), Number(hourValue), Number(minuteValue));
  }
}
