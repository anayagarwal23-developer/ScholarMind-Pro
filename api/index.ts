import express from "express";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// Initialize Gemini Helper
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Routes
app.get("/api/config", (req, res) => {
  const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  res.json({ hasGeminiKey: !!rawKey && rawKey.trim().length > 0 });
});

app.post("/api/research", async (req, res) => {
  const { query, strictness, personality } = req.body;
  const ai = getGeminiClient();
  if (!ai) return res.status(500).json({ error: "GEMINI_API_KEY is missing or invalid." });

  let systemInstruction = "You are an objective, informational academic research engine. Summarize scholarly consensus.";
  if (strictness === 'strict') systemInstruction += " Be extremely rigorous.";
  if (personality === 'analytical') systemInstruction += " Use methodical tone.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: query,
      config: {
        systemInstruction,
      }
    });
    res.json({ answer: response.text || "No result." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/deep-dive", async (req, res) => {
  const { source } = req.body;
  const ai = getGeminiClient();
  if (!ai) return res.status(500).json({ error: "GEMINI_API_KEY not configured." });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Analyze: ${source.title}`,
      config: {
        systemInstruction: "Analyze methodology."
      }
    });
    res.json({ analysis: response.text || "Analysis failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { context, message, history } = req.body;
  const ai = getGeminiClient();
  if (!ai) return res.status(500).json({ error: "GEMINI_API_KEY not configured." });
  try {
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction: `Context: ${context}`
      }
    });
    res.json({ response: response.text || "Chat failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
