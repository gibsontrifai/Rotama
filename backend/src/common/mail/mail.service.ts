import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

type SendRegistrationEmailPayload = {
  recipientName: string;
  recipientEmail: string;
  username: string;
  role: 'technician' | 'supervisor' | 'administrator';
  branch: string;
  position: string;
  activationUrl: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendRegistrationConfirmation(payload: SendRegistrationEmailPayload) {
    const from = this.configService.get<string>('SMTP_FROM', '').trim();

    if (!this.isSmtpConfigured() || !from) {
      this.logger.log(
        `Email konfirmasi registrasi dilewati untuk ${payload.recipientEmail} karena SMTP belum dikonfigurasi.`,
      );
      this.logger.log(`Link aktivasi user ${payload.username}: ${payload.activationUrl}`);
      return { sent: false };
    }

    const loginUrl = this.configService.get<string>('APP_LOGIN_URL', 'http://localhost:5173/login');
    const appName = this.configService.get<string>('APP_NAME', 'SafetyHub');

    const subject = `[${appName}] Konfirmasi Aktivasi Akun`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Halo ${payload.recipientName},</h2>
        <p>Akun Anda sudah didaftarkan di sistem <strong>${appName}</strong>.</p>
        <ul>
          <li><strong>Username:</strong> ${payload.username}</li>
          <li><strong>Role:</strong> ${payload.role}</li>
          <li><strong>Cabang:</strong> ${payload.branch}</li>
          <li><strong>Posisi:</strong> ${payload.position}</li>
        </ul>
        <p>Konfirmasi dulu aktivasi akun Anda:</p>
        <p><a href="${payload.activationUrl}" style="display:inline-block;padding:10px 16px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;">Aktivasi Akun</a></p>
        <p>Setelah aktivasi berhasil, Anda dapat login di: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>Jika Anda merasa tidak didaftarkan, segera hubungi administrator.</p>
      </div>
    `;

    const text = [
      `Halo ${payload.recipientName},`,
      `Akun Anda sudah didaftarkan di sistem ${appName}.`,
      `Username: ${payload.username}`,
      `Role: ${payload.role}`,
      `Cabang: ${payload.branch}`,
      `Posisi: ${payload.position}`,
      `Aktivasi akun: ${payload.activationUrl}`,
      `Login: ${loginUrl}`,
      'Jika Anda merasa tidak didaftarkan, segera hubungi administrator.',
    ].join('\n');

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from,
        to: payload.recipientEmail,
        subject,
        text,
        html,
      });
      return { sent: true };
    } catch (error) {
      this.logger.error(
        `Gagal mengirim email konfirmasi registrasi ke ${payload.recipientEmail}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return { sent: false };
    }
  }

  private isSmtpConfigured() {
    const host = this.configService.get<string>('SMTP_HOST', '').trim();
    const port = this.configService.get<number>('SMTP_PORT', 0);
    return host.length > 0 && Number(port) > 0;
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST', '').trim();
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const secure = this.configService.get<string>('SMTP_SECURE', 'false').toLowerCase() === 'true';
    const user = this.configService.get<string>('SMTP_USER', '').trim();
    const pass = this.configService.get<string>('SMTP_PASS', '').trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }
}
