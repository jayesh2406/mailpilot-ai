# MailPilot AI

MailPilot is a responsive prototype for personal assistants managing client email. It includes an assistant inbox and a separate client-facing workspace for conversations that need a personal reply.

## Run locally

```bash
cd client
npm install
npm run dev
```

The production build can be checked with `npm run build`; `npm run lint` runs Oxlint.

## Prototype flows

- Browse the sample inbox, search messages, and filter by responsibility, unread status, importance, meetings, or archive.
- Open a message to review its summary and reason for classification. Change who should reply, mark it handled or unread, star it, archive it, or save a reply draft.
- Open **Client workspace** in the sidebar to preview a client’s clean attention-only inbox. Mark a message handled or ask the assistant to take over; the assistant view reflects the same state.
- Connect a simulated Gmail or Outlook inbox and sync the sample messages without accessing a real email account.
- Run local demo analysis and review its suggested classification without sending email content to an external AI service.
- Compose and save a local draft. No email is sent.
- Visit an unknown route to see the custom not-found page.

## Demo limits

Messages, summaries, classifications, and client identities are sample data. The Gmail and Outlook connection flow is simulated; the local AI demo uses simple rules. Live account access, LLM analysis, authentication, and sending are not connected. Interaction state, demo account state, and drafts are stored in the current browser's local storage.

## Stack

React, TypeScript, Vite, Tailwind CSS v4, React Router, Motion, and Lucide icons.
