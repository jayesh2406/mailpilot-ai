# MailPilot AI

MailPilot is a responsive personal assistant inbox prototype. It starts in offline demo mode and uses realistic sample email data. The main user flows do not require Google OAuth, MongoDB, or paid AI credentials.

## Live demo

[Open MailPilot AI](https://jayesh2406.github.io/mailpilot-ai/). The demo uses sample messages and simulated Gmail/Outlook connections; it does not connect to a real inbox.

## Run the prototype

In one terminal, run the optional API:

```bash
cd server
npm install
npm run dev
```

In another terminal, run the client:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. For the assignment demo, the client can also run on its own; the API is only needed for the optional live integrations.

## Demo workflows

- Connect a simulated Gmail or Outlook inbox. The app stores only a demo connection label in this browser and never opens or reads a real email account.
- Sync the sample inbox, search and filter messages, inspect conversation details, and change reply responsibility.
- Run local demo analysis. It uses simple in-browser rules and sends no email content to an AI service.
- Mark items handled or delegate them from the Client Workspace; the shared Assistant Dashboard updates immediately.
- Draft and edit replies, then save drafts in this browser. The prototype does not send email.

Demo connection status, message state, and drafts are stored in browser local storage.

## Optional live integrations

The Express API contains a Gmail read-only OAuth/sync flow and an OpenAI Responses API endpoint for later use. They are not needed for the demo workflows above. Live Gmail requires Google OAuth settings and MongoDB in `server/.env`; live AI analysis requires an OpenAI API key. No credentials are included in the project.

The Gmail callback configured by default is `http://localhost:4000/api/integrations/gmail/callback`. Never put provider secrets in the client or a `VITE_*` variable.

## Current limits

- This prototype does not include user authentication or multi-user access control.
- Demo connection and email state are local to the current browser.
- Outlook is simulated only. Gmail live sync, if configured, is read-only and manual; send, archive, and provider-side read-state operations are not implemented.
- Local demo analysis is deterministic and intended to demonstrate the interaction, not replace an LLM classifier.
