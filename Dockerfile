# Stage 1 — build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2 — Python runtime
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy the compiled React app into the location FastAPI serves
COPY --from=frontend-builder /app/frontend/build ./static

EXPOSE 8000

# Use shell form so $PORT is expanded at runtime
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
