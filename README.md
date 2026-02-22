# ai-eval-lab

AI-proctored practical exam platform for engineering tools. Students complete hands-on tasks in browser-streamed desktop applications (KiCad, FreeCAD) while an AI conducts interviews, monitors progress, and evaluates performance against rubrics.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ AI Panel │  │  noVNC   │  │  Timer + Controls      │ │
│  │ TTS/STT  │  │ (iframe) │  │                        │ │
│  └────┬─────┘  └─────┬────┘  └────────────────────────┘ │
└───────┼──────────────┼──────────────────────────────────┘
        │              │
        ▼              ▼
┌──────────────┐  ┌──────────────┐
│  Next.js     │  │  Environment │
│  API Routes  │  │  Container   │
│              │  │              │
│  - AI Q&A    │  │  Xvfb        │
│  - Grading   │  │  x11vnc      │
│  - Sessions  │  │  websockify  │
│  - Admin     │  │  pcbnew      │
│              │  │  poller      │──► POST /api/poller
└──────┬───────┘  └──────────────┘
       │
  ┌────┴───────┐
  ▼            ▼
┌────────┐  ┌─────────┐
│Postgres│  │Redis    │
│        │  │         │
│Users   │  │Queue    │
│Sessions│  │State    │
│Grades  │  │Heartbeat│
└────────┘  └─────────┘
```

## Tech Stack

- **Frontend + Backend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Database:** PostgreSQL 16 (Prisma ORM)
- **Cache/Queue:** Redis 7 (ioredis)
- **AI:** Google Gemini (grading, Q&A, nudges, STT)
- **TTS:** ElevenLabs
- **Containers:** Docker + dockerode (dynamic provisioning)
- **VNC:** Xvfb + x11vnc + websockify + noVNC
- **Auth:** NextAuth v5 (GitHub, Google OAuth)
- **Email:** Resend

## Features

- **Three-phase exams:** Intro interview → Domain viva → Hands-on lab
- **Live KiCad streaming:** Browser-based PCB design via VNC
- **AI proctor:** Adaptive questioning, audio recording, TTS responses
- **Board poller:** 3-second snapshots of PCB state (footprints, tracks, zones)
- **AI grading:** LLM evaluates timeline + Q&A against rubric checkpoints
- **Nudge engine:** Detects stagnation, sends encouraging prompts
- **Admin panel:** Dashboard, assessment wizard, session browser, user management
- **Queue system:** Capacity-limited container pool with waiting room
- **Heartbeat monitoring:** Auto-cleanup of dead sessions

## Getting Started

### Prerequisites

- Node.js 22+
- Docker
- PostgreSQL 16
- Redis 7

### Local Development

```bash
# Clone and install
git clone git@github.com:janardannn/ai-eval-lab.git
cd ai-eval-lab/apps/web
npm install

# Setup environment
cp ../../.env.example .env
# Edit .env with your API keys

# Database
npx prisma migrate dev
npx prisma db seed

# Build KiCad image
cd ../../docker/kicad
docker build -t ai-eval-lab-kicad .

# Run
cd ../../apps/web
npm run dev
```

### Docker Compose (Development)

```bash
cd docker
docker compose up --build
```

### Docker Compose (Production)

```bash
cd docker
DOMAIN=yourdomain.com POSTGRES_PASSWORD=securepwd docker compose -f docker-compose.prod.yml up -d
```

Caddy automatically provisions HTTPS via Let's Encrypt.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GEMINI_API_KEY` | Google AI API key (Gemini) |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID |
| `AUTH_SECRET` | NextAuth secret (`npx auth secret`) |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth app |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth app |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address |
| `NEXT_PUBLIC_APP_URL` | Public URL (e.g., `https://yourdomain.com`) |
| `KICAD_IMAGE` | Docker image name for KiCad container |
| `MAX_CONTAINERS` | Max concurrent exam containers |
| `CRON_SECRET` | Secret for cleanup cron endpoint |

## Exam Flow

1. Student browses assessments at `/lab/kicad`
2. Starts exam → enters queue if at capacity
3. Container provisioned → VNC iframe loads KiCad
4. **Intro phase:** AI asks background questions (TTS/STT)
5. **Domain phase:** Adaptive technical questions
6. **Lab phase:** Student designs PCB, poller captures snapshots
7. Student submits → file extracted → container torn down
8. AI grades against rubric → verdict page with detailed report
9. Email notification sent with results

## Admin

Set `isAdmin: true` on a user record in the database, then access `/admin`:

- **Dashboard:** Stats, verdict distribution, completion trends
- **Assessments:** Create/edit with 5-step wizard, upload reference files
- **Sessions:** Filter, regrade, manual verdict override
- **Users:** View history, scores

## Project Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── admin/          # Dashboard, CRUD, regrade, override
│   │   ├── ai/             # Question generation, answer eval, nudges
│   │   ├── grader/         # LLM grading + email notification
│   │   ├── session/        # Start, status, heartbeat, end
│   │   └── poller/          # Snapshot ingestion from KiCad poller
│   ├── admin/              # Admin panel pages
│   ├── lab/                # Assessment browsing + start
│   ├── queue/              # Waiting room
│   └── session/            # Exam workspace + verdict
├── components/             # AIProctor, VNCViewer, Timer
├── hooks/                  # useHeartbeat, useNudge
└── lib/                    # Redis, Docker, AI, Grader, Email, TTS/STT
```
