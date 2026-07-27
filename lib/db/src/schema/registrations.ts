import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  gender: text("gender").notNull(),
  branch: text("branch").notNull(),
  // stored as comma-separated string to avoid pg array complexities
  ministries: text("ministries").notNull().default(""),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactNumber: text("emergency_contact_number").notNull(),
  accommodationPreference: text("accommodation_preference").notNull(),
  roomTypePreference: text("room_type_preference"),
  roommatePreferences: text("roommate_preferences"),
  specialNeeds: text("special_needs"),
  feedingPreference: text("feeding_preference").notNull(),
  transportPreference: text("transport_preference").notNull(),
  // Future fields — not exposed in phase 1 UI
  paymentStatus: text("payment_status"),
  roomAssignment: text("room_assignment"),
  busAssignment: text("bus_assignment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
