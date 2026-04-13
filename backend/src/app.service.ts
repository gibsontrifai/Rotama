import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHealth(includeDetails = false) {
    const dbConnected = await this.databaseService.checkConnection();

    const basePayload = {
      service: 'safetyhub-backend',
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };

    if (!includeDetails) {
      return basePayload;
    }

    return {
      ...basePayload,
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
    };
  }
}
