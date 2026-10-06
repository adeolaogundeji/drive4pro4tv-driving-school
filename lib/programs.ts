export const drivingPrograms = [
  {
    id: "first-time",
    number: "01",
    title: "First-time drivers",
    description: "A calm, structured path from first lesson to confident everyday driving.",
    priceCents: 8500,
    durationMinutes: 60,
  },
  {
    id: "road-test",
    number: "02",
    title: "Road test preparation",
    description: "Focused practice on the skills, routes, and decisions that matter on test day.",
    priceCents: 12000,
    durationMinutes: 90,
  },
  {
    id: "refresher",
    number: "03",
    title: "Refresher lessons",
    description: "Personal coaching for drivers returning to the road or building new confidence.",
    priceCents: 8000,
    durationMinutes: 60,
  },
] as const;

export type ProgramId = (typeof drivingPrograms)[number]["id"];

export function getDrivingProgram(id: string) {
  return drivingPrograms.find((program) => program.id === id) ?? null;
}

export function formatProgramPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(priceCents / 100);
}
