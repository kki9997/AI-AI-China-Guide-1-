import { z } from 'zod';
import { insertTourSpotSchema, tourSpots, tourGuides } from './schema';

export const api = {
  spots: {
    list: {
      method: 'GET' as const,
      path: '/api/spots',
      responses: {
        200: z.array(z.custom<typeof tourSpots.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/spots/:id',
      responses: {
        200: z.custom<typeof tourSpots.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  guides: {
    list: {
      method: 'GET' as const,
      path: '/api/guides',
      responses: {
        200: z.array(z.custom<typeof tourGuides.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/guides/:id',
      responses: {
        200: z.custom<typeof tourGuides.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
