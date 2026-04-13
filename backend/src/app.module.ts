import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccessTokenGuard } from './auth/guards/access-token.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IncidentsModule } from './incidents/incidents.module';
import { InspectionsModule } from './inspections/inspections.module';
import { ActionsModule } from './actions/actions.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    DashboardModule,
    IncidentsModule,
    InspectionsModule,
    ActionsModule,
    ReportsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
