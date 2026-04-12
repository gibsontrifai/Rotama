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
