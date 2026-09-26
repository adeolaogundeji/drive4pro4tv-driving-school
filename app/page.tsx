"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Award, CalendarDays, CarFront, Check, Clock3, Gauge, LogOut, Menu, Route, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: () => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: WebMcpContext;
  }
}

type Shift = { day: string; date: string; inTime: string; outTime: string; hours: number };

const initialShifts: Shift[] = [
  { day: "Mon", date: "Sep 21", inTime: "8:02 AM", outTime: "4:18 PM", hours: 8.27 },
  { day: "Tue", date: "Sep 22", inTime: "7:56 AM", outTime: "3:44 PM", hours: 7.8 },
  { day: "Wed", date: "Sep 23", inTime: "8:11 AM", outTime: "4:06 PM", hours: 7.92 },
  { day: "Thu", date: "Sep 24", inTime: "8:04 AM", outTime: "3:29 PM", hours: 7.42 },
];

const programs = [
  { number: "01", title: "First-time drivers", copy: "A calm, structured path from first lesson to confident everyday driving.", icon: CarFront },
  { number: "02", title: "Road test preparation", copy: "Focused practice on the skills, routes, and decisions that matter on test day.", icon: Route },
  { number: "03", title: "Refresher lessons", copy: "Personal coaching for drivers returning to the road or building new confidence.", icon: Gauge },
];

