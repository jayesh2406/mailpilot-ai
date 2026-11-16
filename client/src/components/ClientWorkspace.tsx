import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, Check, CheckCheck, ChevronDown, CircleHelp,
  Clock3, Mail, MessageSquareText, Sparkles, UserRound, Users, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { initialClients } from "../data/clients";
import type { ClientRecord } from "../data/clients";

export type ReplyCategory = "Assistant to Reply" | "Client to Reply" | "No Reply Needed" | "Needs review";

export type WorkspaceEmail = {
  id: number;
  name: string;
  initials: string;
  color: string;
  email: string;
  subject: string;
  message: string;
  time: string;
  category: ReplyCategory;
  summary: string;
  reason: string;
  providerMessageId?: string;
  receivedAt?: string;
};

type ClientWorkspaceProps = {
  emails: WorkspaceEmail[];
  connectionLabel: string;
  categories: Record<number, ReplyCategory>;
  handledIds: number[];
  archivedIds: number[];
  onMarkHandled: (emailId: number) => void;
  onDelegateToAssistant: (emailId: number) => void;
  onReturnToAssistant: () => void;
};

function formatDate(time: string, receivedAt?: string) {
  const date = receivedAt ? new Date(receivedAt) : new Date();
  if (!receivedAt && time === "Yesterday") date.setDate(date.getDate() - 1);
  if (!receivedAt && time === "Monday") {
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - (daysSinceMonday || 7));
  }
  if (Number.isNaN(date.getTime())) return time;
  const dateLabel = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
  return `${dateLabel}${/\b(am|pm)\b/i.test(time) ? ` · ${time}` : ""}`;
}

