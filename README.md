# PPSS Prototype

A React + Node.js prototype for the ChatGPT-assisted Public Participation Support System (PPSS). The interface mirrors the layout from the referenced study and now includes a personalized agent pipeline backed by MongoDB and the ChatGPT API.

## Features
- Sidebar navigation for Home, Workspace, Report, and Settings.
- Role-based sign-in on Home with personal codes (defaults: Government `0000`, The Public `3000`).
- Workspace with simulation, notes, and a personalized agent chat transcript per user session.
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

## Running the client
The client is a single-page React experience rendered via CDN. Serve the repository root with any static file server so the browser can load `index.html` and make requests to the Node API (defaulting to `http://localhost:3001`). Set `window.API_BASE_URL` in a script tag if the API runs elsewhere. For quick local preview:

```bash
cd /workspace/PPSS
python -m http.server 8000
```

Then open http://localhost:8000 in a browser (ensure the Node server is running on port 3001).
