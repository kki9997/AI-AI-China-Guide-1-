export * from "./models/auth";
export * from "./models/chat";

import { pgTable, text, serial, doublePrecision } from "drizzle-orm/pg-core";
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
