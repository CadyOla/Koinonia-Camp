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
  ministries: text("ministries").notNull().default(""),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactNumber: text("emergency_contact_number").notNull(),
  accommodationPreference: text("accommodation_preference").notNull(),
  roomTypePreference: text("room_type_preference"),
  lodgingType: text("lodging_type"),
  roommatePreferences: text("roommate_preferences"),
  specialNeeds: text("special_needs"),
  feedingPreference: text("feeding_preference").notNull(),
  transportPreference: text("transport_preference").notNull(),
  ageCategory: text("age_category").notNull(),
  paymentStatus: text("payment_status"),
  roomAssignment: text("room_assignment"),
  busAssignment: text("bus_assignment"),
  smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
  // --- HQ sync tracking (internal only, not exposed via the API/OpenAPI spec) ---
  hqBookingId: text("hq_booking_id"),
  hqSyncedAt: timestamp("hq_synced_at", { withTimezone: true }),
  // --- Room-selection invite SMS tracking (internal only) ---
  roomSmsSentAt: timestamp("room_sms_sent_at", { withTimezone: true }),
  // --- Payment reminder SMS tracking for Non-Residents (internal only) ---
  paymentSmsSentAt: timestamp("payment_sms_sent_at", { withTimezone: true }),
  // --- Meal selection (Church Feeding only), self-service via /my-registration ---
  mealFridayEvening: text("meal_friday_evening"),
  mealSaturdayAfternoon: text("meal_saturday_afternoon"),
  mealSaturdayEvening: text("meal_saturday_evening"),
  mealSundayAfternoon: text("meal_sunday_afternoon"),
  mealSundayEvening: text("meal_sunday_evening"),
  mealSelectionsSubmittedAt: timestamp("meal_selections_submitted_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRegistrationSchema = createInsertSchema(
  registrationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
