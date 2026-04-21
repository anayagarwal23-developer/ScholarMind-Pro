import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Groq
  const groq = process.env.GROQ_API_KEY 
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({ hasGroqKey: !!process.env.GROQ_API_KEY });
  });

  app.post("/api/research", async (req, res) => {
    const { query } = req.body;
    if (!groq) return res.status(500).json({ error: "GROQ_API_KEY not configured on server." });

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are an objective, informational research engine. Your task is to provide direct, factual, and scholarly summaries grounded in academic consensus. Do NOT use conversational fillers (e.g., 'Hello', 'I hope you\'re having a good day', 'How can I help you today?'). Start your response immediately with the information requested. Use primary source logic and citations [n]." 
          },
          { role: "user", content: query }
        ],
        model: "llama-3.3-70b-versatile",
      });
      res.json({ answer: completion.choices[0]?.message?.content || "No result." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deep-dive", async (req, res) => {
    const { source } = req.body;
    if (!groq) return res.status(500).json({ error: "GROQ_API_KEY not configured." });

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Analyze the provided source deeply. Focus on methodology, primary findings, and academic significance." },
          { role: "user", content: `Analyze: ${source.title} (${source.url})` }
        ],
        model: "llama-3.1-8b-instant",
      });
      res.json({ analysis: completion.choices[0]?.message?.content || "Analysis failed." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { context, message, history } = req.body;
    if (!groq) return res.status(500).json({ error: "GROQ_API_KEY not configured." });

    try {
      const messages = [
        { role: "system", content: `Context of research: ${context}. Help the user find primary sources and connections between data points.` },
        ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
        { role: "user", content: message }
      ];
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
      });
      res.json({ response: completion.choices[0]?.message?.content || "Chat failed." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
