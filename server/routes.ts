import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerTTSRoutes } from "./replit_integrations/audio/tts";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerTTSRoutes(app);

  // Tour Spots Routes
  app.get(api.spots.list.path, async (req, res) => {
    const spots = await storage.getSpots();
    res.json(spots);
  });

  app.get(api.spots.get.path, async (req, res) => {
    const spot = await storage.getSpot(Number(req.params.id));
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found' });
    }
    res.json(spot);
  });

  // Seed data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingSpots = await storage.getSpots();
  if (existingSpots.length === 0) {
    const spots = [
      {
        nameEn: "The Great Wall of China",
        nameZh: "长城",
        descriptionEn: "The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states and Imperial China as protection against various nomadic groups from the Eurasian Steppe.",
        descriptionZh: "长城是古代中国为抵御不同时期塞北游牧部落联盟侵袭而修筑的规模浩大的军事工程的统称。",
        lat: 40.4319,
        lng: 116.5704,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/1200px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg",
        category: "historical"
      },
      {
        nameEn: "Forbidden City",
        nameZh: "紫禁城",
        descriptionEn: "The Forbidden City is a palace complex in Dongcheng District, Beijing, China, at the center of the Imperial City of Beijing.",
        descriptionZh: "紫禁城是明清两代的皇家宫殿，位于北京中轴线的中心，是中国古代宫廷建筑之精华。",
        lat: 39.9163,
        lng: 116.3972,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Forbidden_City_Beijing_Shenwu_Gate_20171025.jpg/1200px-Forbidden_City_Beijing_Shenwu_Gate_20171025.jpg",
        category: "historical"
      },
      {
        nameEn: "Terracotta Warriors",
        nameZh: "兵马俑",
        descriptionEn: "The Terracotta Army is a collection of terracotta sculptures depicting the armies of Qin Shi Huang, the first Emperor of China.",
        descriptionZh: "兵马俑是秦始皇陵的陪葬坑，位于陕西省西安市临潼区秦始皇陵以东1.5千米处。",
        lat: 34.3841,
        lng: 109.2785,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Terracotta_Army%2C_View_of_Pit_1.jpg/1200px-Terracotta_Army%2C_View_of_Pit_1.jpg",
        category: "historical"
      },
      {
        nameEn: "Summer Palace",
        nameZh: "颐和园",
        descriptionEn: "The Summer Palace is a vast ensemble of lakes, gardens and palaces in Beijing. It was an imperial garden in the Qing Dynasty.",
        descriptionZh: "颐和园，中国清朝时期皇家园林，前身为清漪园，坐落在北京西郊，距城区十五公里，占地约二百九十公顷。",
        lat: 39.9997,
        lng: 116.2755,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Summer_Palace_Beijing_2019.jpg/1200px-Summer_Palace_Beijing_2019.jpg",
        category: "historical"
      },
      {
        nameEn: "Li River",
        nameZh: "漓江",
        descriptionEn: "The Li River or Lijiang is a river in the Guangxi Zhuang Autonomous Region of China.",
        descriptionZh: "漓江，位于广西壮族自治区东北部，属珠江流域西江水系，为支流桂江上游河段的通称。",
        lat: 24.7915,
        lng: 110.4905,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Li_River_Guilin_Yangshuo.jpg/1200px-Li_River_Guilin_Yangshuo.jpg",
        category: "nature"
      }
    ];

    for (const spot of spots) {
      await storage.createSpot(spot);
    }
  }
}
