import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const AMAP_API_KEY = process.env.AMAP_API_KEY!;
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY!;

const doubaoClient = new OpenAI({
  apiKey: DOUBAO_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerAmapDoubaoRoutes(app: Express): void {
  // 高德地图 POI 接口 - 获取周边景点
  app.get("/api/amap/pois", async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = "2000" } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ error: "需要提供经纬度" });
      }

      // 高德地图 POI 搜索接口（注意：location 是 lng,lat 格式）
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_API_KEY}&location=${lng},${lat}&radius=${radius}&types=110000&offset=20&page=1&extensions=all`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("高德 API 请求失败");
      }

      const data = await response.json() as any;

      if (data.status !== "1") {
        throw new Error(data.info || "高德 API 返回错误");
      }

      const pois = (data.pois || []).map((poi: any) => {
        const [poiLng, poiLat] = poi.location.split(",");
        return {
          id: poi.id,
          name: poi.name,
          type: poi.type,
          address: poi.address || poi.pname + poi.cityname + poi.adname,
          lat: parseFloat(poiLat),
          lng: parseFloat(poiLng),
          distance: poi.distance,
          tel: poi.tel,
        };
      });

      res.json({ pois, total: pois.length });
    } catch (error: any) {
      console.error("高德 POI 错误:", error);
      res.status(500).json({ error: error.message || "获取周边景点失败" });
    }
  });

  // 豆包 API - 为景点生成趣味讲解
  app.post("/api/doubao/describe", async (req: Request, res: Response) => {
    try {
      const { name, type, address } = req.body;

      if (!name) {
        return res.status(400).json({ error: "需要提供景点名称" });
      }

      const prompt = `你是一位幽默风趣的旅游解说员，用活泼有趣的语气介绍景点。

请为以下景点生成两段讲解：
景点名称：${name}
${type ? `景点类型：${type}` : ""}
${address ? `地址：${address}` : ""}

要求：
1. 短版讲解：不超过50字，用于地图标注弹窗，要生动有趣
2. 长版讲解：不超过150字，用于详情展示，包含有趣的历史或文化小知识

请用以下JSON格式返回（不要包含其他文字）：
{"short":"短版讲解内容","long":"长版讲解内容"}`;

      let response;
      const doubaoModels = ["doubao-1.5-pro-32k", "doubao-seed-1.6", "doubao-pro-32k"];
      let doubaoSuccess = false;
      for (const model of doubaoModels) {
        try {
          response = await doubaoClient.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
          });
          doubaoSuccess = true;
          console.log(`豆包模型 ${model} 调用成功`);
          break;
        } catch (e: any) {
          console.warn(`豆包模型 ${model} 失败:`, e?.message);
        }
      }
      if (!doubaoSuccess) {
        console.log("所有豆包模型失败，切换至 OpenAI 备用");
        response = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400,
        });
      }

      const content = response.choices[0]?.message?.content || "";

      let result: { short: string; long: string };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { short: "", long: "" };
      } catch {
        result = { short: content.slice(0, 50), long: content.slice(0, 150) };
      }

      if (!result.short) result.short = `探索${name}，发现精彩！`;
      if (!result.long) result.long = `${name}是一处值得一游的好地方，等待你来发现它的魅力！`;

      res.json(result);
    } catch (error: any) {
      console.error("豆包 describe 错误:", error);
      res.status(500).json({ error: error.message || "生成讲解失败" });
    }
  });

  // Edge TTS - 微软神经台湾女声（HsiaoChen zh-TW-HsiaoChenNeural，台湾腔柔美女声）
  app.post("/api/doubao/tts", async (req: Request, res: Response) => {
    try {
      const { text, voice = "zh-TW-HsiaoChenNeural" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "需要提供文本内容" });
      }

      if (text.length > 500) {
        return res.status(400).json({ error: "文本过长（最多500字）" });
      }

      try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const chunks: Buffer[] = [];
        const { audioStream } = tts.toStream(text);

        await new Promise<void>((resolve, reject) => {
          audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
          audioStream.on("end", resolve);
          audioStream.on("error", reject);
        });

        const audioBuffer = Buffer.concat(chunks);
        console.log(`Edge TTS (${voice}) 合成成功，大小: ${audioBuffer.length} 字节`);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", audioBuffer.length);
        res.send(audioBuffer);
      } catch (edgeErr: any) {
        console.warn("Edge TTS 失败，切换至 OpenAI 备用:", edgeErr?.message);

        const openaiBackup = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });

        const backupResponse = await openaiBackup.chat.completions.create({
          model: "gpt-audio",
          modalities: ["text", "audio"],
          audio: { voice: "shimmer", format: "wav" },
          messages: [
            { role: "system", content: "你是一位可爱活泼的旅游讲解员，用生动的语气朗读以下内容。" },
            { role: "user", content: text }
          ],
          max_completion_tokens: 2048,
        });

        const audioData = backupResponse.choices[0]?.message?.audio;
        if (!audioData?.data) {
          return res.status(500).json({ error: "语音合成失败" });
        }

        const audioBuffer = Buffer.from(audioData.data, "base64");
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", audioBuffer.length);
        return res.send(audioBuffer);
      }
    } catch (error: any) {
      console.error("TTS 错误:", error);
      res.status(500).json({ error: error.message || "语音合成失败" });
    }
  });

  // 高德静态地图代理接口
  app.get("/api/amap/staticmap", async (req: Request, res: Response) => {
    try {
      const { location, zoom = "14", size = "750*400", markers } = req.query;

      if (!location) {
        return res.status(400).json({ error: "需要提供地图中心点坐标" });
      }

      let url = `https://restapi.amap.com/v3/staticmap?key=${AMAP_API_KEY}&location=${location}&zoom=${zoom}&size=${size}&scale=2`;

      if (markers) {
        url += `&markers=${encodeURIComponent(markers as string)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("高德静态地图请求失败");
      }

      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(buffer);
    } catch (error: any) {
      console.error("高德静态地图错误:", error);
      res.status(500).json({ error: error.message || "获取静态地图失败" });
    }
  });
}
