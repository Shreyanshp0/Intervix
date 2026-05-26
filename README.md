# Intervix

Intervix is a MERN-based interview platform for candidates and recruiters. It combines job applications, scheduling, live interview rooms, collaborative code editing, recruiter feedback, resume intelligence, voice-assisted interview flows, and real-time screen sharing.

## Project Structure

- `Backend/` - Express + MongoDB API, Socket.IO realtime server, interview orchestration, and AI/voice services.
- `Frontend/` - React + Vite web app for candidate, recruiter, and live interview experiences.
- `infra/` - Supporting infrastructure files.
- `docker-compose.yml` - Local/containerized deployment for frontend and backend.

## Key Features

- Candidate and recruiter authentication
- Job browsing, applications, and interview scheduling
- Live interview rooms with collaborative code editing
- WebRTC audio/video and screen sharing
- Recruiter notes, evaluation, and notepad sync
- Resume upload, parsing, and profile enrichment
- Voice-assisted interview flow and AI support
- Docker-based deployment with nginx

## Prerequisites

- Node.js 20+ recommended
- MongoDB instance
- npm
- Optional: Docker and Docker Compose

## Environment Setup

Create backend and frontend environment files before running the app.

### Backend

Create `Backend/.env` with the required values for your environment. At minimum, configure:

- `PORT` - defaults to `5000`
- `MONGODB_URI`
- `JWT_SECRET`
- AI and voice service keys such as `GROQ_API_KEY`, `HF_TOKEN`, `GEMINI_API_KEY`, or other values used by your deployment
- Any Cloudinary, TURN, or external service credentials you use

### Frontend

Create `Frontend/.env.local` with the API URL used by the browser app:

- `VITE_API_URL`

For local development, `http://localhost:5000` is the usual backend origin.

## Local Development

### Backend

```bash
cd Backend
npm install
npm run dev
```

The backend starts on `http://localhost:5000` by default.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend starts with Vite, usually on `http://localhost:5173`.

## Production Build

### Frontend

```bash
cd Frontend
npm run build
npm run preview
```

### Backend

```bash
cd Backend
npm run start
```

## Docker Compose

You can run both services with Docker Compose if the required backend env file is present.

```bash
docker compose up --build
```

Default container ports:

- Backend: `5000`
- Frontend: `3000`

## API and Realtime

The backend exposes REST endpoints under `/api` and Socket.IO for live interview sync, WebRTC signaling, and collaborative editor events.

## Notes

- Live interview rooms are routed by `roomId`.
- The frontend should use the backend-provided `roomId` directly for live interview links.
- If local API calls fail unexpectedly, confirm that the frontend is pointing at the correct backend URL and that the backend has a valid MongoDB connection.

## Related Files

- `Backend/server.js`
- `Backend/src/app.js`
- `Backend/src/sockets/index.js`
- `Frontend/src/pages/room/RoomPage.jsx`
- `docker-compose.yml`
