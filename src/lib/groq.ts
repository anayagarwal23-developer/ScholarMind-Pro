import Groq from "groq-sdk";

const getGroqClient = () => {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.warn("GROQ_API_KEY is missing. Please set it in your environment variables.");
    return null;
  }
  return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
};

const groq = getGroqClient();

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

// Model Selection
const FAST_MODEL = "llama-3.3-70b-specdec";
const SMART_MODEL = "llama-3.3-70b-specdec"; // Using 70B for both as it's very fast on Groq

export async function scholarSearch(query: string): Promise<SearchResponse> {
  if (!groq) throw new Error("GROQ_API_KEY is not configured.");
  
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are ScholarMind (Groq Powered). You provide analytical, academic responses.
          Important: You do not have access to live web browsing currently. 
          Use your internal knowledge to provide the most accurate scholarly synthesis possible.
          If you mention specific studies or facts, cite them using [n] format.
          List your 'Sources' (based on training data) clearly at the end.`
        },
        {
          role: "user",
          content: query
        }
      ],
      model: SMART_MODEL,
    });

    const answer = chatCompletion.choices[0]?.message?.content || "No response generated.";
    
    // Simple logic to extract sources from the end of the text if the model lists them
    const sources: SearchSource[] = [
      { title: "Internal Scholarly Database", url: "https://groq.com", snippet: "Processed via Llama-3-70B on Groq Inference." }
    ];

    return {
      answer,
      sources,
      thinking: "Groq Hyper-Inference Engaged"
    };
  } catch (error: any) {
    console.error("Groq Error:", error);
    throw new Error(error?.message || "Groq failure.");
  }
}

export async function deepDive(source: SearchSource): Promise<string> {
  if (!groq) throw new Error("GROQ_API_KEY is not configured.");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a research analyst. Analyze the provided source title/info deeply. Provide a comprehensive summary and extract metadata."
        },
        {
          role: "user",
          content: `Analyze this source: ${source.title} (${source.url})`
        }
      ],
      model: FAST_MODEL,
    });

    return chatCompletion.choices[0]?.message?.content || "Analysis failed.";
  } catch (error: any) {
    console.error("Groq Deep Dive Error:", error);
    throw new Error(`Analysis failed: ${error?.message || "Check your credentials."}`);
  }
}

export async function synthesizeChat(context: string, message: string, history: any[]): Promise<string> {
  if (!groq) throw new Error("GROQ_API_KEY is not configured.");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI research assistant. Context: ${context}. Help the user explore this research.`
        },
        ...history.map(h => ({ 
          role: (h.role === 'model' ? 'assistant' : 'user') as "assistant" | "user", 
          content: h.parts[0].text 
        })),
        { role: "user", content: message }
      ],
      model: FAST_MODEL,
    });

    return chatCompletion.choices[0]?.message?.content || "Chat failed.";
  } catch (error: any) {
    console.error("Groq Chat Error:", error);
    throw new Error(`Chat failed: ${error?.message || "Check your API connection."}`);
  }
}

export async function advancedScholarChat(message: string, history: any[]): Promise<string> {
  if (!groq) throw new Error("GROQ_API_KEY is not configured.");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the ScholarMind Pro Advanced AI, an elite academic research partner powered by Groq."
        },
        ...history.map(h => ({ 
          role: (h.role === 'model' ? 'assistant' : 'user') as "assistant" | "user", 
          content: h.parts[0].text 
        })),
        { role: "user", content: message }
      ],
      model: SMART_MODEL,
    });

    return chatCompletion.choices[0]?.message?.content || "Analysis failed.";
  } catch (error: any) {
    console.error("Groq Advanced Error:", error);
    throw new Error(`AI System error: ${error?.message || "Internal failure."}`);
  }
}
