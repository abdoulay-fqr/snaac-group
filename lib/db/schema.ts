import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const diagnostics = pgTable("diagnostics", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  company: text("company").notNull(),
  activity: text("activity").notNull(),
  department: text("department").notNull(),
  city: text("city").notNull(),
  ca: integer("ca").notNull(),
  score: integer("score"),
  label: text("label"),
  methodVersion: text("method_version").notNull(),
  savingsLow: integer("savings_low").notNull(),
  savingsMid: integer("savings_mid").notNull(),
  savingsHigh: integer("savings_high").notNull(),
  items: text("items").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  callbackWanted: boolean("callback_wanted").notNull().default(false),
  status: text("status").$type<"pending" | "treated">().notNull().default("pending"),
  notes: text("notes"),
  cashCarryProviders: text("cash_carry_providers").array(),
  cashCarryExpenses: numeric("cash_carry_expenses"),
  howFound: text("how_found"),
  rawPayload: text("raw_payload").notNull(),
});

export const adminConfig = pgTable("admin_config", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});
