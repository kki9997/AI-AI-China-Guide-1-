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
        success_url: `${baseUrl}/booking/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/booking/cancel?booking_id=${booking.id}`,
        metadata: {
          bookingId: booking.id.toString(),
          guideId: guide.id.toString(),
          userId: user.id,
        },
      });

      // Store session ID in database for verification
      if (session.id) {
        await storage.updateBookingSessionId(booking.id, session.id);
      }

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

  // Update booking status after successful payment with Stripe verification
  app.post("/api/bookings/:id/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const bookingId = parseInt(req.params.id);
      const { sessionId } = req.body;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Already confirmed, return idempotently
      if (booking.status === "confirmed") {
        const guide = await storage.getGuide(booking.guideId);
        return res.json({ ...booking, guide });
      }
      
      if (booking.status !== "pending") {
        return res.status(400).json({ error: "Booking cannot be confirmed" });
      }

      // Verify Stripe session if provided
      if (sessionId) {
        try {
          const stripe = await getUncachableStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          
          // Verify session matches booking
          if (session.metadata?.bookingId !== bookingId.toString()) {
            return res.status(400).json({ error: "Session does not match booking" });
          }
          
          // Verify payment was successful
          if (session.payment_status !== "paid") {
            return res.status(400).json({ error: "Payment not completed" });
          }

          // Update with payment intent ID
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;
          
          const updated = await storage.updateBookingStatus(bookingId, "confirmed", paymentIntentId);
          const guide = await storage.getGuide(booking.guideId);
          
          
          return res.json({ ...updated, guide });
        } catch (stripeError) {
          console.error("Stripe verification error:", stripeError);
          return res.status(400).json({ error: "Payment verification failed" });
        }
      }

      // No session provided - check stored session in database
      if (booking.stripeSessionId) {
        try {
          const stripe = await getUncachableStripeClient();
          const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
          
          if (session.payment_status === "paid") {
            const paymentIntentId = typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent?.id;
            
            const updated = await storage.updateBookingStatus(bookingId, "confirmed", paymentIntentId);
            const guide = await storage.getGuide(booking.guideId);
            return res.json({ ...updated, guide });
          }
        } catch (stripeError) {
          console.error("Stripe session check error:", stripeError);
        }
      }

      return res.status(400).json({ error: "Payment verification required" });
    } catch (error) {
      console.error("Error confirming booking:", error);
      res.status(500).json({ error: "Failed to confirm booking" });
    }
  });

  // Cancel booking - only pending bookings can be cancelled
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

      // Only allow cancelling pending bookings
      if (booking.status === "cancelled") {
        return res.json(booking); // Already cancelled, idempotent
      }
      
      if (booking.status !== "pending") {
        return res.status(400).json({ error: "Only pending bookings can be cancelled" });
      }

      const updated = await storage.updateBookingStatus(bookingId, "cancelled");
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Stripe webhook for server-side payment verification
  // Requires STRIPE_WEBHOOK_SECRET to be set for signature verification
  // Primary verification is also done via confirm endpoint with Stripe API validation
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      // Require webhook secret for security
      if (!webhookSecret) {
        console.warn("STRIPE_WEBHOOK_SECRET not configured - webhook disabled");
        return res.status(503).json({ error: "Webhook not configured" });
      }
      
      const stripe = await getUncachableStripeClient();
      
      // Get raw body and signature for verification
      const rawBody = (req as any).rawBody;
      const sig = req.headers['stripe-signature'];
      
      if (!sig || !rawBody) {
        return res.status(400).json({ error: "Missing signature or body" });
      }
      
      let event;
      
      // Verify signature - mandatory for security
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        
        // Verify payment was successful
        if (session.payment_status === "paid") {
          const bookingId = session.metadata?.bookingId;
          
          if (bookingId) {
            const booking = await storage.getBooking(parseInt(bookingId));
            
            if (booking && booking.status === "pending") {
              const paymentIntentId = typeof session.payment_intent === 'string' 
                ? session.payment_intent 
                : session.payment_intent?.id;
              
              await storage.updateBookingStatus(
                parseInt(bookingId), 
                "confirmed", 
                paymentIntentId
              );
              
              console.log(`Booking ${bookingId} confirmed via webhook`);
            }
          }
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  });
}
