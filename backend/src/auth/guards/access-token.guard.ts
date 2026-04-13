import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type SessionUserRow = {
  session_id: string;
  user_id: number;
  username: string;
  role: 'technician' | 'supervisor' | 'administrator';
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const authHeader = request.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer token diperlukan');
    }

    const sessionResult = await this.databaseService.query<SessionUserRow>(
      `SELECT
         s.id AS session_id,
         s.user_id,
         u.username,
         u.role
       FROM safetyhub.user_sessions s
       JOIN safetyhub.app_users u ON u.id = s.user_id
       WHERE s.access_token = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.is_active = TRUE
       LIMIT 1`,
      [token],
    );

    const activeSession = sessionResult.rows[0];
    if (!activeSession) {
      throw new UnauthorizedException('Access token tidak valid atau sudah expired');
    }

    request.user = {
      sessionId: activeSession.session_id,
      userId: activeSession.user_id,
      username: activeSession.username,
      role: activeSession.role,
    };

    return true;
  }
}
