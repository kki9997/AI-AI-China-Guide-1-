// Booking and payment routes for Dragon Tour
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { isAuthenticated } from "./replit_integrations/auth";
import { z } from "zod";

const PLATFORM_FEE_PERCENT = 0.05; // 5% commission

const createBookingSchema = z.object({
  guideId: z.number(),
  tourDate: z.string(),
  hours: z.number().min(1).max(12),
});

export function registerBookingRoutes(app: Express) {
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe key:", error);
      res.status(500).json({ error: "Failed to get payment configuration" });
    }
  });

  // Create a booking and checkout session
  app.post("/api/bookings/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const parsed = createBookingSchema.parse(req.body);
      
      const guide = await storage.getGuide(parsed.guideId);
      if (!guide) {
        return res.status(404).json({ error: "Guide not found" });
      }

      // Calculate pricing with 5% platform fee
      const guideRate = guide.hourlyRate * parsed.hours;
      const platformFee = Math.round(guideRate * PLATFORM_FEE_PERCENT * 100) / 100;
      const totalAmount = guideRate + platformFee;
      const totalAmountCents = Math.round(totalAmount * 100);

      // Create booking record
      const booking = await storage.createBooking({
        userId: user.id,
        guideId: parsed.guideId,
        tourDate: new Date(parsed.tourDate),
        hours: parsed.hours,
        guideRate,
        platformFee,
        totalAmount,
        status: "pending",
      });

      // Create Stripe checkout session
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "cny",
              product_data: {
                name: `Tour with ${guide.nameEn} (${guide.nameZh})`,
                description: `${parsed.hours} hour(s) on ${new Date(parsed.tourDate).toLocaleDateString()}`,
              },
              unit_amount: totalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/booking/success?booking_id=${booking.id}`,
        cancel_url: `${baseUrl}/booking/cancel?booking_id=${booking.id}`,
        metadata: {
          bookingId: booking.id.toString(),
          guideId: guide.id.toString(),
          userId: user.id,
        },
      });

      res.json({ 
        url: session.url,
        bookingId: booking.id,
        breakdown: {
          guideRate,
          platformFee,
          totalAmount,
        }
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(400).json({ error: error.message || "Failed to create checkout" });
    }
  });

  // Get user's bookings
  app.get("/api/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userBookings = await storage.getUserBookings(user.id);
      
      // Enrich with guide info
      const enrichedBookings = await Promise.all(
        userBookings.map(async (booking) => {
          const guide = await storage.getGuide(booking.guideId);
          return { ...booking, guide };
        })
      );
      
      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Get single booking
  app.get("/api/bookings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const guide = await storage.getGuide(booking.guideId);
      res.json({ ...booking, guide });
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  // Update booking status after successful payment (called by success page)
  app.post("/api/bookings/:id/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateBookingStatus(bookingId, "confirmed");
      res.json(updated);
    } catch (error) {
      console.error("Error confirming booking:", error);
      res.status(500).json({ error: "Failed to confirm booking" });
    }
  });

  // Cancel booking
  app.post("/api/bookings/:id/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateBookingStatus(bookingId, "cancelled");
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });
}
