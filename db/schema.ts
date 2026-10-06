import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_sessions_employee_id").on(table.employeeId),
  index("idx_sessions_expires_at").on(table.expiresAt),
]);

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  clockIn: integer("clock_in").notNull(),
  clockOut: integer("clock_out"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_shifts_employee_clock_in").on(table.employeeId, table.clockIn),
]);

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  programName: text("program_name").notNull(),
  priceCents: integer("price_cents").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  appointmentStart: integer("appointment_start").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  emailStatus: text("email_status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_bookings_appointment_start").on(table.appointmentStart),
  index("idx_bookings_customer_email").on(table.customerEmail),
]);

export const reportRuns = sqliteTable("report_runs", {
  id: text("id").primaryKey(),
  reportType: text("report_type").notNull(),
  periodStart: integer("period_start").notNull(),
  periodEnd: integer("period_end").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_report_runs_type_period").on(table.reportType, table.periodStart),
]);
