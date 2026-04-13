import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { MailService } from '../common/mail/mail.service';
import { DatabaseService } from '../database/database.service';

const PROTECTED_SYSTEM_USERNAME = 'admin';

type UserRow = {
  id: number;
  username: string;
  full_name: string;
  role: 'technician' | 'supervisor' | 'administrator';
  branch_name: string;
  position: string;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  expertise_names: string[] | null;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async list(params?: { page?: number; size?: number }) {
    const page = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const size = Number.isFinite(params?.size) ? Math.min(100, Math.max(1, Number(params?.size))) : 50;
    const offset = (page - 1) * size;

    const result = await this.databaseService.query<UserRow>(
      `SELECT
         u.id,
         u.username,
         u.full_name,
         u.role,
         b.name AS branch_name,
         u.position,
         u.email,
         u.phone_number,
         u.is_active,
         ARRAY_REMOVE(ARRAY_AGG(ue.expertise_name ORDER BY ue.expertise_name), NULL) AS expertise_names
       FROM safetyhub.app_users u
       LEFT JOIN safetyhub.branches b ON b.id = u.branch_id
       LEFT JOIN safetyhub.user_expertise ue ON ue.user_id = u.id
       GROUP BY u.id, b.name
       ORDER BY u.full_name ASC
       LIMIT $1
       OFFSET $2`,
      [size, offset],
    );

    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      branch: row.branch_name,
      position: row.position,
      email: row.email || '',
      phone: row.phone_number || '',
      isActive: row.is_active,
      expertise: row.expertise_names || [],
    }));
  }

  async create(payload: {
    username: string;
    password: string;
    fullName: string;
    role: 'technician' | 'supervisor' | 'administrator';
    position: string;
    branch: string;
    email: string;
    phone: string;
  }) {
    const normalizedUsername = payload.username.trim().toLowerCase();
    const normalizedEmail = payload.email.trim().toLowerCase();

    const existingUser = await this.databaseService.query<{ id: number }>(
      `SELECT id
       FROM safetyhub.app_users
       WHERE username = $1
          OR email = $2
       LIMIT 1`,
      [normalizedUsername, normalizedEmail],
    );

    if (existingUser.rows[0]) {
      throw new ConflictException('Username atau email sudah digunakan.');
    }

    const branchResult = await this.databaseService.query<{ id: number }>(
      `SELECT b.id
       FROM safetyhub.branches b
       WHERE b.name = $1
       LIMIT 1`,
      [payload.branch.trim()],
    );

    const branchId = Number(branchResult.rows[0]?.id || 1);
    const passwordHash = await hash(payload.password, 10);

    const createdUser = await this.databaseService.query<UserRow>(
      `INSERT INTO safetyhub.app_users (
         username,
         password_hash,
         full_name,
         role,
         position,
         branch_id,
         email,
         phone_number,
         is_active
       )
       SELECT
         $1,
         $2,
         $3,
         $4::safetyhub.user_role,
         $5,
         $6,
         $7,
         $8,
         FALSE
       RETURNING
         id,
         username,
         full_name,
         role,
         (SELECT name FROM safetyhub.branches WHERE id = $6) AS branch_name,
         position,
         email,
         phone_number,
         is_active,
         ARRAY[]::text[] AS expertise_names`,
      [
        normalizedUsername,
        passwordHash,
        payload.fullName.trim(),
        payload.role,
        payload.position.trim(),
        branchId,
        normalizedEmail,
        payload.phone.trim(),
      ],
    );

    const mappedUser = this.mapUserRow(createdUser.rows[0]);
    const activationToken = this.generateActivationToken(mappedUser.id, mappedUser.email);
    const appBaseUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:5173').replace(/\/$/, '');
    const activationUrl = `${appBaseUrl}/activate?token=${encodeURIComponent(activationToken)}`;

    await this.mailService.sendRegistrationConfirmation({
      recipientName: mappedUser.fullName,
      recipientEmail: mappedUser.email,
      username: mappedUser.username,
      role: mappedUser.role,
      branch: mappedUser.branch,
      position: mappedUser.position,
      activationUrl,
    });

    return mappedUser;
  }

  async activateByToken(token: string) {
    const payload = this.verifyActivationToken(token);

    const activatedResult = await this.databaseService.query<UserRow>(
      `UPDATE safetyhub.app_users u
       SET is_active = TRUE,
           updated_at = NOW()
       FROM safetyhub.branches b
       WHERE u.id = $1
         AND u.email = $2
         AND u.is_active = FALSE
         AND b.id = u.branch_id
       RETURNING
         u.id,
         u.username,
         u.full_name,
         u.role,
         b.name AS branch_name,
         u.position,
         u.email,
         u.phone_number,
         u.is_active,
         ARRAY[]::text[] AS expertise_names`,
      [payload.userId, payload.email],
    );

    if (activatedResult.rows[0]) {
      return {
        message: 'Akun berhasil diaktivasi. Silakan login ke aplikasi.',
        user: this.mapUserRow(activatedResult.rows[0]),
      };
    }

    const existingResult = await this.databaseService.query<{ is_active: boolean }>(
      `SELECT is_active
       FROM safetyhub.app_users
       WHERE id = $1
         AND email = $2
       LIMIT 1`,
      [payload.userId, payload.email],
    );

    if (existingResult.rows[0]?.is_active) {
      return {
        message: 'Akun sudah aktif sebelumnya. Silakan login ke aplikasi.',
      };
    }

    throw new BadRequestException('Token aktivasi tidak valid.');
  }

  async updateStatus(username: string, isActive: boolean) {
    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername === PROTECTED_SYSTEM_USERNAME && !isActive) {
      throw new ConflictException('Akun admin utama tidak dapat dinonaktifkan.');
    }

    const result = await this.databaseService.query<UserRow>(
      `UPDATE safetyhub.app_users u
       SET is_active = $2,
           updated_at = NOW()
       FROM safetyhub.branches b
       WHERE u.username = $1
         AND b.id = u.branch_id
       RETURNING
         u.id,
         u.username,
         u.full_name,
         u.role,
         b.name AS branch_name,
         u.position,
         u.email,
         u.phone_number,
         u.is_active,
         ARRAY[]::text[] AS expertise_names`,
      [normalizedUsername, isActive],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    return this.mapUserRow(result.rows[0]);
  }

  async remove(username: string) {
    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername === PROTECTED_SYSTEM_USERNAME) {
      throw new ConflictException('Akun admin utama tidak dapat dihapus.');
    }

    const result = await this.databaseService.query<{ id: number }>(
      `DELETE FROM safetyhub.app_users
       WHERE username = $1
       RETURNING id`,
      [normalizedUsername],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    return { success: true };
  }

  async updateProfile(
    username: string,
    payload: { fullName: string; position: string; branch: string; expertise: string[]; avatar?: string },
  ) {
    const branchResult = await this.databaseService.query<{ id: number }>(
      `SELECT b.id
       FROM safetyhub.branches b
       WHERE b.name = $1
       LIMIT 1`,
      [payload.branch.trim()],
    );

    const branchId = Number(branchResult.rows[0]?.id || 1);

    const updateUserResult = await this.databaseService.query<{
      id: number;
      username: string;
      full_name: string;
      role: 'technician' | 'supervisor' | 'administrator';
      position: string;
      avatar_url: string | null;
      branch_name: string;
    }>(
      `UPDATE safetyhub.app_users u
       SET full_name = $2,
           position = $3,
           branch_id = $4,
           avatar_url = $5,
           updated_at = NOW()
       FROM safetyhub.branches b
       WHERE u.username = $1
         AND b.id = $4
       RETURNING
         u.id,
         u.username,
         u.full_name,
         u.role,
         u.position,
         u.avatar_url,
         b.name AS branch_name`,
      [
        username,
        payload.fullName.trim(),
        payload.position.trim(),
        branchId,
        payload.avatar || null,
      ],
    );

    if (!updateUserResult.rows[0]) {
      return null;
    }

    await this.databaseService.query(
      `DELETE FROM safetyhub.user_expertise
       WHERE user_id = $1`,
      [updateUserResult.rows[0].id],
    );

    const filteredExpertise = payload.expertise
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 20);

    if (filteredExpertise.length > 0) {
      const valuesSql = filteredExpertise.map((_, index) => `($1, $${index + 2})`).join(', ');
      await this.databaseService.query(
        `INSERT INTO safetyhub.user_expertise (user_id, expertise_name)
         VALUES ${valuesSql}`,
        [updateUserResult.rows[0].id, ...filteredExpertise],
      );
    }

    return {
      id: updateUserResult.rows[0].id,
      username: updateUserResult.rows[0].username,
      fullName: updateUserResult.rows[0].full_name,
      role: updateUserResult.rows[0].role,
      position: updateUserResult.rows[0].position,
      branch: updateUserResult.rows[0].branch_name,
      email: '',
      phone: '',
      isActive: true,
      expertise: filteredExpertise,
      avatar: updateUserResult.rows[0].avatar_url || undefined,
    };
  }

  private mapUserRow(row: UserRow) {
    return {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      branch: row.branch_name,
      position: row.position,
      email: row.email || '',
      phone: row.phone_number || '',
      isActive: row.is_active,
      expertise: row.expertise_names || [],
    };
  }

  private generateActivationToken(userId: number, email: string) {
    const expiresInHours = Number(this.configService.get<number>('USER_ACTIVATION_TOKEN_EXPIRES_IN_HOURS', 24));
    const exp = Math.floor(Date.now() / 1000) + Math.max(1, expiresInHours) * 60 * 60;
    const payload = Buffer.from(JSON.stringify({ userId, email, exp }), 'utf8').toString('base64url');
    const signature = this.signActivationPayload(payload);
    return `${payload}.${signature}`;
  }

  private verifyActivationToken(token: string) {
    const [payloadEncoded, signatureEncoded] = token.split('.');

    if (!payloadEncoded || !signatureEncoded) {
      throw new BadRequestException('Token aktivasi tidak valid.');
    }

    const expectedSignature = this.signActivationPayload(payloadEncoded);
    const signatureBuffer = Buffer.from(signatureEncoded, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new BadRequestException('Token aktivasi tidak valid.');
    }

    let payload: { userId?: number; email?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Token aktivasi tidak valid.');
    }

    if (!payload.userId || !payload.email || !payload.exp) {
      throw new BadRequestException('Token aktivasi tidak valid.');
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Token aktivasi sudah kedaluwarsa.');
    }

    return {
      userId: Number(payload.userId),
      email: String(payload.email),
    };
  }

  private signActivationPayload(payloadEncoded: string) {
    const secret = this.configService.get<string>(
      'USER_ACTIVATION_TOKEN_SECRET',
      'dev-activation-secret-change-me',
    );

    return createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
  }
}
