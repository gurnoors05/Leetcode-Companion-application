# Real-World Considerations & Architectural Decisions

This document outlines the engineering decisions, trade-offs, and real-world considerations made during the development of LeetCode Companion.

## Scalability & Performance

### What would break at scale?
- **In-Memory AI Rate Limiting/Caching:** The current implementation of AI auto-tagging relies on basic caching mechanisms and lacks robust rate-limiting. In a multi-instance deployment (e.g., a serverless Next.js environment spanning multiple regions), this in-memory cache would fragment, leading to redundant API calls to Groq and potential rate limit exhaustion.
- **Connection Pooling:** The PostgreSQL integration currently uses a basic client/pool setup. At a massive scale, especially in a serverless environment like Vercel where thousands of ephemeral lambda instances might spin up, this would rapidly exhaust the database's maximum connections.
- **Synchronous External API Calls:** The "Push to GitHub" functionality holds the HTTP request open while awaiting the GitHub API response. At high scale, this ties up server resources and creates bottlenecks.

### How we'd fix it for production:
- **Distributed Caching & Queues:** Implement **Redis (e.g., Upstash)** for centralized rate limiting and caching of AI responses. Move the GitHub push and AI analysis tasks to an asynchronous queue (like Redis + BullMQ or AWS SQS) so the API route can return immediately, and the client can poll or receive a WebSocket/SSE update upon completion.
- **Connection Pooling Proxy:** Introduce **PgBouncer** or use a serverless-friendly database provider (like Supabase or Neon) that handles connection pooling natively, ensuring the DB doesn't crash under serverless connection spikes.

## Error Handling & Reliability

- **Strict Data Validation:** The backend API routes enforce strict input validation using **Zod**. Every incoming request (params, queries, and bodies) is parsed and validated before touching the database. This prevents SQL injection vulnerabilities and ensures data integrity.
- **Graceful Failure in UI:** During E2E testing, a bug was identified where paginating past the available data resulted in `NaN` pages and crashed the UI. This was resolved by implementing strict bounds checking and fallback defaults, demonstrating rigor in handling edge cases.
- **Turbopack Routing Fixes:** Encountered a deep Next.js App Router bug where the development bundler (Turbopack) persistently cached a 404 state for a nested POST route (`/api/problems/[id]/patterns/[patternId]/github-push`). To guarantee reliability and bypass the bundler corruption, the route was refactored into a flat API endpoint (`/api/github-push`) passing IDs in the request body.

## Security Practices

- **Encryption at Rest:** Users' GitHub OAuth tokens are highly sensitive. Instead of storing them in plaintext, the app encrypts them using **AES-256-GCM** before saving to PostgreSQL, ensuring that even in the event of a database dump leak, the tokens remain secure.
- **JWT Pinning:** The JSON Web Tokens are explicitly pinned to the **HS256** algorithm (`jwt.verify(token, secret, { algorithms: ['HS256'] })`) to prevent algorithm confusion attacks where an attacker might attempt to bypass verification by switching the algorithm to `none`.
- **404 Over 403 for Private Data:** When a user attempts to access a problem or pattern they do not own (and which isn't explicitly marked `PUBLIC`), the API returns a `404 Not Found` rather than a `403 Forbidden`. This explicitly prevents attackers from enumerating database IDs to discover the existence of private data.
- **Origin-Verified Extension Bridge:** The Chrome Extension authenticates by receiving the JWT from the web app via `window.postMessage`. To prevent malicious iframes or other extensions from hijacking this token, the `authBridge` explicitly checks `if (event.origin !== 'http://localhost:3000') return;`.

## Known Limitations

- **Single-Region Deployment:** The application currently expects the database and backend to reside in the same region. High latency could occur if deployed globally without read replicas.
- **File System Code Heuristics:** The logic for determining the file extension for a GitHub push (e.g., `.py`, `.java`) is currently based on simple string heuristics (`includes('def ')`). In a production setting, this should be explicitly tracked via a `language` dropdown during submission.
