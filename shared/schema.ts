export * from "./models/auth";
export * from "./models/chat";

import { pgTable, text, serial, doublePrecision, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tourSpots = pgTable("tour_spots", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionZh: text("description_zh").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // 'historical', 'nature', etc.
});

export const insertTourSpotSchema = createInsertSchema(tourSpots).omit({ id: true });
export type TourSpot = typeof tourSpots.$inferSelect;
export type InsertTourSpot = z.infer<typeof insertTourSpotSchema>;

export const tourGuides = pgTable("tour_guides", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  photoUrl: text("photo_url"),
  languages: text("languages").array().notNull(),
  bioEn: text("bio_en").notNull(),
  bioZh: text("bio_zh").notNull(),
  rating: doublePrecision("rating").notNull().default(5.0),
  hourlyRate: doublePrecision("hourly_rate").notNull(),
  phone: text("phone"),
  wechat: text("wechat"),
  specialties: text("specialties").array(),
  city: text("city").notNull(),
});

export const insertTourGuideSchema = createInsertSchema(tourGuides).omit({ id: true });
export type TourGuide = typeof tourGuides.$inferSelect;
export type InsertTourGuide = z.infer<typeof insertTourGuideSchema>;

// Bookings table for guide reservations
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guideId: integer("guide_id").notNull(),
  tourDate: timestamp("tour_date").notNull(),
  hours: integer("hours").notNull(),
  guideRate: doublePrecision("guide_rate").notNull(),
  platformFee: doublePrecision("platform_fee").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Guide registrations – sensitive fields stored encrypted (AES-256-GCM)
export const guideRegistrations = pgTable("guide_registrations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  nameReal: text("name_real").notNull(),
  phoneEncrypted: text("phone_encrypted").notNull(),
  idCardEncrypted: text("id_card_encrypted").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  rejectReason: text("reject_reason"),
  // Guide public profile
  serviceDesc: text("service_desc"),
  hourlyRate: doublePrecision("hourly_rate"),
  dailyRate: doublePrecision("daily_rate"),
  city: text("city"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuideRegSchema = createInsertSchema(guideRegistrations).omit({ id: true, createdAt: true, updatedAt: true, status: true, rejectReason: true });
export type GuideRegistration = typeof guideRegistrations.$inferSelect;
export type InsertGuideReg = z.infer<typeof insertGuideRegSchema>;

// Phone OTP codes for authentication
export const phoneAuthCodes = pgTable("phone_auth_codes", {
  id: serial("id").primaryKey(),
  phoneEncrypted: text("phone_encrypted").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: text("used").notNull().default("no"),
  createdAt: timestamp("created_at").defaultNow(),
});

// App users (phone-auth or username/password, separate from Replit auth)
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // generated UUID
  phoneEncrypted: text("phone_encrypted").notNull(),
  username: text("username").unique(),        // for username/password login
  passwordHash: text("password_hash"),        // bcrypt hash
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  isGuide: text("is_guide").notNull().default("no"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertAppUserSchema = createInsertSchema(appUsers).omit({ id: true, createdAt: true });
export type AppUser = typeof appUsers.$inferSelect;
