import express from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Hyper-strict sanitization
const getSanitizedKey = () => {
  const raw = process.env.GROQ_API_KEY || "";
  return raw.replace(/[^\x20-\x7E]/g, "").trim();
};

const getGroqClient = () => {
  const key = getSanitizedKey();
  if (!key) return null;
  return new Groq({ apiKey: key });
};

// API Routes
app.get("/api/config", (req, res) => {
  res.json({ hasGroqKey: !!getSanitizedKey() });
});

app.post("/api/research", async (req, res) => {
  const { query, strictness, personality } = req.body;
  const groq = getGroqClient();
  if (!groq) return res.status(500).json({ error: "GROQ_API_KEY is missing or invalid." });

  let systemPrompt = "You are an objective, informational research engine. Summarize scholarly consensus.";

  if (strictness === 'strict') systemPrompt += " Be extremely rigorous.";
  if (personality === 'analytical') systemPrompt += " Use methodical tone.";

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
      model: "llama-3.3-70b-versatile",
    });
    res.json({ answer: completion.choices[0]?.message?.content || "No result." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/deep-dive", async (req, res) => {
  const { source } = req.body;
  const groq = getGroqClient();
  if (!groq) return res.status(500).json({ error: "GROQ_API_KEY not configured." });
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: "Analyze methodology." }, { role: "user", content: `Analyze: ${source.title}` }],
      model: "llama-3.1-8b-instant",
    });
    res.json({ analysis: completion.choices[0]?.message?.content || "Analysis failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { context, message, history } = req.body;
  const groq = getGroqClient();
  if (!groq) return res.status(500).json({ error: "GROQ_API_KEY not configured." });
  try {
    const messages = [
      { role: "system", content: `Context: ${context}` },
      ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
      { role: "user", content: message }
    ];
    const completion = await groq.chat.completions.create({ messages, model: "llama-3.3-70b-versatile" });
    res.json({ response: completion.choices[0]?.message?.content || "Chat failed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
const setupStatic = () => {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
};

if (process.env.NODE_ENV === "production" || process.env.VERCEL === '1') {
  setupStatic();
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

if (process.env.VERCEL !== '1') {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Local server: http://localhost:${PORT}`);
  });
}

export default app;
