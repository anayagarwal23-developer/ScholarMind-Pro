import express from "express";
import "dotenv/config";
import Groq from "groq-sdk";

const app = express();
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
  const { query, strictness, personality } = req.body;
  if (!groq) return res.status(500).json({ error: "GROQ_API_KEY is missing. Please add it to your project secrets in the sidebar settings." });

  let systemPrompt = "You are an objective, informational research engine. Your task is to provide direct, factual, and scholarly summaries grounded in academic consensus. Do NOT use conversational fillers. Start your response immediately with the information requested. Use primary source logic and citations [n].";

  if (strictness === 'strict') {
    systemPrompt += " Be extremely rigorous. Only include information with near-absolute academic certainty. Avoid any controversial or fringe theories unless specifically requested.";
  } else if (strictness === 'loose') {
    systemPrompt += " You may include emerging research and a broader range of scholarly perspectives, including notable fringe theories if they are relevant.";
  }

  if (personality === 'analytical') {
    systemPrompt += " Your tone should be highly methodical and data-driven. Focus heavily on methodologies and statistical significance.";
  } else if (personality === 'creative') {
    systemPrompt += " While remaining scholarly, use metaphors and diverse interdisciplinary connections to explain complex concepts.";
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
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

export default app;
