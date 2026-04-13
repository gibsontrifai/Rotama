import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type NotificationRow = {
  id: string;
  source: 'Cabang' | 'Pusat';
  sender: string;
  message: string;
  display_time_label: string | null;
  unread: boolean;
  created_at_label: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(params?: { page?: number; size?: number }) {
    const page = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const size = Number.isFinite(params?.size) ? Math.min(100, Math.max(1, Number(params?.size))) : 50;
    const offset = (page - 1) * size;

    const result = await this.databaseService.query<NotificationRow>(
      `SELECT
         n.id,
         n.source,
         n.sender,
         n.message,
         n.display_time_label,
         n.unread,
         to_char(n.created_at, 'DD Mon, HH24:MI') AS created_at_label
       FROM safetyhub.notifications n
       ORDER BY n.created_at DESC
       LIMIT $1
       OFFSET $2`,
      [size, offset],
    );

    return result.rows.map((row) => ({
      id: row.id,
      source: row.source,
      sender: row.sender,
      message: row.message,
      timeLabel: row.display_time_label || row.created_at_label,
      unread: row.unread,
    }));
  }

  async markAsRead(notificationId: string) {
    await this.databaseService.query(
      `UPDATE safetyhub.notifications
       SET unread = FALSE
       WHERE id = $1`,
      [notificationId],
    );

    return this.list();
  }
}
