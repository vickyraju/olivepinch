# OlivePinch

Meal subscription delivery app — Birmingham, UK pilot.

This repo is split by branch rather than by directory — each piece deploys and evolves independently:

| Branch | What it is | Deployed at |
|---|---|---|
| [`backend`](../../tree/backend) | Express + Prisma + PostgreSQL API | https://olivepinch-backend.onrender.com |
| [`ui-change`](../../tree/ui-change) | Customer web app — marketing site, subscribe funnel, post-login dashboard | https://olivepinch.vercel.app |
| [`admin-panel`](../../tree/admin-panel) | Internal ops panel — menu, zones, customer support, orders, revenue | https://admin-panel-gules-seven-61.vercel.app |

`main` (this branch) predates that split and isn't deployed anywhere — check out one of the branches above for current code, setup instructions, and status. Each branch's own README covers its local dev setup and what's still deferred.

Database: Supabase Postgres (`eu-west-2`, matching the backend's Render region).
