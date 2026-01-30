import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerTTSRoutes(app: Express): void {
  app.post("/api/tts", async (req: Request, res: Response) => {
    try {
      const { text, language = "zh" } = req.body;

      if (!text || text.length === 0) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 4000) {
        return res.status(400).json({ error: "Text is too long (max 4000 chars)" });
      }

      const systemPrompt = language === "zh" 
        ? "你是一个可爱的台湾女生导游，用甜美活泼的声音为游客介绍中国的景点。请用温柔亲切的语气朗读以下内容。"
        : "You are a friendly female tour guide. Read the following text in a warm and pleasant voice.";

      const response = await openai.chat.completions.create({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: {
          voice: "shimmer",
          format: "wav",
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_completion_tokens: 4096,
      });

      const audioData = response.choices[0]?.message?.audio;
      
      if (!audioData?.data) {
        return res.status(500).json({ error: "No audio generated" });
      }

      const audioBuffer = Buffer.from(audioData.data, "base64");
      
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", audioBuffer.length);
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(500).json({ error: error.message || "TTS generation failed" });
    }
  });
}
