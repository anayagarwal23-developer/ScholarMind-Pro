import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

const ai = getAI();

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchResponse {
  answer: string;
  sources: SearchSource[];
  thinking?: string;
}

export async function scholarSearch(query: string): Promise<SearchResponse> {
  if (!ai) throw new Error("GEMINI_API_KEY is not configured. Please add it to your environment variables.");
  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: query }]
      }
    ],
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW
      },
      systemInstruction: `You are ScholarMind, a specialized research engine for academic rigor.
      Your goal is to provide deep, analytical, and authoritative answers derived from established scholarly work.
      
      CORE PRINCIPLES:
      - RIGOR: Use primary research, peer-reviewed journals (.edu), governmental data (.gov, .org), and long-form institutional reporting.
      - AUTHENTICITY: DO NOT use AI-generated summaries, blog posts from AI aggregators, or speculative AI-written articles. If a source looks like low-quality SEO or AI "summary slop," discard it.
      - CITATION: Every substantive claim MUST be cited with a bracketed number [n] corresponding to the source list.
      - DEPTH: Prefer complex, nuanced explanations over oversimplified summaries.
      - NEUTRALITY: Present scientific consensus clearly, but acknowledge minority scholarly perspectives if they are backed by rigorous data.
      
      FORMATTING:
      - Use standard Markdown.
      - Use clear headings to organize the research.
      - List citations clearly at the end.`,
      tools: [
        { googleSearch: {} }
      ],
    }
  });

  // Extract sources from groundings
  const sources: SearchSource[] = [];
  const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
  
  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Source",
          url: chunk.web.uri || "",
        });
      }
    });
  }

  // De-duplicate sources
  const uniqueSources = Array.from(new Map(sources.map(s => [s.url, s])).values());

  return {
    answer: result.text || "I apologize, but I could not synthesize an academic response for this query. It may be outside my current research parameters.",
    sources: uniqueSources,
    thinking: "Analytic mode engaged"
  };
}

export async function deepDive(source: SearchSource): Promise<string> {
  if (!ai) throw new Error("GEMINI_API_KEY is not configured.");
  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: `Analyze the following source deeply: ${source.title} (${source.url}). 
        Provide a comprehensive summary of its key arguments, methodology (if applicable), and its significance in its field. 
        Also, extract metadata for citation: Full Title, Authors, Publication Date, and Publisher.` }]
      }
    ],
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH
      },
      systemInstruction: "You are a research analyst. Use the provided URL to extract all relevant scholarly information. Be precise and academic in your summary.",
      tools: [{ googleSearch: {} }] // Using search to find more info about the specific URL if needed
    }
  });

  return result.text || "Could not perform deep analysis.";
}

export async function synthesizeChat(context: string, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  if (!ai) throw new Error("GEMINI_API_KEY is not configured.");
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: `CONTEXT OF CURRENT RESEARCH: \n${context}\n\nUSER QUESTION: ${message}` }]
      },
      ...history
    ],
    config: {
      systemInstruction: "You are an AI research assistant. You have access to the current research context. Help the user explore this research further, explain complex terms, or find connections. Be concise, scholarly, and helpful.",
      tools: [{ googleSearch: {} }]
    }
  });

  return result.text || "I'm sorry, I couldn't process that request.";
}

export async function advancedScholarChat(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  if (!ai) throw new Error("GEMINI_API_KEY is not configured.");
  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: `You are the ScholarMind Pro Advanced AI, an elite academic research partner powered by Gemini 3.1 Pro. 
      Your mission is to provide world-class scholarly analysis, data interpretation, and complex problem solving.
      
      CAPABILITIES:
      - DEEP DATA ANALYSIS: You can interpret complex datasets, statistical findings, and methodology papers.
      - ADVANCED CODING: Provide Python or R snippets for data visualization, statistical modeling (SPSS/STATA equivalents), and research automation.
      - GROUNDED REASONING: Always use the integrated Google Search tool to find the absolute latest peer-reviewed research, pre-prints, and institutional data.
      - ACADEMIC RIGOR: Maintain a professional, objective, and intellectually demanding tone. 
      - SYNTHESIS: Connect disparate fields of study (interdisciplinary analysis).
      
      When asked for research, always perform multiple searches to find high-quality primary sources (.gov, .edu, .org). Avoid popular media summaries when academic sources are available.`,
      tools: [{ googleSearch: {} }],
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH
      }
    }
  });

  return result.text || "Analysis failed. Please check your data connection.";
}
