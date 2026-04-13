import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';

type UserProfileRow = {
  id: number;
  username: string;
  password_hash: string;
  role: 'technician' | 'supervisor' | 'administrator';
  full_name: string;
  position: string;
  branch_name: string | null;
  avatar_url: string | null;
};

@Injectable()
export class AuthService {
  private readonly tokenExpiryMs: number;
  private readonly loginRateWindowMs: number;
  private readonly maxLoginAttemptsPerWindow: number;
  private readonly lockoutWindowMs: number;
  private readonly maxFailedAttemptsBeforeLockout: number;
  private readonly lockoutDurationMs: number;
  private readonly loginAttemptsByKey = new Map<string, number[]>();
  private readonly failedLoginAttemptsByUser = new Map<string, number[]>();
  private readonly lockedUsers = new Map<string, number>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpiryMs = this.configService.get<number>('ACCESS_TOKEN_EXPIRES_IN_MS', 15 * 60 * 1000);
    this.loginRateWindowMs = this.configService.get<number>('LOGIN_RATE_WINDOW_MS', 60 * 1000);
    this.maxLoginAttemptsPerWindow = this.configService.get<number>('LOGIN_RATE_MAX_ATTEMPTS', 10);
    this.lockoutWindowMs = this.configService.get<number>('LOGIN_LOCKOUT_WINDOW_MS', 5 * 60 * 1000);
    this.maxFailedAttemptsBeforeLockout = this.configService.get<number>('LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS', 5);
    this.lockoutDurationMs = this.configService.get<number>('LOGIN_LOCKOUT_DURATION_MS', 15 * 60 * 1000);
  }

  async login(payload: LoginDto, clientIp = 'unknown') {
    const username = payload.username.trim().toLowerCase();
    this.assertNotLocked(username);
    this.assertWithinRateLimit(username, clientIp);

    const user = await this.findUserByUsername(username);

    const isValidPassword = user
      ? await this.verifyPassword(payload.password, user.password_hash)
      : false;

    if (!user || !isValidPassword) {
      const isLockedNow = this.registerFailedAttempt(username);
      if (isLockedNow) {
        throw new HttpException(
          'Akun dikunci sementara karena terlalu banyak percobaan login gagal.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Username atau password tidak valid');
    }

    this.clearFailedAttempts(username);

    if (!this.isBcryptHash(user.password_hash)) {
      await this.upgradePlaintextPassword(user.id, payload.password);
    }

    const expertiseRows = await this.databaseService.query<{ expertise_name: string }>(
      `SELECT expertise_name
       FROM safetyhub.user_expertise
       WHERE user_id = $1
       ORDER BY expertise_name`,
      [user.id],
    );

    const tokenData = await this.issueSessionToken(user.id);

    return {
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      position: user.position,
      branch: user.branch_name || 'Main Office',
      expertise: expertiseRows.rows.map((item) => item.expertise_name),
      avatar: user.avatar_url || undefined,
      ...tokenData,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponseDto> {
    const sessionQuery = await this.databaseService.query<{ id: string; user_id: number }>(
      `SELECT id, user_id
       FROM safetyhub.user_sessions
       WHERE refresh_token = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [refreshToken],
    );

    const activeSession = sessionQuery.rows[0];

    if (!activeSession) {
      throw new UnauthorizedException('Session habis. Silakan login ulang.');
    }

    const tokenData = this.buildTokenPair(activeSession.user_id);

    await this.databaseService.query(
      `UPDATE safetyhub.user_sessions
       SET access_token = $1,
           refresh_token = $2,
           expires_at = to_timestamp($3 / 1000.0),
           revoked_at = NULL
       WHERE id = $4`,
      [tokenData.accessToken, tokenData.refreshToken, tokenData.expiresAt, activeSession.id],
    );

    return tokenData;
  }

  private async findUserByUsername(username: string) {
    const result = await this.databaseService.query<UserProfileRow>(
      `SELECT
         u.id,
         u.username,
         u.password_hash,
         u.role,
         u.full_name,
         u.position,
         b.name AS branch_name,
         u.avatar_url
       FROM safetyhub.app_users u
       LEFT JOIN safetyhub.branches b ON b.id = u.branch_id
       WHERE u.username = $1
         AND u.is_active = TRUE
       LIMIT 1`,
      [username],
    );

    return result.rows[0] || null;
  }

  private async verifyPassword(plainPassword: string, storedHash: string) {
    if (this.isBcryptHash(storedHash)) {
      return compare(plainPassword, storedHash);
    }

    return storedHash === plainPassword;
  }

  private isBcryptHash(value: string) {
    return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
  }

  private async upgradePlaintextPassword(userId: number, plainPassword: string) {
    const hashedPassword = await hash(plainPassword, 10);

    await this.databaseService.query(
      `UPDATE safetyhub.app_users
       SET password_hash = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, hashedPassword],
    );
  }

  private assertWithinRateLimit(username: string, clientIp: string) {
    const key = `${username}:${clientIp}`;
    const now = Date.now();
    const attempts = this.pruneAttempts(this.loginAttemptsByKey.get(key) || [], now, this.loginRateWindowMs);

    if (attempts.length >= this.maxLoginAttemptsPerWindow) {
      throw new HttpException(
        'Terlalu banyak percobaan login. Coba lagi beberapa saat.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    attempts.push(now);
    this.loginAttemptsByKey.set(key, attempts);
  }

  private assertNotLocked(username: string) {
    const now = Date.now();
    const lockedUntil = this.lockedUsers.get(username);

    if (!lockedUntil) {
      return;
    }

    if (lockedUntil > now) {
      throw new HttpException(
        'Akun dikunci sementara karena terlalu banyak percobaan login gagal.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.lockedUsers.delete(username);
  }

  private registerFailedAttempt(username: string) {
    const now = Date.now();
    const attempts = this.pruneAttempts(
      this.failedLoginAttemptsByUser.get(username) || [],
      now,
      this.lockoutWindowMs,
    );

    attempts.push(now);
    this.failedLoginAttemptsByUser.set(username, attempts);

    if (attempts.length >= this.maxFailedAttemptsBeforeLockout) {
      this.lockedUsers.set(username, now + this.lockoutDurationMs);
      this.failedLoginAttemptsByUser.delete(username);
      return true;
    }

    return false;
  }

  private clearFailedAttempts(username: string) {
    this.failedLoginAttemptsByUser.delete(username);
    this.lockedUsers.delete(username);
  }

  private pruneAttempts(attempts: number[], now: number, windowMs: number) {
    return attempts.filter((ts) => now - ts < windowMs);
  }

  private async issueSessionToken(userId: number): Promise<RefreshTokenResponseDto> {
    const tokenData = this.buildTokenPair(userId);

    await this.databaseService.query(
      `INSERT INTO safetyhub.user_sessions (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))`,
      [userId, tokenData.accessToken, tokenData.refreshToken, tokenData.expiresAt],
    );

    return tokenData;
  }

  private buildTokenPair(userId: number): RefreshTokenResponseDto {
    const issuedAt = Date.now();
    const seed = `${userId}-${issuedAt}-${Math.random().toString(36).slice(2)}`;

    return {
      accessToken: `mock-access-${Buffer.from(seed).toString('base64url')}`,
      refreshToken: `mock-refresh-${Buffer.from(`${seed}-refresh`).toString('base64url')}`,
      expiresAt: issuedAt + this.tokenExpiryMs,
    };
  }
}
