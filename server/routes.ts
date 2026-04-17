import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerTTSRoutes } from "./replit_integrations/audio/tts";
import { registerBookingRoutes } from "./bookingRoutes";
import { registerAmapDoubaoRoutes } from "./amapDoubaoRoutes";
import { registerPhoneAuthRoutes } from "./phoneAuthRoutes";
import { registerGuideRoutes } from "./guideRegistrationRoutes";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  registerBookingRoutes(app);
  registerAmapDoubaoRoutes(app);
  registerPhoneAuthRoutes(app);
  registerGuideRoutes(app);

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

  // Tour Guides Routes
  app.get(api.guides.list.path, async (req, res) => {
    const guides = await storage.getGuides();
    res.json(guides);
  });

  app.get(api.guides.get.path, async (req, res) => {
    const guide = await storage.getGuide(Number(req.params.id));
    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }
    res.json(guide);
  });

  // Weather API - uses Open-Meteo (free, no API key needed)
  app.get("/api/weather", async (req, res) => {
    try {
      // Default to Zhuhai, China (can be made dynamic with user location)
      const lat = 22.27;
      const lng = 113.58;
      const city = "Zhuhai";
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Asia/Shanghai`
      );
      
      if (!response.ok) {
        throw new Error("Weather API error");
      }
      
      const data = await response.json();
      
      res.json({
        temperature: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        city: city
      });
    } catch (error) {
      console.error("Weather fetch error:", error);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  // AI Location Discovery - for unmapped locations
  app.post("/api/location-info", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude required" });
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `你是一位专业的中国旅游导游。根据用户提供的GPS坐标，用可爱活泼的台湾女生语气介绍这个位置附近的景点、历史文化或有趣的地方。
            
回答格式要求：
1. 首先判断这个坐标位于哪个城市/地区
2. 介绍附近最有名或最有趣的1-2个景点
3. 用简短生动的语言描述，不超过100字
4. 如果这个位置附近没有特别的景点，也可以介绍当地的特色美食、文化习俗或有趣的小知识

请直接给出介绍内容，不要说"根据坐标..."这样的前缀。`
          },
          {
            role: "user",
            content: `坐标：纬度 ${lat}，经度 ${lng}`
          }
        ],
        max_tokens: 200,
      });
      
      const content = response.choices[0]?.message?.content || "这里是一个美丽的地方，等待你来探索！";
      
      res.json({ description: content });
    } catch (error: any) {
      console.error("Location info error:", error);
      res.status(500).json({ error: "Failed to get location info" });
    }
  });

  // Seed data function
  await seedDatabase();
  await seedGuides();

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

async function seedGuides() {
  const existingGuides = await storage.getGuides();
  if (existingGuides.length === 0) {
    const guides = [
      {
        nameEn: "Li Wei",
        nameZh: "李伟",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
        languages: ["Chinese", "English"],
        bioEn: "Professional tour guide with 8 years of experience. Expert in Beijing historical sites including the Forbidden City and Great Wall.",
        bioZh: "专业导游，8年经验。精通北京历史景点，包括故宫和长城。",
        rating: 4.9,
        hourlyRate: 200,
        phone: "+86 138 0000 1234",
        wechat: "liwei_guide",
        specialties: ["History", "Architecture", "Photography"],
        city: "Beijing"
      },
      {
        nameEn: "Zhang Mei",
        nameZh: "张梅",
        photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop",
        languages: ["Chinese", "English", "Japanese"],
        bioEn: "Friendly local guide specializing in cultural experiences and hidden gems. Love sharing authentic local food spots!",
        bioZh: "友好的本地导游，专注于文化体验和小众景点。喜欢分享正宗的本地美食！",
        rating: 4.8,
        hourlyRate: 180,
        phone: "+86 139 0000 5678",
        wechat: "zhangmei_tour",
        specialties: ["Food", "Culture", "Shopping"],
        city: "Shanghai"
      },
      {
        nameEn: "Wang Jun",
        nameZh: "王军",
        photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop",
        languages: ["Chinese", "English"],
        bioEn: "Adventure guide for outdoor activities. Specializing in hiking, nature tours, and eco-tourism in Guangxi region.",
        bioZh: "户外活动向导。专注于广西地区的徒步、自然游览和生态旅游。",
        rating: 4.7,
        hourlyRate: 150,
        phone: "+86 137 0000 9012",
        wechat: "wangjun_adventure",
        specialties: ["Hiking", "Nature", "Photography"],
        city: "Guilin"
      },
      {
        nameEn: "Chen Xiaoli",
        nameZh: "陈小丽",
        photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop",
        languages: ["Chinese", "English", "Cantonese"],
        bioEn: "Local Zhuhai guide with deep knowledge of the Pearl River Delta. Perfect for coastal tours and island hopping!",
        bioZh: "珠海本地导游，深谙珠江三角洲。最适合海岸游和跳岛游！",
        rating: 4.9,
        hourlyRate: 160,
        phone: "+86 136 0000 3456",
        wechat: "chenxiaoli_zhuhai",
        specialties: ["Islands", "Seafood", "Local Life"],
        city: "Zhuhai"
      },
      {
        nameEn: "Liu Yang",
        nameZh: "刘洋",
        photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
        languages: ["Chinese", "English", "Korean"],
        bioEn: "History enthusiast and certified guide. Specializing in ancient Chinese dynasties and archaeological sites.",
        bioZh: "历史爱好者和认证导游。专注于中国古代王朝和考古遗址。",
        rating: 4.8,
        hourlyRate: 220,
        phone: "+86 135 0000 7890",
        wechat: "liuyang_history",
        specialties: ["History", "Museums", "Archaeology"],
        city: "Xi'an"
      }
    ];

    for (const guide of guides) {
      await storage.createGuide(guide);
    }
  }
}
