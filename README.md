# AgriOrbit Server

## Requirements
- Node.js 18+
- PostgreSQL 14+

## Setup
1. Copy env file
- Create `server/.env` from `server/.env.example`

2. Install
- `npm install`

3. Prisma
- `npx prisma generate`
- `npx prisma migrate dev`

## Run
- `npm run dev`

API base URL: `http://localhost:4000/api`
