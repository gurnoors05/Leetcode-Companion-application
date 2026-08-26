# LeetCode Companion

LeetCode Companion is an advanced tracking and learning platform for algorithmic problem solving. Unlike basic CRUD apps or standard spreadsheets that just track whether you solved a problem, this app centers around a **multi-pattern linking concept**. It allows you to link multiple distinct approaches (patterns) to a single problem, track your mistakes for each approach separately, use AI to extract time/space complexities automatically, and selectively sync specific approaches to an organized GitHub repository. 

## Features

- **Multi-Pattern Linking:** Connect a single LeetCode problem to multiple algorithmic patterns (e.g., solving "Trapping Rain Water" with both Two Pointers and Dynamic Programming).
- **AI Auto-Tagging & Analysis:** Powered by Groq and the Vercel AI SDK, the app automatically analyzes your code to extract time/space complexities and suggests relevant patterns.
- **GitHub Sync by Pattern:** Push individual approaches to specific folders in your GitHub repository, creating a beautifully organized personal algorithms reference.
- **Spaced Repetition & Mistake Log:** Schedule reviews and log specific mistakes per approach, so you know exactly *why* you failed a problem and *when* to try again.
- **Chrome Extension Integration:** A Manifest V3 Chrome Extension injects directly into LeetCode.com, capturing your successful submissions and syncing them directly to your dashboard.
- **Excalidraw Canvas Integration:** Embedded drawing canvas to sketch out trees, graphs, and array pointers while studying a problem.
- **Visibility & Sharing:** Mark specific solutions as public or unlisted to share your approach notes with others via secure share tokens.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 18, Tailwind CSS, Lucide Icons, Recharts, Excalidraw
- **Backend:** Next.js API Routes (Serverless), PostgreSQL (pg node-postgres)
- **AI & Integrations:** Groq API (Llama3-8b), Vercel AI SDK, GitHub REST API
- **Browser Extension:** Chrome Extension Manifest V3, React, Vite
- **Authentication:** Custom JWT-based auth with GitHub OAuth integration

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` in the `webapp/` directory and fill in the required variables:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `ENCRYPTION_KEY`: A 32-byte hex string used to securely encrypt your GitHub OAuth tokens at rest.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secrets for signing user sessions.
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: Create a GitHub OAuth App (callback URL: `<FRONTEND_URL>/api/auth/github/callback`).
- `GROQ_API_KEY`: API key from the Groq console for AI features.

### 2. Database Migrations
The database schema is managed via `node-pg-migrate`.
From the `webapp/` directory, run:
```bash
npm install
npm run migrate up
```

### 3. Running the Web Application
Start the Next.js development server:
```bash
cd webapp
npm run dev
```
The app will be available at `http://localhost:3000`.

### 4. Loading & Using the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/dist` folder (ensure you run `npm run build` in the `extension/` folder first).
4. Go to the live Vercel dashboard at `https://leetcode-companion-application.vercel.app` and log in via GitHub.
5. The extension will automatically detect your session and connect to your account.
6. Open any LeetCode problem, write your solution, and when you click **Submit** and get an "Accepted" result, the extension will automatically intercept your code and save it directly to your Vercel database!

### Sharing the Extension with Others
If you want to share the extension with your friends so they can use your live application:
1. Zip the `extension/dist` folder.
2. Send the ZIP file to your friends.
3. Tell them to unzip it, go to `chrome://extensions`, turn on Developer Mode, and click "Load unpacked" to select the folder.
4. They just need to visit your Vercel link (`https://leetcode-companion-application.vercel.app`), log in with GitHub to create their own account, and the extension will automatically sync for them!

## Architecture Overview

**Data Model:** The core of the application revolves around the `problems`, `patterns`, and `problem_patterns` tables. A many-to-many relationship (`problem_patterns`) joins a problem to a pattern. This join table is where all the rich data lives: the specific code snippet, approach notes, time/space complexities, review dates, and GitHub sync URLs.

**Auth Flow:** When a user logs in via GitHub, the backend exchanges the OAuth code for a GitHub access token. This token is **encrypted** (AES-256-GCM) and stored in PostgreSQL. The backend then issues a standard JWT for the Next.js app session. The frontend securely passes this JWT to the Chrome Extension using a strict origin-verified `window.postMessage` bridge, allowing the extension to authenticate API calls directly.

## Links

- **Live Deployment:** [https://leetcode-companion-application.vercel.app](https://leetcode-companion-application.vercel.app)
