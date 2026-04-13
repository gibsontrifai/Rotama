# SafetyHub Frontend

Frontend starter untuk aplikasi operasional safety dengan fokus performa cepat dan maintenance mudah.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS (v4 via Vite plugin)
- React Router
- TanStack Query
- React Hook Form + Zod
- Zustand
- ESLint + Prettier

## Folder Structure

- `src/app`: app shell, router, providers
- `src/features`: modular feature pages (dashboard, inspections, incidents)
- `src/shared`: state/store dan utility bersama

## Scripts

- `npm run dev`: start local development server
- `npm run build`: type-check + build production
- `npm run typecheck`: TypeScript project check
- `npm run lint`: ESLint check
- `npm run format`: Prettier format
- `npm run check`: typecheck + lint
- `npm run preview`: preview hasil build

## Run Locally

```bash
npm install
npm run dev
```

## Backend (NestJS)

Backend API sekarang tersedia di folder `backend`.

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Health check endpoint:

- `GET http://localhost:3001/`
- Swagger docs: `http://localhost:3001/api/docs`
- Auth login: `POST http://localhost:3001/auth/login`
- Auth refresh: `POST http://localhost:3001/auth/refresh`
- Incidents list: `GET http://localhost:3001/incidents`
- Inspections list: `GET http://localhost:3001/inspections`
- Create inspection: `POST http://localhost:3001/inspections`
- Actions list: `GET http://localhost:3001/actions`
- Action detail: `GET http://localhost:3001/actions/:actionId`
- Create action: `POST http://localhost:3001/actions`
- Update action owner: `PATCH http://localhost:3001/actions/:actionId/owner`
- Update action status: `PATCH http://localhost:3001/actions/:actionId/status`
- Update action progress: `PATCH http://localhost:3001/actions/:actionId/progress`
- Add action attachment: `POST http://localhost:3001/actions/:actionId/attachments`
- Remove action attachment: `DELETE http://localhost:3001/actions/:actionId/attachments/:attachmentId`
- Reports dataset: `GET http://localhost:3001/reports/dataset`
- Reports focus metrics: `POST http://localhost:3001/reports/focus-metrics`
- Reports export: `POST http://localhost:3001/reports/export`
- Users list: `GET http://localhost:3001/users`
- Create user: `POST http://localhost:3001/users`
- Activate user from email token: `GET http://localhost:3001/users/activate?token=...`
- Update profile by username: `PATCH http://localhost:3001/users/:username/profile`
- Notifications list: `GET http://localhost:3001/notifications`
- Mark notification as read: `PATCH http://localhost:3001/notifications/:notificationId/read`

Email konfirmasi registrasi user:

- Saat admin membuat user baru (`POST /users`), backend akan mencoba mengirim email konfirmasi pendaftaran ke email user.
- User baru dibuat dalam kondisi nonaktif (`isActive=false`) sampai link aktivasi di email diklik.
- Link aktivasi diarahkan ke frontend (`/activate`) lalu frontend memanggil endpoint backend aktivasi token.
- Jika SMTP belum diisi, proses create user tetap berhasil dan email dilewati (dicatat di log backend).
- Konfigurasi di `backend/.env`:
	- `APP_NAME`
	- `APP_LOGIN_URL`
	- `APP_BASE_URL`
	- `USER_ACTIVATION_TOKEN_SECRET`
	- `USER_ACTIVATION_TOKEN_EXPIRES_IN_HOURS`
	- `SMTP_HOST`
	- `SMTP_PORT`
	- `SMTP_SECURE`
	- `SMTP_USER`
	- `SMTP_PASS`
	- `SMTP_FROM`

Autentikasi backend:

- Endpoint public: `GET /` dan `POST /auth/login`, `POST /auth/refresh`
- Endpoint lainnya membutuhkan header `Authorization: Bearer <accessToken>`

Pagination standar endpoint list:

- Query `page` (default `1`, min `1`)
- Query `size` (default `50`, min `1`, max `100`)
- Berlaku untuk: `/actions`, `/incidents`, `/inspections`, `/users`, `/notifications`

## Auth API Mode

- Default menggunakan mock auth agar development tetap berjalan tanpa backend.
- Untuk menggunakan backend asli, set env berikut:

```bash
VITE_USE_MOCK_AUTH=false
VITE_API_BASE_URL=https://your-api-base-url
```

- Endpoint yang dipakai:
	- `POST /auth/login`
	- `POST /auth/refresh`

## Frontend to Backend Switch

Untuk menghubungkan frontend ke backend lokal:

```bash
cp .env.example .env
```

Nilai penting:

- `VITE_USE_MOCK_AUTH=false`
- `VITE_USE_MOCK_ACTIONS=false`
- `VITE_USE_MOCK_REPORTS=false`
- `VITE_USE_MOCK_USERS=false`
- `VITE_USE_MOCK_NOTIFICATIONS=false`
- `VITE_API_BASE_URL=http://localhost:3001`

Endpoint dashboard backend yang sudah tersedia:

- `GET /dashboard/summary`
