import { tourSpots, tourGuides, bookings, type TourSpot, type InsertTourSpot, type TourGuide, type InsertTourGuide, type Booking, type InsertBooking } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { chatStorage } from "./replit_integrations/chat/storage";

export interface IStorage {
  getSpots(): Promise<TourSpot[]>;
  getSpot(id: number): Promise<TourSpot | undefined>;
  createSpot(spot: InsertTourSpot): Promise<TourSpot>;
  getGuides(): Promise<TourGuide[]>;
  getGuide(id: number): Promise<TourGuide | undefined>;
  createGuide(guide: InsertTourGuide): Promise<TourGuide>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, paymentIntentId?: string): Promise<Booking | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getSpots(): Promise<TourSpot[]> {
    return await db.select().from(tourSpots);
  }

  async getSpot(id: number): Promise<TourSpot | undefined> {
    const [spot] = await db.select().from(tourSpots).where(eq(tourSpots.id, id));
    return spot;
  }

  async createSpot(spot: InsertTourSpot): Promise<TourSpot> {
    const [newSpot] = await db.insert(tourSpots).values(spot).returning();
    return newSpot;
  }

  async getGuides(): Promise<TourGuide[]> {
    return await db.select().from(tourGuides);
  }

  async getGuide(id: number): Promise<TourGuide | undefined> {
    const [guide] = await db.select().from(tourGuides).where(eq(tourGuides.id, id));
    return guide;
  }

  async createGuide(guide: InsertTourGuide): Promise<TourGuide> {
    const [newGuide] = await db.insert(tourGuides).values(guide).returning();
    return newGuide;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
  }

  async updateBookingStatus(id: number, status: string, paymentIntentId?: string): Promise<Booking | undefined> {
    const updateData: { status: string; stripePaymentIntentId?: string } = { status };
    if (paymentIntentId) {
      updateData.stripePaymentIntentId = paymentIntentId;
    }
    const [updated] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
