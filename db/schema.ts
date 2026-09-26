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
