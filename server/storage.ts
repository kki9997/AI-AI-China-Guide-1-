import { tourSpots, tourGuides, type TourSpot, type InsertTourSpot, type TourGuide, type InsertTourGuide } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { chatStorage } from "./replit_integrations/chat/storage";

export interface IStorage {
  getSpots(): Promise<TourSpot[]>;
  getSpot(id: number): Promise<TourSpot | undefined>;
  createSpot(spot: InsertTourSpot): Promise<TourSpot>;
  getGuides(): Promise<TourGuide[]>;
  getGuide(id: number): Promise<TourGuide | undefined>;
  createGuide(guide: InsertTourGuide): Promise<TourGuide>;
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
}

export const storage = new DatabaseStorage();