function statusStyles(category: ReplyCategory) {
  if (category === "Client to Reply") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (category === "Assistant to Reply") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (category === "Needs review") return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default function ClientWorkspace({
  emails,
  connectionLabel,
  categories,
  handledIds,
  archivedIds,
  onMarkHandled,
  onDelegateToAssistant,
  onReturnToAssistant,
}: ClientWorkspaceProps) {
  const [clientId, setClientId] = useState(initialClients[0]?.id ?? "");
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentYear] = useState(() => new Date().getFullYear());
  const client = initialClients.find((item) => item.id === clientId) ?? initialClients[0];

  const clientEmails = useMemo(() => {
    if (!client) return [];
    return emails
      .filter((email) => email.email === client.email)
      .filter((email) => categories[email.id] === "Client to Reply" && !handledIds.includes(email.id) && !archivedIds.includes(email.id));
  }, [client, emails, categories, handledIds, archivedIds]);

  const selectedEmail = clientEmails.find((email) => email.id === selectedEmailId) ?? clientEmails[0];
  const handledCount = emails.filter((email) => email.email === client?.email && handledIds.includes(email.id)).length;

  const chooseClient = (record: ClientRecord) => {
    setClientId(record.id);
    setSelectedEmailId(null);
    setSwitcherOpen(false);
    setNotice("");
  };

  const markHandled = (emailId: number) => {
    onMarkHandled(emailId);
    setNotice("Marked as handled. Your assistant can see the update.");
    setSelectedEmailId(null);
  };

  const delegateToAssistant = (emailId: number) => {
    onDelegateToAssistant(emailId);
    setNotice("Delegated to your assistant. This conversation is now in the assistant’s inbox.");
    setSelectedEmailId(null);
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-screen overflow-x-hidden bg-[#f7f8fc] text-slate-800"
    >
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1080px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500" aria-label="MailPilot assistant dashboard">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles size={19} /></span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-tight">MailPilot<span className="text-indigo-600">.</span></span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-400">Client workspace</span>
            </span>
          </Link>

          <button
            onClick={onReturnToAssistant}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Assistant view</span><span className="sm:hidden">Assistant</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600"><UserRound size={14} /> Your personal inbox</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">A clearer view of what needs you.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Only conversations that need your personal attention appear here. Your assistant keeps the rest moving.</p>
          </div>

          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setSwitcherOpen((open) => !open)}
              aria-expanded={switcherOpen}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-indigo-200 sm:min-w-[250px]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{client?.name.split(" ").map((part) => part[0]).join("")}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Previewing as</span>
                <span className="block truncate text-sm font-semibold text-slate-800">{client?.name}</span>
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            <AnimatePresence>
              {switcherOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl sm:min-w-[270px]"
                >
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Demo client accounts</p>
                  {initialClients.map((record) => (
                    <button key={record.id} onClick={() => chooseClient(record)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">{record.name.split(" ").map((part) => part[0]).join("")}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{record.name}</span><span className="block truncate text-xs text-slate-400">{record.company}</span></span>
                      {record.id === clientId && <Check size={15} className="text-indigo-600" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MessageSquareText size={19} /></span>
            <span><span className="block text-xl font-bold text-slate-900">{clientEmails.length.toString().padStart(2, "0")}</span><span className="block text-xs text-slate-500">Need your reply</span></span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCheck size={19} /></span>
            <span><span className="block text-xl font-bold text-slate-900">{handledCount.toString().padStart(2, "0")}</span><span className="block text-xs text-slate-500">Handled by you</span></span>
          </div>
        </div>

        <AnimatePresence>
          {notice && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCheck size={17} className="mt-0.5 shrink-0" />
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-emerald-100"><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
          <section aria-labelledby="needs-attention-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 id="needs-attention-heading" className="font-bold text-slate-900">Needs your attention</h2>
                <p className="mt-1 text-xs text-slate-400">Reviewed and sorted by your assistant</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700"><Sparkles size={12} /> AI sorted</span>
            </div>

            {clientEmails.length ? (
              <div className="divide-y divide-slate-100">
                {clientEmails.map((email) => (
                  <motion.button
                    key={email.id}
                    layout
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 sm:p-5 ${selectedEmail?.id === email.id ? "bg-indigo-50/60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${email.color}`}>{email.initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="text-sm font-bold text-slate-800">{email.name}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(email.time, email.receivedAt)}</span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-slate-700">{email.subject}</span>
                        <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-slate-500">{email.summary}</span>
                        <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyles(categories[email.id])}`}>{categories[email.id]}</span>
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center sm:px-10">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCheck size={22} /></span>
                <h3 className="font-semibold text-slate-800">You’re all caught up</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">There are no open conversations waiting for your personal reply.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="conversation-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {selectedEmail ? (
              <div>
                <div className="border-b border-slate-100 p-4 sm:p-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversation details</p>
                  <h2 id="conversation-heading" className="text-lg font-bold leading-snug text-slate-900">{selectedEmail.subject}</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selectedEmail.color}`}>{selectedEmail.initials}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{selectedEmail.name}</p>
                      <a href={`mailto:${selectedEmail.email}`} className="block truncate text-xs text-indigo-600 hover:underline">{selectedEmail.email}</a>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatDate(selectedEmail.time, selectedEmail.receivedAt)}</span>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                    <div className="mb-2 flex items-center gap-2 text-indigo-700"><Sparkles size={15} /><h3 className="text-xs font-bold">Quick summary</h3></div>
                    <p className="text-sm leading-6 text-slate-600">{selectedEmail.summary}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-amber-700"><CircleHelp size={15} /><h3 className="text-xs font-bold">Why you’re seeing this</h3></div>
                    <p className="text-sm leading-6 text-slate-600">{selectedEmail.reason}</p>
                  </div>
                  <details className="group rounded-xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2"><Mail size={15} className="text-slate-400" /> Read original message</span><ChevronDown size={15} className="text-slate-400 transition group-open:rotate-180" />
                    </summary>
                    <p className="border-t border-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">{selectedEmail.message}</p>
                  </details>

                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    <button onClick={() => markHandled(selectedEmail.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"><Check size={16} /> Mark handled</button>
                    <button onClick={() => delegateToAssistant(selectedEmail.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Users size={16} /> Delegate to assistant</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Clock3 size={21} /></span>
                <h2 id="conversation-heading" className="font-semibold text-slate-800">Nothing needs your attention</h2>
                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">New requests for your input will appear here. Your assistant can handle routine follow-ups.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} MailPilot AI · A focused space for your attention.</p>
          <p className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {connectionLabel}</p>
        </footer>
      </div>
    </motion.main>
  );
}
