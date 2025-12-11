# PPSS Prototype

A lightweight static prototype for the ChatGPT-assisted Public Participation Support System (PPSS). The interface mirrors the layout from the referenced study with:

- A left sidebar for Home, Workspace, Report, and Settings.
- Role-based sign-in on Home with a personal code prompt.
- A collaborative workspace that redirects to after sign-in.
- Report and Settings sections for documentation and personal code management.

## Running locally

From the repository root:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in a browser.
