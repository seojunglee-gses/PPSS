# PPSS Prototype

A React + Node.js prototype for the ChatGPT-assisted Public Participation Support System (PPSS). The interface mirrors the layout from the referenced study and now includes a personalized agent pipeline backed by MongoDB and the ChatGPT API.

## Features
- Sidebar navigation for Home, Workspace, Report, and Settings.
- Role-based sign-in on Home with personal codes (defaults: Government `0000`, The Public `3000`).
- Workspace with simulation, notes, and a personalized agent chat transcript per user session.
- Workspace Problem Definition stage with project brief (Figure 6 layout), personalized agent dialogue, and chat_summary_agent summaries aggregated across users.
- Workspace Data Analysis stage with precedent tabs (text + imagery), multimodal agent Q&A, and rendered JSON responses from the analysis API.
- Server endpoints that load `agent_profile` on login, generate a system prompt from the stakeholder type, and persist conversation history in MongoDB.

## Running the server
From the `server` directory:

```bash
npm install
npm run start
```

Set environment variables as needed:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ppss
OPENAI_API_KEY=sk-...
```

If no `OPENAI_API_KEY` is provided, the server returns a placeholder assistant message to keep the flow testable.

### Problem Definition stage APIs

The Node API exposes stage-specific routes for the workspace UI:

- `POST /api/stage/problem-definition/chat` — send a problem-definition prompt for the current session, persist the dialogue, and return the updated conversation plus the latest summary (if any).
- `GET /api/stage/problem-definition/chat?sessionId=<id>` — reload the problem-definition conversation for a session.
- `POST /api/stage/problem-definition/summary` — aggregate all stored stage conversations across users, call `chat_summary_agent`, save the summary, and return the newest summary text.

### Data Analysis API

- `POST /api/analysis/query` — accept `sessionId`, `user_question`, and `context_docs` (including image URLs). Sends a multimodal request to the personalized agent, stores the query/response, and returns the JSON answer consumed by the UI.

## Running the client
The client is a single-page React experience rendered via CDN. Serve the repository root with any static file server so the browser can load `index.html` and make requests to the Node API (defaulting to `http://localhost:3001`). Set `window.API_BASE_URL` in a script tag if the API runs elsewhere. For quick local preview:

```bash
cd /workspace/PPSS
python -m http.server 8000
```

Then open http://localhost:8000 in a browser (ensure the Node server is running on port 3001).
