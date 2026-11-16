import { motion } from "motion/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-12 text-slate-800">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10"
      >
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Sparkles size={23} /></span>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Page not found</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">We can’t find that page.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">That link doesn’t lead to a MailPilot page. Head back to your workspace and we’ll get you sorted.</p>
        <Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
          <ArrowLeft size={16} /> Back to MailPilot
        </Link>
      </motion.section>
    </main>
  );
}
