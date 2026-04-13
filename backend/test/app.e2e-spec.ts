import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ApiExceptionFilter } from './../src/common/filters/api-exception.filter';
import { DatabaseService } from './../src/database/database.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let mockDatabaseService: {
    checkConnection: jest.Mock;
    query: jest.Mock;
  };

  const seedUsers = [
    {
      id: 1,
      username: 'admin',
      password_hash: '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
      role: 'administrator',
      full_name: 'Budi Santoso',
      position: 'Safety Manager',
      branch_name: 'Head Office - Jakarta',
      avatar_url: null,
    },
    {
      id: 2,
      username: 'supervisor',
      password_hash: '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
      role: 'supervisor',
      full_name: 'Siti Nurhaliza',
      position: 'Health & Safety Supervisor',
      branch_name: 'Bandung Plant',
      avatar_url: null,
    },
    {
      id: 3,
      username: 'teknisi',
      password_hash: '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
      role: 'technician',
      full_name: 'Ahmad Hidayat',
      position: 'Teknisi K3',
      branch_name: 'Surabaya Plant',
      avatar_url: null,
    },
  ];

  const seedActions = [
    {
      id: 'ACT-3201',
      title: 'Install anti-slip mat near loading ramp',
      area: 'Loading Bay',
      source: 'Incident',
      source_ref: 'INC-2411',
      priority: 'Critical',
      status: 'In Progress',
      owner_name: 'Facility Team',
      due_date_label: '12 Apr, 14:00',
      progress: 72,
    },
  ];

  const seedActionUpdates = [
    {
      action_id: 'ACT-3201',
      title: 'Owner assigned',
      detail: 'Facility Team ditetapkan sebagai owner.',
      time_label: '11 Apr, 10:10',
    },
  ];

  const seedActionAttachments = [
    {
      action_id: 'ACT-3201',
      id: 'ATT-9001',
      name: 'loading-ramp-condition.jpg',
      kind: 'Photo',
      uploaded_at_label: '11 Apr, 10:35',
      mime_type: 'image/jpeg',
      size_label: '1.8 MB',
      preview_url: null,
    },
  ];

  const seedInspections = [
    {
      id: 'INSP-1421',
      area: 'Warehouse A',
      inspector: 'Rizky',
      score: 86,
      status: 'Open Action',
    },
  ];

  const seedNotifications = [
    {
      id: 'ntf-01',
      source: 'Cabang',
      sender: 'Bandung Plant',
      message: 'Data inspeksi shift pagi sudah dikirim.',
      display_time_label: '10 menit lalu',
      unread: true,
      created_at_label: '12 Apr, 09:50',
    },
  ];

  beforeEach(async () => {
    const sessions: Array<{
      id: string;
      user_id: number;
      access_token: string;
      refresh_token: string;
      expires_at: number;
      revoked_at: null;
    }> = [];

    const actions = [...seedActions];
    const actionUpdates = [...seedActionUpdates];
    const actionAttachments = [...seedActionAttachments];
    const inspections = [...seedInspections];
    const notifications = [...seedNotifications];

    mockDatabaseService = {
      checkConnection: jest.fn().mockResolvedValue(true),
      query: jest.fn(async (text: string, params: unknown[] = []) => {
        if (text.includes('FROM safetyhub.app_users u') && text.includes('WHERE u.username = $1')) {
          const username = String(params[0] || '');
          return { rows: seedUsers.filter((user) => user.username === username).slice(0, 1) };
        }

        if (text.includes('FROM safetyhub.app_users u') && text.includes('GROUP BY u.id, b.name')) {
          const size = Number(params[0] || 50);
          const offset = Number(params[1] || 0);
          const sliced = seedUsers.slice(offset, offset + size);

          return {
            rows: sliced.map((user) => ({
              id: user.id,
              username: user.username,
              full_name: user.full_name,
              role: user.role,
              branch_name: user.branch_name,
              position: user.position,
              expertise_names: ['Risk Assessment'],
            })),
          };
        }

        if (text.includes('FROM safetyhub.user_expertise')) {
          return {
            rows: [
              { expertise_name: 'Incident Investigation' },
              { expertise_name: 'Risk Assessment' },
            ],
          };
        }

        if (text.includes('INSERT INTO safetyhub.user_sessions')) {
          const sessionId = `session-${sessions.length + 1}`;
          sessions.push({
            id: sessionId,
            user_id: Number(params[0]),
            access_token: String(params[1]),
            refresh_token: String(params[2]),
            expires_at: Number(params[3]),
            revoked_at: null,
          });
          return { rows: [] };
        }

        if (text.includes('FROM safetyhub.user_sessions s') && text.includes('JOIN safetyhub.app_users u')) {
          const token = String(params[0] || '');
          const activeSession = sessions.find((session) => session.access_token === token);
          if (!activeSession) {
            return { rows: [] };
          }

          const activeUser = seedUsers.find((user) => user.id === activeSession.user_id);
          if (!activeUser) {
            return { rows: [] };
          }

          return {
            rows: [
              {
                session_id: activeSession.id,
                user_id: activeSession.user_id,
                username: activeUser.username,
                role: activeUser.role,
              },
            ],
          };
        }

        if (text.includes('FROM safetyhub.action_items a') && text.includes('ORDER BY a.created_at DESC')) {
          return { rows: actions };
        }

        if (text.includes('SELECT COALESCE(MAX(NULLIF(regexp_replace(a.id')) {
          return { rows: [{ next_number: 3202 }] };
        }

        if (text.includes('INSERT INTO safetyhub.action_items')) {
          const created = {
            id: String(params[0]),
            title: String(params[1]),
            area: String(params[2]),
            source: String(params[3]),
            source_ref: String(params[4]),
            priority: String(params[5]),
            status: 'Open',
            owner_name: String(params[6]),
            due_date_label: '15 Apr, 16:00',
            progress: 0,
          };
          actions.unshift(created);
          return { rows: [] };
        }

        if (text.includes('UPDATE safetyhub.action_items') && text.includes('SET owner_name = $2')) {
          const actionId = String(params[0]);
          const owner = String(params[1]);
          const idx = actions.findIndex((item) => item.id === actionId);
          if (idx >= 0) {
            actions[idx] = {
              ...actions[idx],
              owner_name: owner,
            };
          }
          return { rows: [] };
        }

        if (text.includes('UPDATE safetyhub.action_items') && text.includes('SET status = $2::safetyhub.action_status')) {
          const actionId = String(params[0]);
          const status = String(params[1]);
          const idx = actions.findIndex((item) => item.id === actionId);
          if (idx >= 0) {
            actions[idx] = {
              ...actions[idx],
              status,
              progress: status === 'Done' ? 100 : actions[idx].progress,
            };
          }
          return { rows: [] };
        }

        if (text.includes('UPDATE safetyhub.action_items') && text.includes('SET progress = $2')) {
          const actionId = String(params[0]);
          const progress = Number(params[1]);
          const status = String(params[2]);
          const idx = actions.findIndex((item) => item.id === actionId);
          if (idx >= 0) {
            actions[idx] = {
              ...actions[idx],
              progress,
              status,
            };
          }
          return { rows: [] };
        }

        if (text.includes('FROM safetyhub.action_updates u')) {
          return { rows: actionUpdates };
        }

        if (text.includes('INSERT INTO safetyhub.action_updates')) {
          const actionId = String(params[0]);
          if (String(text).includes("'Action created'")) {
            actionUpdates.unshift({
              action_id: actionId,
              title: 'Action created',
              detail: String(params[1]),
              time_label: '12 Apr, 15:05',
            });
            return { rows: [] };
          }

          actionUpdates.unshift({
            action_id: actionId,
            title: 'Progress updated',
            detail: String(params[1]),
            time_label: '12 Apr, 15:20',
          });
          return { rows: [] };
        }

        if (text.includes('FROM safetyhub.action_attachments at') && text.includes('ORDER BY at.uploaded_at DESC')) {
          return { rows: actionAttachments };
        }

        if (text.includes('SELECT COALESCE(MAX(NULLIF(regexp_replace(at.id')) {
          return { rows: [{ next_number: 9002 }] };
        }

        if (text.includes('INSERT INTO safetyhub.action_attachments')) {
          actionAttachments.unshift({
            id: String(params[0]),
            action_id: String(params[1]),
            name: String(params[2]),
            kind: String(params[3]),
            uploaded_at_label: '12 Apr, 16:10',
            mime_type: params[4] ? String(params[4]) : null,
            size_label: params[5] ? String(params[5]) : null,
            preview_url: params[6] ? String(params[6]) : null,
          });
          return { rows: [] };
        }

        if (text.includes('DELETE FROM safetyhub.action_attachments')) {
          const attachmentId = String(params[0]);
          const actionId = String(params[1]);
          const idx = actionAttachments.findIndex((item) => item.id === attachmentId && item.action_id === actionId);
          if (idx >= 0) {
            actionAttachments.splice(idx, 1);
          }
          return { rows: [] };
        }

        if (text.includes('FROM safetyhub.inspections i') && text.includes('ORDER BY i.inspected_at DESC')) {
          return { rows: inspections };
        }

        if (text.includes('SELECT COALESCE(MAX(NULLIF(regexp_replace(i.id')) {
          return { rows: [{ next_number: 1422 }] };
        }

        if (text.includes('INSERT INTO safetyhub.inspections')) {
          const created = {
            id: String(params[0]),
            area: String(params[1]),
            inspector: String(params[2]),
            score: Number(params[3]),
            status: String(params[4]),
          };
          inspections.unshift(created);
          return { rows: [created] };
        }

        if (text.includes('FROM safetyhub.notifications n')) {
          return { rows: notifications };
        }

        if (text.includes('UPDATE safetyhub.notifications')) {
          const notificationId = String(params[0]);
          const idx = notifications.findIndex((item) => item.id === notificationId);
          if (idx >= 0) {
            notifications[idx] = {
              ...notifications[idx],
              unread: false,
            };
          }
          return { rows: [] };
        }

        return { rows: [] };
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          service: 'safetyhub-backend',
          status: 'ok',
          database: 'connected',
        });
      });
  });

  it('/actions (GET) should require bearer token', () => {
    return request(app.getHttpServer())
      .get('/actions')
      .expect(401);
  });

  it('auth + actions flow should succeed with valid token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const actionsResponse = await request(app.getHttpServer())
      .get('/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(actionsResponse.body)).toBe(true);
    expect(actionsResponse.body[0]).toMatchObject({
      id: 'ACT-3201',
      sourceRef: 'INC-2411',
    });
  });

  it('should create inspection with bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const createResponse = await request(app.getHttpServer())
      .post('/inspections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        area: 'Packing Station',
        inspector: 'Dina',
        score: 93,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: 'INSP-1422',
      area: 'Packing Station',
      inspector: 'Dina',
      status: 'Closed',
    });
  });

  it('should mark notification as read with bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const patchResponse = await request(app.getHttpServer())
      .patch('/notifications/ntf-01/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(patchResponse.body)).toBe(true);
    expect(patchResponse.body[0]).toMatchObject({
      id: 'ntf-01',
      unread: false,
    });
  });

  it('should create action with bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const createResponse = await request(app.getHttpServer())
      .post('/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Reinforce permit-to-work briefing',
        area: 'Utilities',
        source: 'Inspection',
        sourceRef: 'INSP-1421',
        priority: 'High',
        owner: 'HSE Team',
        dueDate: '15 Apr, 16:00',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: 'ACT-3202',
      title: 'Reinforce permit-to-work briefing',
      status: 'Open',
      owner: 'HSE Team',
    });
  });

  it('should update action owner and status with bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const ownerResponse = await request(app.getHttpServer())
      .patch('/actions/ACT-3201/owner')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ owner: 'Ops Supervisor' })
      .expect(200);

    expect(ownerResponse.body).toMatchObject({
      id: 'ACT-3201',
      owner: 'Ops Supervisor',
    });

    const statusResponse = await request(app.getHttpServer())
      .patch('/actions/ACT-3201/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'Done' })
      .expect(200);

    expect(statusResponse.body).toMatchObject({
      id: 'ACT-3201',
      status: 'Done',
      progress: 100,
    });
  });

  it('should update action progress and manage attachments with bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const progressResponse = await request(app.getHttpServer())
      .patch('/actions/ACT-3201/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        progress: 88,
        status: 'In Progress',
        note: 'Execution update from e2e',
      })
      .expect(200);

    expect(progressResponse.body).toMatchObject({
      id: 'ACT-3201',
      progress: 88,
      status: 'In Progress',
    });

    const attachmentResponse = await request(app.getHttpServer())
      .post('/actions/ACT-3201/attachments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'evidence-photo.jpg',
        kind: 'Photo',
        mimeType: 'image/jpeg',
        sizeLabel: '950 KB',
      })
      .expect(201);

    expect(attachmentResponse.body).toMatchObject({
      id: 'ACT-3201',
    });
    expect(Array.isArray(attachmentResponse.body.attachments)).toBe(true);
    expect(attachmentResponse.body.attachments.some((item: { id: string }) => item.id === 'ATT-9002')).toBe(true);

    const deleteAttachmentResponse = await request(app.getHttpServer())
      .delete('/actions/ACT-3201/attachments/ATT-9002')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(deleteAttachmentResponse.body).toMatchObject({ id: 'ACT-3201' });
    expect(deleteAttachmentResponse.body.attachments.some((item: { id: string }) => item.id === 'ATT-9002')).toBe(false);
  });

  it('should reject invalid login payload with standardized error contract', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: '123',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            statusCode: 400,
            message: 'Validasi request gagal',
          },
          path: '/auth/login',
        });
        expect(Array.isArray(response.body.error.details)).toBe(true);
      });
  });

  it('should reject action create with invalid dueDate format', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Invalid due date action',
        area: 'Utilities',
        source: 'Inspection',
        sourceRef: 'INSP-1421',
        priority: 'High',
        owner: 'HSE Team',
        dueDate: '2026-04-15 16:00',
      })
      .expect(400);
  });

  it('should reject action create by technician role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'teknisi',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Technician should not create',
        area: 'Utilities',
        source: 'Inspection',
        sourceRef: 'INSP-1421',
        priority: 'High',
        owner: 'HSE Team',
        dueDate: '15 Apr, 16:00',
      })
      .expect(403);
  });

  it('should allow action create by supervisor role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'supervisor',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .post('/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Supervisor can create action',
        area: 'Warehouse A',
        source: 'Incident',
        sourceRef: 'INC-2411',
        priority: 'High',
        owner: 'Ops Supervisor',
        dueDate: '15 Apr, 16:00',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Supervisor can create action',
      status: 'Open',
    });
  });

  it('should reject inspection create with score above 100', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/inspections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        area: 'Packing Station',
        inspector: 'Dina',
        score: 120,
      })
      .expect(400);
  });

  it('should reject report export with unsupported target', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/reports/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        target: 'csv',
      })
      .expect(400);
  });

  it('should reject users list for technician role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'teknisi',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should allow users list for administrator role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((item: { username: string }) => item.username === 'admin')).toBe(true);
  });

  it('should apply users pagination params for administrator role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .get('/users?page=2&size=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toMatchObject({ username: 'supervisor' });
  });

  it('should reject deactivating primary admin account', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .patch('/users/admin/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Akun admin utama tidak dapat dinonaktifkan.',
      },
    });
  });

  it('should reject deleting primary admin account', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .delete('/users/admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Akun admin utama tidak dapat dihapus.',
      },
    });
  });

  it('should reject inspection create by technician role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'teknisi',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/inspections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        area: 'Test Area',
        inspector: 'Test Inspector',
        score: 80,
      })
      .expect(403);
  });

  it('should reject inspection create by supervisor role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'supervisor',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/inspections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        area: 'Test Area',
        inspector: 'Test Inspector',
        score: 80,
      })
      .expect(403);
  });

  it('should allow inspection create by administrator role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .post('/inspections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        area: 'RBAC Test Area',
        inspector: 'RBAC Test Inspector',
        score: 85,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      area: 'RBAC Test Area',
      inspector: 'RBAC Test Inspector',
      score: 85,
    });
  });

  it('should reject report focus-metrics update by technician role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'teknisi',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/reports/focus-metrics')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        metrics: ['TRIR', 'Near Miss'],
      })
      .expect(403);
  });

  it('should reject report focus-metrics update by supervisor role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'supervisor',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/reports/focus-metrics')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        metrics: ['TRIR', 'Near Miss'],
      })
      .expect(403);
  });

  it('should allow report focus-metrics update by administrator role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .post('/reports/focus-metrics')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        metrics: ['TRIR', 'CAPA'],
      })
      .expect(201);

    expect(response.body).toHaveProperty('allFocusMetrics');
  });

  it('should reject report export by technician role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'teknisi',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/reports/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        target: 'pdf',
      })
      .expect(403);
  });

  it('should allow report export by administrator role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'SafetyHub@2026',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .post('/reports/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        target: 'pdf',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      target: 'pdf',
      status: 'processed',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