export default function Home() {
  const [employeeView, setEmployeeView] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [clockedInAt, setClockedInAt] = useState<Date | null>(null);
  const [shifts, setShifts] = useState(initialShifts);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalHours = useMemo(() => shifts.reduce((sum, shift) => sum + shift.hours, 0), [shifts]);
  const liveHours = clockedInAt ? Math.max(0, (now.getTime() - clockedInAt.getTime()) / 3_600_000) : 0;

  function enterPortal() {
    setEmployeeView(true);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (employeeId.trim().toUpperCase() === "EMP-104" && pin === "2468") {
      setLoggedIn(true);
      setLoginError("");
      return;
    }
    setLoginError("That employee ID or PIN does not match the demo account.");
  }

  function clockOut() {
    if (!clockedInAt) return;
    const endedAt = new Date();
    const hours = Math.max(0.01, (endedAt.getTime() - clockedInAt.getTime()) / 3_600_000);
    setShifts((current) => [...current, {
      day: endedAt.toLocaleDateString("en-US", { weekday: "short" }),
      date: endedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      inTime: clockedInAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      outTime: endedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      hours,
    }]);
    setClockedInAt(null);
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const options = { signal: lifecycle.signal };
    const schema = { type: "object", properties: {}, additionalProperties: false };
    const tools = [
      context.registerTool({
        name: "clock_in",
        title: "Clock in",
        description: "Start the employee's active shift in the visible timekeeping workspace.",
        inputSchema: schema,
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => {
          if (clockedInAt) return { status: "already_clocked_in" };
          const startedAt = new Date();
          setClockedInAt(startedAt);
          return { status: "clocked_in", startedAt: startedAt.toISOString() };
        },
      }, options),
      context.registerTool({
        name: "clock_out",
        title: "Clock out",
        description: "End the employee's active shift and add it to the visible weekly timesheet.",
        inputSchema: schema,
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => {
          if (!clockedInAt) return { status: "not_clocked_in" };
          clockOut();
          return { status: "clocked_out" };
        },
      }, options),
      context.registerTool({
        name: "get_weekly_timesheet",
        title: "Get weekly timesheet",
        description: "Read this employee's visible shifts and calculated weekly total.",
        inputSchema: schema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ shifts, totalHours: Number(totalHours.toFixed(2)), clockedIn: Boolean(clockedInAt) }),
      }, options),
    ];
    void Promise.allSettled(tools.map((tool) => Promise.resolve(tool)));
    return () => lifecycle.abort();
  }, [clockedInAt, shifts, totalHours]);

  if (employeeView) {
    return <EmployeePortal loggedIn={loggedIn} employeeId={employeeId} pin={pin} loginError={loginError} shifts={shifts} totalHours={totalHours} clockedInAt={clockedInAt} liveHours={liveHours} now={now} onEmployeeId={setEmployeeId} onPin={setPin} onLogin={handleLogin} onClockIn={() => setClockedInAt(new Date())} onClockOut={clockOut} onExit={() => { setEmployeeView(false); setLoggedIn(false); setEmployeeId(""); setPin(""); setLoginError(""); }} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111113]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
          <a href="#top" className="flex items-center" aria-label="Drive4Pro4TV home">
            <img src="/drive4pro-logo.jpeg" alt="Drive4Pro4TV" className="h-10 w-[190px] object-cover object-[center_42%] sm:h-12 sm:w-[228px]" />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            <a className="nav-link" href="#programs">Programs</a><a className="nav-link" href="#approach">Our approach</a><a className="nav-link" href="#contact">Contact</a>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="ghost" className="rounded-full px-5 font-semibold" onClick={enterPortal}>Employee access</Button>
            <Button asChild className="rounded-full bg-[#ec1c24] px-6 text-white hover:bg-[#c81118]"><a href="#programs">Explore lessons <ArrowRight className="ml-1 size-4" /></a></Button>
          </div>
          <button className="grid size-11 place-items-center rounded-full border border-black/10 lg:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {mobileOpen && <div className="border-t border-black/5 bg-white px-5 py-5 lg:hidden"><nav className="grid gap-1 text-base font-semibold"><a className="rounded-xl px-3 py-3 hover:bg-zinc-50" href="#programs" onClick={() => setMobileOpen(false)}>Programs</a><a className="rounded-xl px-3 py-3 hover:bg-zinc-50" href="#approach" onClick={() => setMobileOpen(false)}>Our approach</a><a className="rounded-xl px-3 py-3 hover:bg-zinc-50" href="#contact" onClick={() => setMobileOpen(false)}>Contact</a><button className="mt-2 rounded-xl bg-[#111113] px-3 py-3 text-left text-white" onClick={enterPortal}>Employee access</button></nav></div>}
      </header>

      <section id="top" className="relative bg-[#f7f7f7] pb-12 pt-[112px] sm:pb-16 sm:pt-[132px] lg:min-h-[760px] lg:pb-20 lg:pt-[154px]">
        <div className="hero-grid absolute inset-0 opacity-45" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:px-14">
          <div className="max-w-[690px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] shadow-sm"><span className="size-2 rounded-full bg-[#ec1c24]" />Excellence in perfection</div>
            <h1 className="font-display text-[clamp(3.4rem,7vw,7.6rem)] font-black leading-[0.87] tracking-[-0.065em]">Learn with<br />precision.<br /><span className="text-[#ec1c24]">Drive with confidence.</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-600 sm:text-xl">Patient instruction, practical road experience, and a clear plan built around the driver you want to become.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="h-14 rounded-full bg-[#ec1c24] px-8 text-base font-bold text-white shadow-[0_14px_32px_rgba(236,28,36,.25)] hover:bg-[#c81118]"><a href="#programs">Find your program <ArrowRight className="ml-1 size-5" /></a></Button><Button asChild variant="outline" size="lg" className="h-14 rounded-full border-black/15 bg-white px-8 text-base font-bold"><a href="#approach">How training works</a></Button></div>
          </div>
          <div className="relative mx-auto w-full max-w-[660px] lg:max-w-none">
            <div className="road-panel relative aspect-[4/4.15] overflow-hidden rounded-[2rem] bg-[#111113] p-6 text-white shadow-[0_40px_90px_rgba(0,0,0,.22)] sm:p-9">
              <div className="absolute -right-20 top-[-5%] h-[115%] w-56 rotate-[16deg] bg-[#ec1c24]" /><div className="absolute inset-y-0 left-[58%] w-1 rotate-[16deg] bg-white/20" /><div className="absolute inset-y-0 left-[69%] w-1 rotate-[16deg] bg-white/20" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4"><div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] backdrop-blur">Learn today · Drive tomorrow</div><ShieldCheck className="size-9 text-white/85" /></div>
                <div><div className="mb-5 flex items-center gap-3"><div className="grid size-14 place-items-center rounded-2xl bg-white text-[#111113]"><CarFront className="size-7" /></div><div><p className="text-sm text-white/60">Next step</p><p className="text-lg font-bold">Build road confidence</p></div></div><div className="rounded-[1.6rem] border border-white/15 bg-white/10 p-6 backdrop-blur-md"><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-white/60">Your training path</p><p className="mt-1 text-3xl font-black tracking-tight">Skills that stick.</p></div><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ec1c24]"><ArrowRight className="size-5" /></span></div><div className="mt-6 grid grid-cols-3 gap-2">{["Control", "Awareness", "Judgment"].map((skill) => <div key={skill} className="rounded-xl bg-black/20 px-2 py-3 text-center text-xs font-semibold text-white/80">{skill}</div>)}</div></div></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-black/10 bg-white px-5 py-4 shadow-xl sm:-left-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#fff1f1] text-[#ec1c24]"><Award className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Our standard</p><p className="font-bold">Calm. Clear. Capable.</p></div></div></div>
          </div>
        </div>
      </section>

      <section id="programs" className="bg-white py-24 sm:py-32"><div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="section-kicker">Training programs</p><h2 className="section-title mt-4">A better way to learn the road.</h2></div><p className="max-w-2xl text-lg leading-8 text-zinc-600 lg:justify-self-end">Lessons are shaped around your experience level, learning pace, and goals—so every hour behind the wheel moves you forward.</p></div><div className="mt-14 grid gap-4 lg:grid-cols-3">{programs.map((program, index) => { const Icon = program.icon; return <article key={program.number} className={`program-card group ${index === 1 ? "program-card-dark" : ""}`}><div className="flex items-start justify-between"><span className="text-sm font-bold tracking-widest text-zinc-400">{program.number}</span><span className="grid size-12 place-items-center rounded-2xl border border-current/10 bg-current/[.04]"><Icon className="size-6" /></span></div><div className="mt-28 sm:mt-36"><h3 className="text-2xl font-black tracking-tight">{program.title}</h3><p className="mt-3 max-w-sm leading-7 opacity-65">{program.copy}</p><div className="mt-8 flex items-center gap-2 text-sm font-bold">Program details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></div></div></article>; })}</div></div></section>

      <section id="approach" className="bg-[#111113] py-24 text-white sm:py-32"><div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20"><div><p className="section-kicker text-[#ff4b51]">The Drive4Pro method</p><h2 className="section-title mt-4 text-white">Progress you can feel in every lesson.</h2><p className="mt-6 max-w-md text-lg leading-8 text-white/60">A focused training rhythm turns information into instinct, one confident decision at a time.</p></div><div className="grid gap-px overflow-hidden rounded-[2rem] bg-white/10 sm:grid-cols-2">{[["01", "Assess", "We begin with your experience, comfort level, and goals."], ["02", "Practice", "Each lesson builds practical control in real road situations."], ["03", "Refine", "Clear feedback helps you correct habits and sharpen judgment."], ["04", "Advance", "You leave with the awareness and confidence to drive independently."]].map(([number, title, copy]) => <div key={number} className="bg-[#18181b] p-7 sm:p-9"><span className="text-xs font-bold tracking-[0.2em] text-[#ff4b51]">{number}</span><h3 className="mt-14 text-2xl font-black">{title}</h3><p className="mt-3 leading-7 text-white/55">{copy}</p></div>)}</div></div></div></section>

      <section id="contact" className="bg-[#ec1c24] py-20 text-white sm:py-24"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 px-5 sm:px-8 lg:flex-row lg:items-end lg:px-14"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-white/65">Contact section reserved</p><h2 className="mt-4 max-w-3xl text-[clamp(2.8rem,6vw,6.2rem)] font-black leading-[.92] tracking-[-0.055em]">Ready when your contact details are.</h2></div><div className="max-w-sm rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur"><p className="font-bold">Coming next</p><p className="mt-2 leading-7 text-white/75">Phone, email, service area, and preferred booking method can be added here as soon as they are available.</p></div></div></section>

      <footer className="bg-[#0b0b0c] py-10 text-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-14"><div><p className="text-xl font-black italic">Drive<span className="text-[#ec1c24]">4</span>Pro<span className="text-[#ec1c24]">4TV</span></p><p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/45">Excellence in perfection</p></div><button onClick={enterPortal} className="flex items-center gap-2 self-start text-sm font-semibold text-white/65 transition hover:text-white md:self-auto"><UserRound className="size-4" /> Employee access</button></div></footer>
    </main>
  );
}

