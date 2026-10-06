"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, LoaderCircle, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Employee = { id: string; fullName: string; email: string };
type Shift = { id: string; clockIn: number; clockOut: number | null };
type TimesheetResponse = { employee: Employee; shifts: Shift[]; weekStart: number; error?: string };

async function fetchTimesheet() {
  const response = await fetch("/api/shifts", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) return null;
  const data = await response.json() as TimesheetResponse;
  if (!response.ok) throw new Error(data.error || "Timesheet could not be loaded.");
  return data;
}

type WebMcpContext = {
  registerTool: (tool: { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: () => unknown }, options: { signal: AbortSignal }) => void | Promise<void>;
};

declare global { interface Document { readonly modelContext?: WebMcpContext } }

export function EmployeePortal({ onExit }: { onExit: () => void }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStart, setWeekStart] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const loadTimesheet = useCallback(async () => {
    const data = await fetchTimesheet();
    if (!data) { setEmployee(null); setShifts([]); return false; }
    setEmployee(data.employee); setShifts(data.shifts); setWeekStart(data.weekStart); return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchTimesheet()
      .then((data) => {
        if (cancelled) return;
        if (!data) { setEmployee(null); setShifts([]); return; }
        setEmployee(data.employee); setShifts(data.shifts); setWeekStart(data.weekStart);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Timesheet could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);

  const activeShift = shifts.find((shift) => shift.clockOut === null) ?? null;
  const totalHours = useMemo(() => shifts.reduce((sum, shift) => sum + ((shift.clockOut ?? now) - shift.clockIn) / 3_600_000, 0), [shifts, now]);

  const clock = useCallback(async (action: "clock_in" | "clock_out") => {
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action }) });
      const data = await response.json() as TimesheetResponse;
      if (!response.ok) throw new Error(data.error || "The clock action could not be saved.");
      setEmployee(data.employee); setShifts(data.shifts); setWeekStart(data.weekStart);
      return { status: action === "clock_in" ? "clocked_in" : "clocked_out" };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The clock action could not be saved.";
      setError(message); throw new Error(message);
    } finally { setSubmitting(false); }
  }, []);

  useEffect(() => {
    if (!employee) return;
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const options = { signal: lifecycle.signal };
    const schema = { type: "object", properties: {}, additionalProperties: false };
    const registrations = [
      context.registerTool({ name: "clock_in", title: "Clock in", description: "Start and persist the signed-in employee's shift.", inputSchema: schema, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => clock("clock_in") }, options),
      context.registerTool({ name: "clock_out", title: "Clock out", description: "End and persist the signed-in employee's active shift.", inputSchema: schema, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => clock("clock_out") }, options),
      context.registerTool({ name: "get_weekly_timesheet", title: "Get weekly timesheet", description: "Read the signed-in employee's saved weekly shifts and total hours.", inputSchema: schema, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ shifts, totalHours: Number(totalHours.toFixed(2)), clockedIn: Boolean(activeShift) }) }, options),
    ];
    void Promise.allSettled(registrations.map((value) => Promise.resolve(value)));
    return () => lifecycle.abort();
  }, [activeShift, clock, employee, shifts, totalHours]);

  async function authenticate(endpoint: "login" | "signup", values: Record<string, string>) {
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(values) });
      const data = await response.json() as { employee?: Employee; error?: string };
      if (!response.ok || !data.employee) throw new Error(data.error || "The account request failed.");
      setEmployee(data.employee);
      await loadTimesheet();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The account request failed."); }
    finally { setSubmitting(false); }
  }

  async function signOut() {
    setSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setEmployee(null); setShifts([]); setWeekStart(null); setSubmitting(false);
  }

  if (loading) return <main className="portal-shell grid min-h-screen place-items-center text-white"><div className="text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-[#ec1c24]" /><p className="mt-4 text-sm text-white/60">Loading employee workspace…</p></div></main>;
  if (!employee) return <AuthScreen error={error} submitting={submitting} onAuthenticate={authenticate} onExit={onExit} />;

  const progress = Math.min(100, (totalHours / 40) * 100);
  const weekEnd = weekStart ? new Date(weekStart + 6 * 86_400_000) : null;
  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#111113]">
      <header className="border-b border-black/5 bg-white"><div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#ec1c24] font-black italic text-white">4</span><div><p className="font-black italic leading-tight">Drive4Pro4TV</p><p className="text-xs text-zinc-400">Employee workspace</p></div></div><button onClick={signOut} disabled={submitting} className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-bold hover:bg-zinc-50"><LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span></button></div></header>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12 lg:px-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-zinc-500">{new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Welcome, {employee.fullName.split(" ")[0]}.</h1><p className="mt-2 text-sm text-zinc-400">{employee.email}</p></div>{weekStart && weekEnd && <div className="flex items-center gap-2 text-sm font-bold text-zinc-500"><CalendarDays className="size-4 text-[#ec1c24]" /> {new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}</div>
        {error && <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700" role="alert">{error}</div>}
        <div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] bg-[#111113] p-7 text-white shadow-[0_22px_60px_rgba(0,0,0,.14)] sm:p-9"><div className="absolute -right-20 -top-24 size-80 rounded-full bg-[#ec1c24]/25 blur-3xl" /><div className="relative flex h-full min-h-[290px] flex-col justify-between"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white/45">Current status</p><div className="mt-2 flex items-center gap-2"><span className={`size-2.5 rounded-full ${activeShift ? "animate-pulse bg-emerald-400" : "bg-white/25"}`} /><p className="text-xl font-bold">{activeShift ? "Clocked in" : "Not clocked in"}</p></div></div><Clock3 className="size-8 text-white/35" /></div><div className="mt-10"><p className="font-mono text-[clamp(3rem,8vw,6.2rem)] font-bold leading-none tracking-[-0.06em]">{activeShift ? formatDuration((now - activeShift.clockIn) / 3_600_000) : new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>{activeShift && <p className="mt-3 text-white/45">Started at {new Date(activeShift.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>}</div><Button disabled={submitting} onClick={() => void clock(activeShift ? "clock_out" : "clock_in")} className={`mt-8 h-14 w-full rounded-2xl text-base font-black sm:w-52 ${activeShift ? "bg-white text-[#111113] hover:bg-zinc-100" : "bg-[#ec1c24] text-white hover:bg-[#c81118]"}`}>{submitting ? <LoaderCircle className="size-5 animate-spin" /> : activeShift ? "Clock out" : "Clock in"}<ArrowRight className="ml-1 size-5" /></Button></div></section>
          <section className="rounded-[2rem] border border-black/5 bg-white p-7 sm:p-9"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-zinc-500">Weekly total</p><p className="mt-1 text-5xl font-black tracking-tight">{totalHours.toFixed(1)}<span className="ml-1 text-xl text-zinc-400">hrs</span></p></div><span className="grid size-12 place-items-center rounded-2xl bg-[#fff0f0] text-[#ec1c24]"><Sparkles className="size-6" /></span></div><div className="mt-10"><div className="mb-3 flex items-center justify-between text-sm"><span className="font-bold">Toward 40 hours</span><span className="text-zinc-400">{Math.round(progress)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#ec1c24] transition-all duration-500" style={{ width: `${progress}%` }} /></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Shifts</p><p className="mt-1 text-2xl font-black">{shifts.length}</p></div><div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Remaining</p><p className="mt-1 text-2xl font-black">{Math.max(0, 40 - totalHours).toFixed(1)}h</p></div></div></div></section>
        </div>
        <section className="mt-5 overflow-hidden rounded-[2rem] border border-black/5 bg-white"><div className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-8"><div><h2 className="text-xl font-black">This week’s timesheet</h2><p className="mt-1 text-sm text-zinc-400">Every clock event is saved to the employee account.</p></div><span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:flex"><Check className="size-3.5" /> Saved</span></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-black/5 text-xs uppercase tracking-wider text-zinc-400"><th className="px-6 py-4 font-semibold sm:px-8">Day</th><th className="px-6 py-4 font-semibold">Clock in</th><th className="px-6 py-4 font-semibold">Clock out</th><th className="px-6 py-4 text-right font-semibold sm:px-8">Total</th></tr></thead><tbody>{shifts.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400">No shifts recorded this week.</td></tr> : shifts.map((shift) => <tr key={shift.id} className="border-b border-black/5 last:border-0"><td className="px-6 py-4 sm:px-8"><span className="font-bold">{new Date(shift.clockIn).toLocaleDateString("en-US", { weekday: "short" })}</span><span className="ml-3 text-sm text-zinc-400">{new Date(shift.clockIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></td><td className="px-6 py-4 text-zinc-600">{new Date(shift.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td><td className="px-6 py-4 text-zinc-600">{shift.clockOut ? new Date(shift.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Active"}</td><td className="px-6 py-4 text-right font-black sm:px-8">{(((shift.clockOut ?? now) - shift.clockIn) / 3_600_000).toFixed(2)}h</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}

function AuthScreen({ error, submitting, onAuthenticate, onExit }: { error: string; submitting: boolean; onAuthenticate: (endpoint: "login" | "signup", values: Record<string, string>) => Promise<void>; onExit: () => void }) {
  const [tab, setTab] = useState("login");
  return <main className="portal-shell min-h-screen"><div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-14"><button onClick={onExit} className="flex items-center gap-2 self-start text-sm font-bold text-white/70 transition hover:text-white"><ArrowLeft className="size-4" /> Back to public site</button><div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-2"><div className="max-w-xl text-white"><div className="mb-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#ec1c24] font-black italic">4</span><span className="font-black italic">Drive4Pro4TV <span className="font-medium not-italic text-white/45">Staff</span></span></div><p className="section-kicker text-[#ff4b51]">Employee portal</p><h1 className="mt-4 text-[clamp(3.2rem,7vw,6.8rem)] font-black leading-[.9] tracking-[-0.06em]">Your week,<br />at a glance.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-white/55">Create your employee account, clock in and out, and return anytime to see your saved hours.</p></div><div className="w-full max-w-md justify-self-center rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9"><div className="flex items-start justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-[#fff0f0] text-[#ec1c24]"><UserRound className="size-6" /></div><ShieldCheck className="size-6 text-zinc-300" /></div><Tabs value={tab} onValueChange={(value) => { setTab(value); }} className="mt-6"><TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-zinc-100"><TabsTrigger value="login" className="rounded-lg">Sign in</TabsTrigger><TabsTrigger value="signup" className="rounded-lg">Create account</TabsTrigger></TabsList><TabsContent value="login" className="pt-5"><AuthForm mode="login" submitting={submitting} error={error} onSubmit={(values) => onAuthenticate("login", values)} /></TabsContent><TabsContent value="signup" className="pt-5"><AuthForm mode="signup" submitting={submitting} error={error} onSubmit={(values) => onAuthenticate("signup", values)} /></TabsContent></Tabs></div></div></div></main>;
}

function AuthForm({ mode, submitting, error, onSubmit }: { mode: "login" | "signup"; submitting: boolean; error: string; onSubmit: (values: Record<string, string>) => Promise<void> }) {
  const [fullName, setFullName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [accessCode, setAccessCode] = useState("");
  return <form onSubmit={(event) => { event.preventDefault(); void onSubmit({ fullName, email, password, accessCode }); }}><h2 className="text-3xl font-black tracking-tight">{mode === "login" ? "Welcome back" : "Join the team"}</h2><p className="mt-2 text-zinc-500">{mode === "login" ? "Sign in with your work email and password." : "Use the private company code supplied by your manager."}</p>{mode === "signup" && <><label className="mt-6 block text-sm font-bold" htmlFor="employee-name">Full name</label><Input id="employee-name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 h-12 rounded-xl" autoComplete="name" required /></>}<label className="mt-5 block text-sm font-bold" htmlFor={`${mode}-email`}>Email address</label><Input id={`${mode}-email`} value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-2 h-12 rounded-xl" autoComplete="email" required /><label className="mt-5 block text-sm font-bold" htmlFor={`${mode}-password`}>Password</label><Input id={`${mode}-password`} value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 h-12 rounded-xl" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />{mode === "signup" && <><label className="mt-5 block text-sm font-bold" htmlFor="access-code">Company access code</label><Input id="access-code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} type="password" className="mt-2 h-12 rounded-xl" required /></>}{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}<Button disabled={submitting} type="submit" className="mt-6 h-12 w-full rounded-xl bg-[#ec1c24] font-bold text-white hover:bg-[#c81118]">{submitting ? <LoaderCircle className="size-5 animate-spin" /> : mode === "login" ? "Sign in" : "Create employee account"}<ArrowRight className="ml-1 size-4" /></Button></form>;
}

function formatDuration(hours: number) { const totalSeconds = Math.floor(hours * 3600); return [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60].map((value) => value.toString().padStart(2, "0")).join(":"); }
