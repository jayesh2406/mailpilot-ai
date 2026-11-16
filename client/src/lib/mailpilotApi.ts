export type GmailIntegrationStatus = {
  configured: boolean;
  missing: string[];
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
};

export type IntegrationStatus = {
  gmail: GmailIntegrationStatus;
  ai: { configured: boolean; model: string };
};

export type SyncedEmail = {
  providerMessageId: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
  classification: "Assistant to Reply" | "Client to Reply" | "No Reply Needed" | "Needs review";
  summary: string;
  reason: string;
  confidence: number | null;
  priority: "High" | "Medium" | "Low";
  isHandled?: boolean;
  isArchived?: boolean;
  isImportant?: boolean;
  isUnread?: boolean;
};

export type EmailAnalysis = {
  category: SyncedEmail["classification"];
  summary: string;
  reason: string;
  confidence: number;
  priority: SyncedEmail["priority"];
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new Error("MailPilot API is not running. Start the server to connect Gmail or use AI analysis.");
  }
  const data = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.");
  return data;
}

export function getIntegrationStatus() {
  return apiRequest<IntegrationStatus>("/api/integrations/status");
}

export function syncGmail() {
  return apiRequest<{ messages: SyncedEmail[]; syncedAt: string }>("/api/integrations/gmail/sync", { method: "POST" });
}

export function analyzeEmail(email: { sender: string; subject: string; body: string; providerMessageId?: string }) {
  return apiRequest<EmailAnalysis>("/api/ai/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(email),
  });
}

export function saveMessageState(providerMessageId: string, state: { classification?: SyncedEmail["classification"]; isHandled?: boolean; isArchived?: boolean; isImportant?: boolean; isUnread?: boolean }) {
  return apiRequest<{ saved: boolean }>(`/api/messages/${encodeURIComponent(providerMessageId)}/state`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state),
  });
}
