"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { drivingPrograms, formatProgramPrice, type ProgramId } from "@/lib/programs";

type BookingDialogProps = {
  initialProgramId: ProgramId;
  onClose: () => void;
};

export function BookingDialog({ initialProgramId, onClose }: BookingDialogProps) {
  const [programId, setProgramId] = useState<ProgramId>(initialProgramId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; program: string; emailStatus: string } | null>(null);
  const [minimumAppointment] = useState(() => {
    const minimum = new Date();
    minimum.setHours(minimum.getHours() + 1);
    minimum.setMinutes(minimum.getMinutes() - minimum.getTimezoneOffset());
    return minimum.toISOString().slice(0, 16);
  });
  const program = useMemo(() => drivingPrograms.find((item) => item.id === programId) ?? drivingPrograms[0], [programId]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    const appointmentValue = String(form.get("appointmentStart") || "");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          customerName: form.get("customerName"),
          customerEmail: form.get("customerEmail"),
          customerPhone: form.get("customerPhone"),
          appointmentStart: new Date(appointmentValue).toISOString(),
          notes: form.get("notes"),
          website: form.get("website"),
        }),
      });
      const data = await response.json() as { booking?: { id: string; program: string }; emailStatus?: string; error?: string };
      if (!response.ok || !data.booking) throw new Error(data.error || "The booking could not be saved.");
      setConfirmation({ id: data.booking.id, program: data.booking.program, emailStatus: data.emailStatus || "pending" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The booking could not be saved.");
    } finally { setSubmitting(false); }
  }

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Book a driving lesson" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="my-8 w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-5 bg-[#111113] p-6 text-white sm:p-8">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#ff4b51]">Book a lesson</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Choose your road forward.</h2></div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 text-white/70 hover:text-white" aria-label="Close booking form"><X className="size-5" /></button>
      </div>
      {confirmation ? <div className="p-8 text-center sm:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-8" /></span><h3 className="mt-5 text-3xl font-black">Appointment request received.</h3><p className="mx-auto mt-3 max-w-md leading-7 text-zinc-600">Your request for <strong>{confirmation.program}</strong> has been saved. Drive4Pro4TV will review the requested time and contact you to confirm.</p><p className="mt-5 text-xs text-zinc-400">Reference: {confirmation.id}</p><Button onClick={onClose} className="mt-7 h-12 rounded-full bg-[#ec1c24] px-7 font-bold text-white hover:bg-[#c81118]">Done</Button></div> :
      <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <label className="sm:col-span-2"><span className="text-sm font-bold">Program</span><select value={programId} onChange={(event) => setProgramId(event.target.value as ProgramId)} className="mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 font-semibold outline-none focus:border-[#ec1c24]">{drivingPrograms.map((item) => <option key={item.id} value={item.id}>{item.title} — {formatProgramPrice(item.priceCents)}</option>)}</select></label>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-zinc-50 px-4 py-3"><span className="font-semibold">{program.durationMinutes}-minute session</span><span className="text-xl font-black text-[#ec1c24]">{formatProgramPrice(program.priceCents)}</span></div>
        <label><span className="text-sm font-bold">Full name</span><Input name="customerName" autoComplete="name" required minLength={2} maxLength={100} className="mt-2 h-12 rounded-xl" /></label>
        <label><span className="text-sm font-bold">Email address</span><Input name="customerEmail" type="email" autoComplete="email" required className="mt-2 h-12 rounded-xl" /></label>
        <label><span className="text-sm font-bold">Phone number</span><Input name="customerPhone" type="tel" autoComplete="tel" required minLength={7} maxLength={40} className="mt-2 h-12 rounded-xl" /></label>
        <label><span className="text-sm font-bold">Preferred date and time</span><Input name="appointmentStart" type="datetime-local" required min={minimumAppointment} className="mt-2 h-12 rounded-xl" /></label>
        <label className="hidden" aria-hidden="true">Website<Input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="sm:col-span-2"><span className="text-sm font-bold">Notes <span className="font-normal text-zinc-400">(optional)</span></span><textarea name="notes" maxLength={1000} rows={3} className="mt-2 w-full resize-none rounded-xl border border-zinc-200 p-3 outline-none focus:border-[#ec1c24]" placeholder="Tell us about your experience level or anything we should know." /></label>
        {error && <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        <div className="sm:col-span-2 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-sm text-zinc-500"><CalendarDays className="size-4 text-[#ec1c24]" /> The school will confirm availability.</p><Button disabled={submitting} type="submit" className="h-12 rounded-full bg-[#ec1c24] px-7 font-bold text-white hover:bg-[#c81118]">{submitting ? <LoaderCircle className="size-5 animate-spin" /> : "Request appointment"}</Button></div>
      </form>}
    </div>
  </div>;
}
