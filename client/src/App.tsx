
import { useEffect, useState, type FormEvent } from "react";
import {
  Inbox, Send, Archive, ArchiveRestore, Star, Clock3, Users, CalendarDays,
  Search, Bell, Sparkles, Plus, Reply, Menu,
  X, CheckCircle2, Mail, LayoutDashboard, BriefcaseBusiness, CircleDot, RefreshCw,
  Eye, EyeOff, Save, CircleAlert
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ClientWorkspace, { type ReplyCategory, type WorkspaceEmail } from "./components/ClientWorkspace";
import NotFound from "./components/NotFound";
import { getIntegrationStatus, saveMessageState, syncGmail, type EmailAnalysis, type IntegrationStatus, type SyncedEmail } from "./lib/mailpilotApi";

type EmailItem = WorkspaceEmail & { unread: boolean; priority: "High" | "Medium" | "Low"; confidence?: number | null; isHandled?: boolean; isArchived?: boolean; isImportant?: boolean; isUnread?: boolean; waitingOnResponse?: boolean };
type DemoProvider = "Gmail" | "Outlook";
type DemoConnection = { provider: DemoProvider; address: string; connectedAt: string; lastSyncAt: string | null };

const emails: EmailItem[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    initials: "SJ",
    color: "bg-violet-100 text-violet-700",
    email: "sarah@designstudio.com",
    subject: "Website redesign — Final proposal",
    message: "Hi! I've attached the final proposal for the website redesign. Could you review the pricing and timeline before our meeting tomorrow?",
    time: "10:42 AM",
    category: "Client to Reply",
    summary: "Sarah has shared the final website redesign proposal and is waiting for your approval on pricing and timeline.",
    reason: "Direct question requiring your approval.",
    unread: true,
    priority: "High",
  },
  {
    id: 2,
    name: "Michael Chen",
    initials: "MC",
    color: "bg-blue-100 text-blue-700",
    email: "michael@techflow.io",
    subject: "Re: Partnership discussion",
    message: "Thanks for sharing the details. I'll review everything and get back to you with the next steps by Friday.",
    time: "9:18 AM",
    category: "Assistant to Reply",
    summary: "Michael is expecting a follow-up with the partnership details. A draft response can be prepared.",
    reason: "A follow-up commitment is pending.",
    waitingOnResponse: true,
    unread: true,
    priority: "Medium",
  },
  {
    id: 3,
    name: "Emily Parker",
    initials: "EP",
    color: "bg-rose-100 text-rose-700",
    email: "emily@marketing.co",
    subject: "Campaign assets received",
    message: "Just confirming that all campaign assets have been received. Everything looks great. Thank you!",
    time: "Yesterday",
    category: "No Reply Needed",
    summary: "Emily confirmed receipt of all campaign assets. No response is necessary.",
    reason: "Informational confirmation with no pending question.",
    unread: false,
    priority: "Low",
  },
  {
    id: 4,
    name: "David Wilson",
    initials: "DW",
    color: "bg-amber-100 text-amber-700",
    email: "david@startup.com",
    subject: "Meeting rescheduled to Thursday",
    message: "Our meeting has been moved to Thursday at 3 PM. Please confirm if this works for you.",
    time: "Yesterday",
    category: "Client to Reply",
    summary: "David has proposed a new meeting time and needs your confirmation.",
    reason: "Meeting confirmation is requested.",
    unread: false,
    priority: "High",
  },
  {
    id: 5,
    name: "Alex Morgan",
    initials: "AM",
    color: "bg-emerald-100 text-emerald-700",
    email: "alex@company.com",
    subject: "Monthly performance report",
    message: "Please find the monthly performance report attached for your records.",
    time: "Monday",
    category: "No Reply Needed",
    summary: "Monthly performance report shared for reference.",
    reason: "No action or response requested.",
    unread: false,
    priority: "Low",
  },
];

const demoIncomingEmail: EmailItem = {
  id: 6,
  name: "Priya Shah",
  initials: "PS",
  color: "bg-cyan-100 text-cyan-700",
  email: "priya@northstarstudio.test",
  subject: "Could you coordinate a new project check-in?",
  message: "Hi Jayesh, our team has a conflict on Thursday. Could you share two time options for Friday? I’ll confirm which one works for everyone.",
  time: "Just now",
  category: "Assistant to Reply",
  summary: "Priya asked the assistant to coordinate a new project check-in and will confirm a time.",
  reason: "Routine scheduling can be handled by the assistant.",
  unread: true,
  priority: "Medium",
};

