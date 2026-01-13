import { tourSpots, type TourSpot, type InsertTourSpot } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";
import { chatStorage } from "./replit_integrations/chat/storage";

export interface IStorage {
  // Tour Spots
  getSpots(): Promise<TourSpot[]>;
  getSpot(id: number): Promise<TourSpot | undefined>;
  createSpot(spot: InsertTourSpot): Promise<TourSpot>;
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
}

export const storage = new DatabaseStorage();
