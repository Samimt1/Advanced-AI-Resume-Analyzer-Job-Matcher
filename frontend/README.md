# CareerMatch AI frontend

Next.js 15 + Tailwind CSS v4 + shadcn-style UI components + Radix primitives, Framer Motion, and Sonner.

## Local development

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the FastAPI base URL (including `/api/v1`).

## Deployment

Vercel project root directory must be **frontend**. Configure `NEXT_PUBLIC_API_URL` in Vercel and redeploy. Resume parsing and matching require a separately deployed FastAPI backend with compatible CORS settings. No authentication or private resume storage is implemented in this prototype.
