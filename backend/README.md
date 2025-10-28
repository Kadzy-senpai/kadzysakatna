TRICY API (trykedb)

This folder contains the FastAPI backend for the Tricycle booking app.

Quick start (development):

- Create a `.env` file in this folder or set environment variables:
  - NEO4J_URI (e.g. bolt://localhost:7687)
  - NEO4J_USER
  - NEO4J_PASSWORD
  - FRONTEND_URLS (comma-separated allowed origins, default: http://localhost:3000)

- Run the API server:
  uvicorn app.main:app --reload --port 8000

Notes on integration with the frontend (`v0-tricycle-booking-app`):

- The frontend expects NEXT_PUBLIC_API_BASE to point to the API base (e.g. http://localhost:8000).
- The backend exposes authentication endpoints used by the frontend:
  - POST /auth/register  (UserCreate payload)
  - POST /auth/login     (expects { email, password } and returns { access_token, user })
- CORS is enabled and controlled via FRONTEND_URLS.

If you need help wiring environment files or running both services together, tell me your OS and I will provide exact commands.

AuraDB (Neo4j Aura) notes:

- If you use AuraDB, your `NEO4J_URI` will typically look like:
  `neo4j+s://<your-db-id>.databases.neo4j.io:7687`
- Use the username and password shown in the Aura console. The driver will use TLS.
- The app will try to `verify_connectivity()` on startup and will raise a clear error if the URI/credentials are invalid.

Debugging TLS / certificate issues:

- The driver will attempt a fallback retry using `neo4j+ssc://` (server certificate verification disabled) if `neo4j+s://` connectivity fails. This is intended only for local debugging. If the fallback succeeds you should obtain the correct CA-signed certificate or configure your environment so `neo4j+s://` works without disabling verification.
