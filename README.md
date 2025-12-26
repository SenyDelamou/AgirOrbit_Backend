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

## Deploy (Render)

- Ensure the following environment variables are set in the Render service settings (Environment > Environment Variables):
	- `DATABASE_URL` (required) — PostgreSQL connection string
	- `JWT_ACCESS_SECRET` (required)
	- `OTP_SECRET` (required)
	- Optional: `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `SMTP_*`, `PORT`

	If your frontend is deployed (for example on Vercel), set `FRONTEND_URL` to the public URL of your site (example: `https://agriorbit.vercel.app`).

- For local testing, copy `.env.example` to `.env` and fill values:

```bash
cp server/.env.example server/.env
# edit server/.env
```

- After setting env vars on Render, deploy; Render will run `npm install && npx prisma generate && npm run build` then `npm start`.

If you prefer the server to perform a build step (transpile or bundle), replace the `build` script in `package.json` accordingly.

## Generating strong secrets

Two helper scripts are provided to generate strong random secrets for `JWT_ACCESS_SECRET` and `OTP_SECRET`:

- `server/bin/generate-secrets.ps1` — PowerShell script (Windows).
- `server/bin/generate-secrets.sh` — POSIX shell script (Linux/macOS).

Examples:

PowerShell (prints secrets):

```powershell
.\server\bin\generate-secrets.ps1
```

PowerShell (append to `.env`):

```powershell
.\server\bin\generate-secrets.ps1 -Write -File .\.env
```

Bash (prints secrets):

```bash
./server/bin/generate-secrets.sh
```

Bash (append to `.env`):

```bash
./server/bin/generate-secrets.sh --write --file server/.env
```

Be careful: appending will add the secrets to the given file; edit or remove as appropriate.