type PortalProps = {
  loggedIn: boolean; employeeId: string; pin: string; loginError: string; shifts: Shift[]; totalHours: number; clockedInAt: Date | null; liveHours: number; now: Date;
  onEmployeeId: (value: string) => void; onPin: (value: string) => void; onLogin: (event: React.FormEvent<HTMLFormElement>) => void; onClockIn: () => void; onClockOut: () => void; onExit: () => void;
};

function EmployeePortal(props: PortalProps) {
  if (!props.loggedIn) {
    return <main className="portal-shell min-h-screen"><div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-14"><button onClick={props.onExit} className="flex items-center gap-2 self-start text-sm font-bold text-white/70 transition hover:text-white"><ArrowLeft className="size-4" /> Back to public site</button><div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-2"><div className="max-w-xl text-white"><div className="mb-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#ec1c24] font-black italic">4</span><span className="font-black italic">Drive4Pro4TV <span className="font-medium not-italic text-white/45">Staff</span></span></div><p className="section-kicker text-[#ff4b51]">Employee portal</p><h1 className="mt-4 text-[clamp(3.2rem,7vw,6.8rem)] font-black leading-[.9] tracking-[-0.06em]">Your week,<br />at a glance.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-white/55">Clock in, clock out, and review your weekly hours from one simple workspace.</p></div><form onSubmit={props.onLogin} className="w-full max-w-md justify-self-center rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-[#fff0f0] text-[#ec1c24]"><UserRound className="size-6" /></div><h2 className="mt-6 text-3xl font-black tracking-tight">Welcome back</h2><p className="mt-2 text-zinc-500">Enter your employee credentials to continue.</p><label className="mt-7 block text-sm font-bold" htmlFor="employee-id">Employee ID</label><Input id="employee-id" value={props.employeeId} onChange={(event) => props.onEmployeeId(event.target.value)} placeholder="EMP-104" className="mt-2 h-12 rounded-xl" autoComplete="username" /><label className="mt-5 block text-sm font-bold" htmlFor="employee-pin">4-digit PIN</label><Input id="employee-pin" value={props.pin} onChange={(event) => props.onPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" type="password" inputMode="numeric" className="mt-2 h-12 rounded-xl" autoComplete="current-password" />{props.loginError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{props.loginError}</p>}<Button type="submit" className="mt-6 h-12 w-full rounded-xl bg-[#ec1c24] font-bold text-white hover:bg-[#c81118]">Sign in <ArrowRight className="ml-1 size-4" /></Button><div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500"><span className="font-bold text-zinc-700">Demo access:</span> EMP-104 · PIN 2468</div></form></div></div></main>;
  }

  const weeklyGoal = 40;
  const displayedTotal = props.totalHours + props.liveHours;
  const progress = Math.min(100, (displayedTotal / weeklyGoal) * 100);
  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#111113]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#ec1c24] font-black italic text-white">4</span>
            <div><p className="font-black italic leading-tight">Drive4Pro4TV</p><p className="text-xs text-zinc-400">Employee workspace</p></div>
          </div>
          <button onClick={props.onExit} className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-bold hover:bg-zinc-50">
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12 lg:px-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-semibold text-zinc-500">Friday, September 25</p><h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Good morning, Jasmine.</h1></div>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-500"><CalendarDays className="size-4 text-[#ec1c24]" /> Week of Sep 21–27</div>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] bg-[#111113] p-7 text-white shadow-[0_22px_60px_rgba(0,0,0,.14)] sm:p-9">
            <div className="absolute -right-20 -top-24 size-80 rounded-full bg-[#ec1c24]/25 blur-3xl" />
            <div className="relative flex h-full min-h-[290px] flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/45">Current status</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${props.clockedInAt ? "animate-pulse bg-emerald-400" : "bg-white/25"}`} />
                    <p className="text-xl font-bold">{props.clockedInAt ? "Clocked in" : "Not clocked in"}</p>
                  </div>
                </div>
                <Clock3 className="size-8 text-white/35" />
              </div>
              <div className="mt-10">
                <p className="font-mono text-[clamp(3rem,8vw,6.2rem)] font-bold leading-none tracking-[-0.06em]">
                  {props.clockedInAt ? formatDuration(props.liveHours) : props.now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="mt-3 text-white/45">{props.clockedInAt && `Started at ${props.clockedInAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}</p>
              </div>
              <Button onClick={props.clockedInAt ? props.onClockOut : props.onClockIn} className={`mt-8 h-14 w-full rounded-2xl text-base font-black sm:w-52 ${props.clockedInAt ? "bg-white text-[#111113] hover:bg-zinc-100" : "bg-[#ec1c24] text-white hover:bg-[#c81118]"}`}>
                {props.clockedInAt ? "Clock out" : "Clock in"} <ArrowRight className="ml-1 size-5" />
              </Button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/5 bg-white p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-zinc-500">Weekly total</p><p className="mt-1 text-5xl font-black tracking-tight">{displayedTotal.toFixed(1)}<span className="ml-1 text-xl text-zinc-400">hrs</span></p></div>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#fff0f0] text-[#ec1c24]"><Sparkles className="size-6" /></span>
            </div>
            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between text-sm"><span className="font-bold">Toward 40 hours</span><span className="text-zinc-400">{Math.round(progress)}%</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#ec1c24] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Days worked</p><p className="mt-1 text-2xl font-black">{props.shifts.length}</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Remaining</p><p className="mt-1 text-2xl font-black">{Math.max(0, weeklyGoal - displayedTotal).toFixed(1)}h</p></div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-black/5 bg-white">
          <div className="flex items-center justify-between border-b border-black/5 px-6 py-5 sm:px-8">
            <div><h2 className="text-xl font-black">This week’s timesheet</h2><p className="mt-1 text-sm text-zinc-400">Hours calculate automatically after each clock-out.</p></div>
            <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:flex"><Check className="size-3.5" /> Up to date</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead><tr className="border-b border-black/5 text-xs uppercase tracking-wider text-zinc-400"><th className="px-6 py-4 font-semibold sm:px-8">Day</th><th className="px-6 py-4 font-semibold">Clock in</th><th className="px-6 py-4 font-semibold">Clock out</th><th className="px-6 py-4 text-right font-semibold sm:px-8">Total</th></tr></thead>
              <tbody>
                {props.shifts.map((shift, index) => (
                  <tr key={`${shift.date}-${index}`} className="border-b border-black/5 last:border-0">
                    <td className="px-6 py-4 sm:px-8"><span className="font-bold">{shift.day}</span><span className="ml-3 text-sm text-zinc-400">{shift.date}</span></td>
                    <td className="px-6 py-4 text-zinc-600">{shift.inTime}</td>
                    <td className="px-6 py-4 text-zinc-600">{shift.outTime}</td>
                    <td className="px-6 py-4 text-right font-black sm:px-8">{shift.hours.toFixed(2)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatDuration(hours: number) {
  const totalSeconds = Math.floor(hours * 3600);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((value) => value.toString().padStart(2, "0")).join(":");
}