function stableNumericId(providerId: string) {
  let hash = 2166136261;
  for (let index = 0; index < providerId.length; index += 1) {
    hash ^= providerId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const value = hash >>> 0;
  return value <= 5 ? value + 6 : value;
}

function mapSyncedEmail(message: SyncedEmail, index: number): EmailItem {
  const palette = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700"];
  const receivedDate = new Date(message.receivedAt);
  const time = Number.isNaN(receivedDate.getTime()) ? "Recently" : receivedDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return {
    id: stableNumericId(message.providerMessageId),
    providerMessageId: message.providerMessageId,
    name: message.fromName || message.fromEmail || "Unknown sender",
    initials: (message.fromName || message.fromEmail || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?",
    color: palette[index % palette.length],
    email: message.fromEmail,
    subject: message.subject,
    message: message.bodyText || message.snippet || "This email has no readable text content.",
    time,
    category: message.classification,
    summary: message.summary || "This message has not been analyzed yet. Use Analyze with AI to review it.",
    reason: message.reason || "AI has not assessed who should reply yet.",
    unread: message.isUnread ?? !message.isRead,
    isUnread: message.isUnread,
    isHandled: message.isHandled,
    isArchived: message.isArchived,
    isImportant: message.isImportant,
    priority: message.priority,
    confidence: message.confidence,
    receivedAt: message.receivedAt,
  };
}

function analyzeDemoEmail(email: EmailItem): EmailAnalysis {
  const text = `${email.subject} ${email.message}`.toLowerCase();
  const asksForDecision = /\b(approval|your decision|your input|your thoughts)\b/.test(text)
    || /\b(?:please|could you|can you|would you)\s+(?:please\s+)?(?:approve|confirm|review|decide)\b/.test(text)
    || /\bconfirm if this works\b/.test(text);
  const needsFollowUp = /\b(schedule|reschedul|coordinate|next steps|follow.?up|availability|appointment|booking|meeting|time options?|time slots?)\b/.test(text);
  const informational = /\b(for your records|no response|no reply|just confirming|received|newsletter|fyi|thank you)\b/.test(text);

  let category: EmailAnalysis["category"] = "Needs review";
  let reason = "The demo rules cannot confidently identify who should respond.";
  let summary = "Review the message and choose who should respond.";
  let confidence = 0.58;
  let priority: EmailAnalysis["priority"] = "Medium";

  if (asksForDecision) {
    category = "Client to Reply";
    reason = "The message asks the client to make a decision or confirm something personally.";
    summary = "The sender is waiting for a personal decision or confirmation from the client.";
    confidence = 0.9;
    priority = "High";
  } else if (needsFollowUp) {
    category = "Assistant to Reply";
    reason = "The message needs a routine scheduling or follow-up response.";
    summary = "The assistant can handle the requested scheduling or next-step follow-up.";
    confidence = 0.86;
  } else if (informational) {
    category = "No Reply Needed";
    reason = "The message shares an update or confirmation without asking for action.";
    summary = "This is an informational update; no reply appears to be needed.";
    confidence = 0.88;
    priority = "Low";
  }

  if (/\b(urgent|asap|today|deadline|time-sensitive)\b/.test(text)) priority = "High";
  return { category, summary, reason, confidence, priority };
}

function createDemoReply(email: EmailItem, category: ReplyCategory) {
  const firstName = email.name.trim().split(/\s+/)[0] || "there";
  const body = category === "Assistant to Reply"
    ? "I’ll coordinate the next steps and share an update as soon as I have one."
    : category === "No Reply Needed"
      ? "Thanks for the update. I appreciate you sharing this with me."
      : category === "Needs review"
        ? "Thanks for reaching out. I’m reviewing this and will follow up shortly."
        : "Thanks for sending this over. I’ll review the details and get back to you shortly.";
  return `Hi ${firstName},\n\n${body}\n\nBest,\nJayesh`;
}

function applySyncedEmailState(
  messages: EmailItem[],
  setInboxMessages: (messages: EmailItem[]) => void,
  setSelectedEmail: (message: EmailItem | null) => void,
  setHandled: (update: (current: number[]) => number[]) => void,
  setArchived: (update: (current: number[]) => number[]) => void,
  setClassificationOverrides: (update: (current: Record<number, ReplyCategory>) => Record<number, ReplyCategory>) => void,
  setUnreadOverrides: (update: (current: Record<number, boolean>) => Record<number, boolean>) => void,
  setImportantOverrides: (update: (current: Record<number, boolean>) => Record<number, boolean>) => void,
) {
  const liveIds = new Set(messages.map((message) => message.id));
  const keepSampleIds = (ids: number[]) => ids.filter((id) => id <= 5 || !liveIds.has(id));
  const keepSampleEntries = <T,>(values: Record<number, T>) => Object.fromEntries(
    Object.entries(values).filter(([id]) => Number(id) <= 5 || !liveIds.has(Number(id))),
  ) as Record<number, T>;

  setInboxMessages(messages);
  setSelectedEmail(messages[0] ?? null);
  setHandled((current) => [...keepSampleIds(current), ...messages.filter((message) => message.isHandled).map((message) => message.id)]);
  setArchived((current) => [...keepSampleIds(current), ...messages.filter((message) => message.isArchived).map((message) => message.id)]);
  setClassificationOverrides((current) => ({
    ...keepSampleEntries(current),
    ...Object.fromEntries(messages.map((message) => [message.id, message.category])),
  }));
  setUnreadOverrides((current) => ({
    ...keepSampleEntries(current),
    ...Object.fromEntries(messages.filter((message) => message.isUnread !== undefined).map((message) => [message.id, message.isUnread!])),
  }));
  setImportantOverrides((current) => ({
    ...keepSampleEntries(current),
    ...Object.fromEntries(messages.filter((message) => message.isImportant !== undefined).map((message) => [message.id, message.isImportant!])),
  }));
}

const categories = [
  { name: "All emails", icon: Inbox },
  { name: "Unread", icon: CircleDot },
  { name: "Assistant to Reply", icon: Send },
  { name: "Client to Reply", icon: Users },
  { name: "No Reply Needed", icon: CheckCircle2 },
  { name: "Needs review", icon: CircleAlert },
  { name: "Important", icon: Star },
  { name: "Action required", icon: CircleAlert },
  { name: "Waiting on reply", icon: Clock3 },
  { name: "Meetings", icon: CalendarDays },
  { name: "Archived", icon: Archive },
];

function loadValue<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : (JSON.parse(saved) as T);
  } catch {
    return fallback;
  }
}

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All emails");
  const [inboxMessages, setInboxMessages] = useState(emails);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(emails[0]);
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [handled, setHandled] = useState<number[]>(() => loadValue("mailpilot-handled-v1", []));
  const [archived, setArchived] = useState<number[]>(() => loadValue("mailpilot-archived-v1", []));
  const [classificationOverrides, setClassificationOverrides] = useState<Record<number, ReplyCategory>>(() => loadValue("mailpilot-classifications-v1", {}));
  const [unreadOverrides, setUnreadOverrides] = useState<Record<number, boolean>>(() => loadValue("mailpilot-unread-v1", {}));
  const [importantOverrides, setImportantOverrides] = useState<Record<number, boolean>>(() => loadValue("mailpilot-important-v1", {}));
  const [demoConnection, setDemoConnection] = useState<DemoConnection | null>(() => loadValue("mailpilot-demo-connection-v1", null));
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedDemoProvider, setSelectedDemoProvider] = useState<DemoProvider>("Gmail");
  const [draft, setDraft] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [currentDate] = useState(() => new Date());
  const greeting = currentDate.getHours() < 12 ? "Good morning" : currentDate.getHours() < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const pageTitle = pathname === "/client"
      ? "Client workspace · MailPilot AI"
      : pathname === "/"
        ? "Smart inbox · MailPilot AI"
        : "Page not found · MailPilot AI";
    document.title = pageTitle;
    const description = pathname === "/client"
      ? "A focused client inbox showing conversations that need a personal reply, with summaries and simple actions."
      : "MailPilot helps personal assistants organize inboxes, surface important conversations, and keep client communication moving.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.append(meta);
    }
    meta.setAttribute("content", description);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    getIntegrationStatus().then((status) => {
      if (!active) return;
      setIntegrationStatus(status);
    }).catch(() => {
      if (active) setIntegrationStatus(null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const storedValues: [string, unknown][] = [
      ["mailpilot-handled-v1", handled],
      ["mailpilot-archived-v1", archived],
      ["mailpilot-classifications-v1", classificationOverrides],
      ["mailpilot-unread-v1", unreadOverrides],
      ["mailpilot-important-v1", importantOverrides],
    ];
    try {
      storedValues.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    } catch {
      // Interactive state stays available until the page is closed.
    }
  }, [handled, archived, classificationOverrides, unreadOverrides, importantOverrides]);

  const getCategory = (email: EmailItem) => classificationOverrides[email.id] ?? email.category;
  const isUnread = (email: EmailItem) => unreadOverrides[email.id] ?? email.unread;
  const isImportant = (email: EmailItem) => importantOverrides[email.id] ?? email.isImportant ?? email.priority === "High";

  const getFilteredEmails = (category: string, searchText: string, categoryOverrides = classificationOverrides) => inboxMessages.filter((email) => {
      const replyCategory = categoryOverrides[email.id] ?? email.category;
      const matchesCategory =
        category === "All emails" ? !archived.includes(email.id)
          : category === "Archived" ? archived.includes(email.id)
          : archived.includes(email.id) ? false
          : category === "Unread" ? isUnread(email)
          : category === "Important" ? isImportant(email)
          : category === "Action required" ? replyCategory !== "No Reply Needed"
          : category === "Needs review" ? replyCategory === "Needs review"
          : category === "Waiting on reply" ? email.waitingOnResponse === true
          : category === "Meetings" ? email.subject.toLowerCase().includes("meeting")
          : replyCategory === category;

      const query = searchText.toLowerCase();
      const matchesSearch =
        email.subject.toLowerCase().includes(query) ||
        email.name.toLowerCase().includes(query) ||
        email.email.toLowerCase().includes(query) ||
        email.message.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

  const filteredEmails = getFilteredEmails(activeCategory, search);
  const connectionLabel = integrationStatus?.gmail.connected
    ? `Gmail connected · ${integrationStatus.gmail.email ?? "connected account"}`
    : demoConnection
      ? `${demoConnection.provider} demo · ${demoConnection.address}`
      : "Sample inbox · local demo data";
  const setInboxFilters = (category: string, searchText = search) => {
    setActiveCategory(category);
    setSearch(searchText);
    const matches = getFilteredEmails(category, searchText);
    if (!matches.some((email) => email.id === selectedEmail?.id)) {
      setSelectedEmail(matches[0] ?? null);
      setShowDraft(false);
    }
  };

  const count = (category: string) => inboxMessages.filter((email) => getCategory(email) === category && !archived.includes(email.id)).length;
  const categoryCounts: Record<string, number> = {
    "All emails": inboxMessages.length - archived.length,
    Unread: inboxMessages.filter((email) => isUnread(email) && !archived.includes(email.id)).length,
    "Assistant to Reply": count("Assistant to Reply"),
    "Client to Reply": count("Client to Reply"),
    "No Reply Needed": count("No Reply Needed"),
    "Needs review": count("Needs review"),
    Important: inboxMessages.filter((email) => isImportant(email) && !archived.includes(email.id)).length,
    "Action required": count("Client to Reply") + count("Assistant to Reply") + count("Needs review"),
    "Waiting on reply": inboxMessages.filter((email) => email.waitingOnResponse && !archived.includes(email.id)).length,
    Meetings: inboxMessages.filter((email) => email.subject.toLowerCase().includes("meeting") && !archived.includes(email.id)).length,
    Archived: archived.length,
  };

  const openConnectionDialog = () => {
    setSelectedDemoProvider(demoConnection?.provider ?? "Gmail");
    setConnectDialogOpen(true);
  };

  const connectDemoInbox = () => {
    const connection: DemoConnection = {
      provider: selectedDemoProvider,
      address: selectedDemoProvider === "Gmail" ? "jayesh@demo.mailpilot.test" : "jayesh@demo.outlook.test",
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("mailpilot-demo-connection-v1", JSON.stringify(connection));
      setDemoConnection(connection);
      setInboxMessages(emails);
      setSelectedEmail(emails[0] ?? null);
      setConnectDialogOpen(false);
      setNotice({ message: `Demo ${connection.provider} inbox connected. Sample conversations are ready.` });
    } catch {
      setNotice({ message: "The demo connection could not be saved in this browser. Check browser storage and try again.", error: true });
    }
  };

  const disconnectDemoInbox = () => {
    try {
      localStorage.removeItem("mailpilot-demo-connection-v1");
      setDemoConnection(null);
      setConnectDialogOpen(false);
      setNotice({ message: "Demo inbox disconnected. Your sample messages are still available." });
    } catch {
      setNotice({ message: "The demo inbox could not be disconnected. Check browser storage and try again.", error: true });
    }
  };

  const syncInbox = async () => {
    setSyncing(true);
    try {
      if (integrationStatus?.gmail.connected) {
        const result = await syncGmail();
        const syncedMessages = result.messages.map(mapSyncedEmail);
        applySyncedEmailState(syncedMessages, setInboxMessages, setSelectedEmail, setHandled, setArchived, setClassificationOverrides, setUnreadOverrides, setImportantOverrides);
        const status = await getIntegrationStatus();
        setIntegrationStatus(status);
        setNotice({ message: syncedMessages.length ? `Synced ${syncedMessages.length} Gmail messages.` : "Gmail sync finished. Your inbox is empty." });
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        const syncedIncoming = { ...demoIncomingEmail, ...analyzeDemoEmail(demoIncomingEmail) };
        const alreadySynced = inboxMessages.some((email) => email.id === syncedIncoming.id);
        setInboxMessages((current) => current.some((email) => email.id === syncedIncoming.id) ? current : [syncedIncoming, ...current]);
        setSelectedEmail((current) => current?.id === syncedIncoming.id ? current : (current ?? syncedIncoming));
        if (demoConnection) {
          const updatedConnection = { ...demoConnection, lastSyncAt: new Date().toISOString() };
          localStorage.setItem("mailpilot-demo-connection-v1", JSON.stringify(updatedConnection));
          setDemoConnection(updatedConnection);
        }
        setNotice({ message: alreadySynced ? "Demo sync complete. Your sample inbox is up to date." : "Demo sync complete. A new sample email was automatically classified." });
      }
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "Inbox sync failed.", error: true });
    } finally {
      setSyncing(false);
    }
  };

  const analyzeSelectedEmail = async () => {
    if (!selectedEmail) return;
    setAnalyzingId(selectedEmail.id);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 280));
      const analysis = analyzeDemoEmail(selectedEmail);
      const updatedEmail = { ...selectedEmail, category: analysis.category, summary: analysis.summary, reason: analysis.reason, confidence: analysis.confidence, priority: analysis.priority };
      setInboxMessages((previous) => previous.map((email) => email.id === updatedEmail.id ? updatedEmail : email));
      setSelectedEmail(updatedEmail);
      setClassificationOverrides((previous) => ({ ...previous, [updatedEmail.id]: analysis.category }));
      setNotice({ message: analysis.category === "Needs review" ? "Demo analysis suggests review. Confirm who should reply." : "Demo analysis complete. Review or change the suggested reply owner." });
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "AI analysis failed.", error: true });
    } finally {
      setAnalyzingId(null);
    }
  };

  const selectEmail = (email: EmailItem) => {
    setSelectedEmail(email);
    setShowDraft(false);
    setNotificationsOpen(false);
    setUnreadOverrides((previous) => ({ ...previous, [email.id]: false }));
    persistMessageState(email.id, { isUnread: false });
  };

  const markHandled = (emailId: number) => {
    setHandled((previous) => previous.includes(emailId) ? previous : [...previous, emailId]);
    persistMessageState(emailId, { isHandled: true });
    setNotice({ message: "Conversation marked as handled." });
  };

  const updateClassification = (emailId: number, nextCategory: ReplyCategory) => {
    const updatedOverrides = { ...classificationOverrides, [emailId]: nextCategory };
    setClassificationOverrides(updatedOverrides);
    const matches = getFilteredEmails(activeCategory, search, updatedOverrides);
    if (!matches.some((email) => email.id === selectedEmail?.id)) {
      setSelectedEmail(matches[0] ?? null);
      setShowDraft(false);
    }
    persistMessageState(emailId, { classification: nextCategory });
    setNotice({ message: `Classification updated to “${nextCategory}”.` });
  };

  const persistMessageState = (emailId: number, state: Parameters<typeof saveMessageState>[1]) => {
    const email = inboxMessages.find((item) => item.id === emailId);
    if (!email?.providerMessageId) return;
    saveMessageState(email.providerMessageId, state).catch((error: unknown) => {
      setNotice({ message: error instanceof Error ? error.message : "Could not save this Gmail message update.", error: true });
    });
  };

  const toggleImportant = (email: EmailItem) => {
    const value = !isImportant(email);
    setImportantOverrides((previous) => ({ ...previous, [email.id]: value }));
    persistMessageState(email.id, { isImportant: value });
  };

  const toggleUnread = (email: EmailItem) => {
    const value = !isUnread(email);
    setUnreadOverrides((previous) => ({ ...previous, [email.id]: value }));
    persistMessageState(email.id, { isUnread: value });
  };

  const toggleArchive = (email: EmailItem) => {
    const wasArchived = archived.includes(email.id);
    setArchived((previous) => wasArchived ? previous.filter((id) => id !== email.id) : [...previous, email.id]);
    if (selectedEmail?.id === email.id) {
      const nextEmail = getFilteredEmails(activeCategory, search).find((item) => item.id !== email.id);
      setSelectedEmail(nextEmail ?? null);
      setShowDraft(false);
    }
    persistMessageState(email.id, { isArchived: !wasArchived });
    setNotice({ message: wasArchived ? "Conversation restored to the inbox." : "Conversation moved to archive." });
  };

  const saveComposeDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComposeError("");
    const nextDraft = { id: Date.now(), to: composeTo.trim(), subject: composeSubject.trim(), body: composeBody.trim(), savedAt: new Date().toISOString() };
    try {
      const saved = loadValue<typeof nextDraft[]>("mailpilot-compose-drafts-v1", []);
      localStorage.setItem("mailpilot-compose-drafts-v1", JSON.stringify([nextDraft, ...saved]));
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setNotice({ message: "Draft saved to this browser. No email was sent." });
    } catch {
      setComposeError("This draft could not be saved. Check that browser storage is available and try again.");
    }
  };

  const saveReplyDraft = () => {
    if (!selectedEmail) return;
    try {
      const saved = loadValue<Array<{ id: number; to: string; subject: string; body: string; savedAt: string }>>("mailpilot-compose-drafts-v1", []);
      localStorage.setItem("mailpilot-compose-drafts-v1", JSON.stringify([
        { id: Date.now(), to: selectedEmail.email, subject: `Re: ${selectedEmail.subject}`, body: draft, savedAt: new Date().toISOString() },
        ...saved,
      ]));
      setNotice({ message: "Reply draft saved locally. Review it before sending from your email account." });
    } catch {
      setNotice({ message: "This reply draft could not be saved. Check browser storage and try again.", error: true });
    }
  };

  if (pathname === "/client") {
    return (
      <ClientWorkspace
        emails={inboxMessages}
        connectionLabel={connectionLabel}
        categories={Object.fromEntries(inboxMessages.map((email) => [email.id, getCategory(email)]))}
        handledIds={handled}
        archivedIds={archived}
        onMarkHandled={markHandled}
        onDelegateToAssistant={(emailId) => updateClassification(emailId, "Assistant to Reply")}
        onReturnToAssistant={() => navigate("/")}
      />
    );
  }

  if (pathname !== "/") return <NotFound />;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f7f8fc] text-slate-800">

      {/* Mobile overlay */}
      {mobileMenu && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[250px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${mobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-[76px] px-6 flex items-center justify-between border-b border-slate-100">
          <Link to="/" onClick={() => { setInboxFilters("All emails", ""); setMobileMenu(false); }} className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">MailPilot<span className="text-indigo-600">.</span></h1>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase">AI Workspace</p>
            </div>
          </Link>
            <button aria-label="Close navigation menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileMenu(false)}><X size={19}/></button>
        </div>

        <div className="p-4">
          <button onClick={() => setComposeOpen(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-indigo-100 transition">
            <Plus size={17}/> Compose email
          </button>
        </div>

        <div className="px-4 flex-1 overflow-y-auto">
          <p className="px-3 mb-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>

          <button onClick={() => { navigate("/"); setInboxFilters("All emails", ""); setMobileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm mb-1">
            <LayoutDashboard size={17}/> Overview
          </button>

          <button onClick={() => { navigate("/client"); setMobileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 transition hover:bg-slate-50 hover:text-indigo-700 mb-1">
            <BriefcaseBusiness size={17}/> Client workspace
          </button>

          <p className="px-3 mb-3 mt-7 text-[10px] font-bold uppercase tracking-widest text-slate-400">Smart inbox</p>

          {categories.map((item) => {
            const Icon = item.icon;
            const active = activeCategory === item.name;
            const badgeCount = categoryCounts[item.name] ?? 0;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setInboxFilters(item.name);
                  setMobileMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm mb-1 transition ${active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <span className="flex items-center gap-3"><Icon size={17}/>{item.name}</span>
                <span className={`text-xs ${active ? "text-indigo-600" : "text-slate-400"}`}>{badgeCount}</span>
              </button>
            );
          })}

          <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Sparkles size={20} className="mb-3"/>
            <p className="text-sm font-semibold">Local triage demo</p>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">Sample messages are classified locally. Review or change who should reply from any conversation.</p>
          </div>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="w-full flex items-center gap-3 p-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">JG</div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">Jayesh Gothwal</p>
              <p className="text-xs text-slate-400">Personal workspace</p>
            </div>
            <span className="text-[10px] rounded-full bg-slate-100 px-2 py-1 text-slate-500">Assistant</span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button aria-label="Open navigation menu" aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100"><Menu size={21}/></button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold sm:text-lg">{greeting}, Jayesh 👋</h2>
              <p className="hidden truncate text-xs text-slate-400 sm:block">{connectionLabel}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-slate-400"/>AI demo mode · local
            </div>
            <div className="relative">
              <button aria-label={`${inboxMessages.filter(isUnread).length} unread notifications`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-lg p-2 hover:bg-slate-100">
                <Bell size={19}/>{inboxMessages.some(isUnread) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500"/>}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-full z-30 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div><p className="text-sm font-bold">Unread emails</p><p className="text-xs text-slate-400">{inboxMessages.filter(isUnread).length} need a look</p></div>
                      <button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16}/></button>
                    </div>
                    {inboxMessages.filter(isUnread).length ? inboxMessages.filter(isUnread).map((email) => (
                      <button key={email.id} onClick={() => { selectEmail(email); setActiveCategory("All emails"); setSearch(""); }} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${email.color}`}>{email.initials}</span>
                        <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{email.name}</span><span className="block truncate text-xs text-slate-500">{email.subject}</span></span>
                      </button>
                    )) : <p className="p-5 text-center text-sm text-slate-500">You’re all caught up.</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 sm:flex">JG</div>
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-[1500px] mx-auto">
          <AnimatePresence>
            {notice && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={notice.error ? "alert" : "status"} className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${notice.error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                {notice.error ? <CircleAlert size={17} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={17} className="mt-0.5 shrink-0"/>}
                <span className="flex-1">{notice.message}</span>
                <button aria-label="Dismiss message" onClick={() => setNotice(null)} className="rounded p-0.5 hover:bg-black/5"><X size={16}/></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page heading */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(currentDate)}</p>
              <h2 className="text-2xl font-bold tracking-tight">Inbox overview</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"><CalendarDays size={16}/> Today</div>
              {integrationStatus?.gmail.connected ? (
                <button onClick={syncInbox} disabled={syncing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"><RefreshCw size={15} className={syncing ? "animate-spin" : ""}/>{syncing ? "Syncing…" : "Sync Gmail"}</button>
              ) : demoConnection ? (
                <div className="flex items-center gap-2">
                  <button onClick={syncInbox} disabled={syncing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"><RefreshCw size={15} className={syncing ? "animate-spin" : ""}/>{syncing ? "Syncing…" : "Sync demo inbox"}</button>
                  <button onClick={openConnectionDialog} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Manage</button>
                </div>
              ) : (
                <button onClick={openConnectionDialog} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"><Mail size={15}/> Connect demo inbox</button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
            {[
              { label: "Total emails", value: inboxMessages.length - archived.length, detail: "Across all categories", icon: Mail, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Unread", value: inboxMessages.filter(isUnread).length, detail: "Waiting in your inbox", icon: Eye, color: "text-sky-600", bg: "bg-sky-50" },
              { label: "Client to reply", value: count("Client to Reply"), detail: "Needs your attention", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Assistant to reply", value: count("Assistant to Reply"), detail: "AI can handle these", icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-slate-500">{stat.label}</span>
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}><Icon size={18}/></span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{stat.value.toString().padStart(2,"0")}</p>
                  <p className="text-xs text-slate-400 mt-2">{stat.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Inbox and intelligence */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-5">

            {/* Email list */}
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-base">Smart inbox</h3>
                    <p className="text-xs text-slate-400 mt-1">Your conversations, intelligently organized</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{filteredEmails.length} shown</span>
                </div>
                <div className="relative">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    aria-label="Search emails, people, or message text"
                    value={search}
                    onChange={(e) => setInboxFilters(activeCategory, e.target.value)}
                    placeholder="Search emails or people..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pb-1">
                  {["All emails","Client to Reply","Assistant to Reply","No Reply Needed","Needs review"].map((category) => (
                    <button
                      key={category}
                      onClick={() => setInboxFilters(category)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${activeCategory === category ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >{category}</button>
                  ))}
                </div>
              </div>

              <div>
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`w-full min-w-0 text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition ${selectedEmail?.id === email.id ? "bg-indigo-50/60" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${email.color}`}>{email.initials}{isUnread(email) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-600"/>}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <p className={`text-sm truncate ${isUnread(email) ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>{email.name}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{email.time}</span>
                        </div>
                        <p className="text-sm font-semibold truncate mt-1">{email.subject}</p>
                        <p className="text-xs text-slate-400 truncate mt-1">{email.message}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${getCategory(email) === "Client to Reply" ? "bg-amber-50 text-amber-700" : getCategory(email) === "Assistant to Reply" ? "bg-violet-50 text-violet-700" : getCategory(email) === "Needs review" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>{getCategory(email)}</span>
                          {isImportant(email) && <span className="text-[10px] px-2 py-1 rounded-md bg-rose-50 text-rose-600 font-semibold">Important</span>}
                          {handled.includes(email.id) && <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">Handled</span>}
                          {archived.includes(email.id) && <span className="text-[10px] px-2 py-1 rounded-md bg-slate-100 text-slate-600">Archived</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredEmails.length === 0 && <div className="p-10 text-center"><p className="text-sm font-semibold text-slate-700">No matching emails</p><p className="mt-1 text-xs text-slate-400">Try another category or clear your search.</p><button onClick={() => setInboxFilters("All emails", "")} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Clear filters</button></div>}
              </div>
            </section>

            {/* AI Intelligence panel */}
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden h-fit">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles size={19}/></div>
                  <div>
                    <h3 className="font-bold text-sm">Email intelligence</h3>
                    <p className="text-[10px] text-slate-400">Local demo analysis · sample conversation</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{selectedEmail?.confidence != null ? "Demo analyzed" : "Ready to analyze"}</span>
              </div>

              <div className="p-5">
                {selectedEmail ? (
                  <>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${selectedEmail.color}`}>{selectedEmail.initials}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{selectedEmail.name}</p>
                    <a href={`mailto:${selectedEmail.email}`} className="block truncate text-xs text-indigo-600 hover:underline">{selectedEmail.email}</a>
                  </div>
                </div>

                <h4 className="font-bold text-base leading-snug">{selectedEmail.subject}</h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedEmail.time} · {selectedEmail.providerMessageId ? "synced from Gmail" : "sample message"}</p>

                <div className="mt-5 rounded-xl bg-indigo-50/70 border border-indigo-100 p-4">
                  <div className="flex items-center gap-2 text-indigo-700 mb-2"><Sparkles size={15}/><span className="text-xs font-bold">AI summary</span></div>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedEmail.summary}</p>
                </div>

                  <div className="mt-4">
                    <button onClick={analyzeSelectedEmail} disabled={analyzingId === selectedEmail.id} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60">
                      <Sparkles size={15}/>{analyzingId === selectedEmail.id ? "Analyzing sample…" : "Run demo analysis"}
                    </button>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Uses local demo rules. No email content is sent to an AI service.</p>
                  </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label htmlFor="responsibility" className="text-xs font-bold uppercase tracking-wider text-slate-400">Reply responsibility</label>
                    <span className={`text-[10px] font-semibold ${getCategory(selectedEmail) === "Needs review" || selectedEmail.id === 4 ? "text-amber-600" : "text-emerald-600"}`}>{selectedEmail.confidence !== undefined && selectedEmail.confidence !== null ? `AI confidence · ${Math.round(selectedEmail.confidence * 100)}%` : selectedEmail.id === 4 ? "Review suggested · 78%" : selectedEmail.providerMessageId ? "Needs analysis" : "Demo confidence · 96%"}</span>
                  </div>
                  <select id="responsibility" value={getCategory(selectedEmail)} onChange={(event) => updateClassification(selectedEmail.id, event.target.value as ReplyCategory)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option>Assistant to Reply</option>
                    <option>Client to Reply</option>
                    <option>No Reply Needed</option>
                    <option>Needs review</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Classification can be corrected here and shared with the client workspace.</p>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">{selectedEmail.reason}</p>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Original message</p>
                  <p className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{selectedEmail.message}</p>
                </div>

                {showDraft && (
                  <div className="mt-5">
                    <label htmlFor="reply-draft" className="text-xs font-bold text-slate-500">Reply draft · review before sending</label>
                    <textarea
                      id="reply-draft"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full mt-2 min-h-28 border border-indigo-200 bg-indigo-50/30 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-400">Saved in this browser only.</p>
                      <button onClick={saveReplyDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Save size={13}/> Save draft</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => {
                      setDraft(createDemoReply(selectedEmail, getCategory(selectedEmail)));
                      setShowDraft(true);
                      setNotice({ message: "A demo reply draft is ready to edit. No email was sent." });
                    }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-semibold transition"
                  ><Reply size={15}/> Draft reply</button>
                  <button
                    onClick={() => markHandled(selectedEmail.id)}
                    className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 rounded-xl py-3 text-xs font-semibold transition"
                  ><CheckCircle2 size={15}/> Mark handled</button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => toggleImportant(selectedEmail)} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"><Star size={14} className={isImportant(selectedEmail) ? "fill-amber-400 text-amber-500" : ""}/>{isImportant(selectedEmail) ? "Remove important" : "Mark important"}</button>
                  <button onClick={() => toggleUnread(selectedEmail)} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">{isUnread(selectedEmail) ? <EyeOff size={14}/> : <Eye size={14}/>} Mark {isUnread(selectedEmail) ? "read" : "unread"}</button>
                  <button onClick={() => toggleArchive(selectedEmail)} className="col-span-2 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">{archived.includes(selectedEmail.id) ? <ArchiveRestore size={14}/> : <Archive size={14}/>} {archived.includes(selectedEmail.id) ? "Restore from archive" : "Archive conversation"}</button>
                </div>
                  </>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Mail size={21}/></span>
                    <h3 className="font-semibold text-slate-800">No email selected</h3>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Choose a sample conversation from the inbox to review its details.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <footer className="flex flex-col gap-2 border-t border-slate-200 py-7 text-center text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>© {currentDate.getFullYear()} MailPilot AI · Assistant workspace</p>
            <p>{demoConnection ? `${demoConnection.provider} demo inbox` : "Sample email data"} · Local AI demo</p>
          </footer>
        </div>
      </main>

      <AnimatePresence>
        {connectDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectDialogOpen(false); }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          >
            <motion.section
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="connect-demo-heading"
              className="w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="connect-demo-heading" className="text-lg font-bold text-slate-900">{demoConnection ? "Manage demo inbox" : "Connect a demo inbox"}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Choose a provider to simulate. This uses sample messages only and never opens or accesses your real email account.</p>
                </div>
                <button aria-label="Close inbox setup" onClick={() => setConnectDialogOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["Gmail", "Outlook"] as const).map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    aria-pressed={selectedDemoProvider === provider}
                    onClick={() => setSelectedDemoProvider(provider)}
                    className={`rounded-2xl border p-4 text-left transition ${selectedDemoProvider === provider ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`}
                  >
                    <span className="block text-sm font-bold text-slate-800">{provider}</span>
                    <span className="mt-1 block text-xs text-slate-500">Sample account · demo</span>
                  </button>
                ))}
              </div>
              {demoConnection && <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600">Connected: <span className="font-semibold">{demoConnection.provider} demo · {demoConnection.address}</span></p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {demoConnection ? <button type="button" onClick={disconnectDemoInbox} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">Disconnect demo inbox</button> : <span />}
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button type="button" onClick={() => setConnectDialogOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={connectDemoInbox} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"><Mail size={15}/> Connect demo {selectedDemoProvider}</button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {composeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setComposeOpen(false); }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
            <motion.section initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="compose-heading" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div><h2 id="compose-heading" className="text-lg font-bold text-slate-900">Compose a draft</h2><p className="mt-1 text-xs text-slate-500">Saved only in this browser. This demo does not send email.</p></div>
                <button aria-label="Close compose window" onClick={() => { setComposeOpen(false); setComposeError(""); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
              </div>
              <form onSubmit={saveComposeDraft} className="space-y-4">
                <div><label htmlFor="compose-to" className="mb-1.5 block text-xs font-semibold text-slate-600">To</label><input id="compose-to" type="email" required value={composeTo} onChange={(event) => setComposeTo(event.target.value)} placeholder="name@example.com" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></div>
                <div><label htmlFor="compose-subject" className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</label><input id="compose-subject" required value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></div>
                <div><label htmlFor="compose-body" className="mb-1.5 block text-xs font-semibold text-slate-600">Message</label><textarea id="compose-body" required rows={6} value={composeBody} onChange={(event) => setComposeBody(event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></div>
                {composeError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{composeError}</p>}
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => setComposeOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Save size={15}/> Save draft</button></div>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
