export type ClientStatus = "Active" | "Prospect" | "At risk";

export type ClientNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: ClientStatus;
  project: string;
  nextFollowUp: string;
  followUpComplete: boolean;
  notes: ClientNote[];
};

export const initialClients: ClientRecord[] = [
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    company: "Design Studio",
    email: "sarah@designstudio.com",
    status: "Active",
    project: "Website redesign",
    nextFollowUp: "2026-11-17",
    followUpComplete: false,
    notes: [
      { id: "sarah-note-1", text: "Review final pricing and timeline before the project meeting.", createdAt: "2026-11-16T08:30:00.000Z" },
    ],
  },
  {
    id: "michael-chen",
    name: "Michael Chen",
    company: "TechFlow",
    email: "michael@techflow.io",
    status: "Prospect",
    project: "Partnership discussion",
    nextFollowUp: "2026-11-20",
    followUpComplete: false,
    notes: [
      { id: "michael-note-1", text: "Send the partnership next steps by Friday.", createdAt: "2026-11-16T07:50:00.000Z" },
    ],
  },
  {
    id: "emily-parker",
    name: "Emily Parker",
    company: "Marketing Co.",
    email: "emily@marketing.co",
    status: "Active",
    project: "Campaign assets",
    nextFollowUp: "2026-11-23",
    followUpComplete: false,
    notes: [],
  },
  {
    id: "david-wilson",
    name: "David Wilson",
    company: "Startup",
    email: "david@startup.com",
    status: "At risk",
    project: "Project check-in",
    nextFollowUp: "2026-11-16",
    followUpComplete: false,
    notes: [
      { id: "david-note-1", text: "Confirm the new Thursday meeting time.", createdAt: "2026-11-15T11:00:00.000Z" },
    ],
  },
  {
    id: "alex-morgan",
    name: "Alex Morgan",
    company: "Company",
    email: "alex@company.com",
    status: "Active",
    project: "Monthly reporting",
    nextFollowUp: "2026-11-30",
    followUpComplete: false,
    notes: [],
  },
];
