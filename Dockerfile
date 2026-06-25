# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the React frontend with Node 20 LTS
# ---------------------------------------------------------------------------
FROM node:20-slim AS frontend

WORKDIR /frontend

# Install deps first (cached unless package manifests change)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build the static bundle -> /frontend/dist
COPY frontend/ ./
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2 — Python runtime (glibc-based slim, not Alpine)
# ---------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app/backend

# Install Python deps first (cached unless requirements change)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ ./

# Built frontend served by FastAPI from backend/static/
COPY --from=frontend /frontend/dist ./static

EXPOSE 8001

# exec form + `exec` so ${PORT} expands AND uvicorn becomes PID 1 (clean SIGTERM
# handling for Render deploys). Render injects PORT; local/compose falls back to 8001.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
