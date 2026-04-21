// Client-side library to interact with our secure Groq backend
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

export async function scholarSearch(query: string, options?: { strictness?: string, personality?: string }): Promise<SearchResponse> {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ...options })
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Research failed.");
  }

  const data = await res.json();
  return {
    answer: data.answer,
    sources: [{ title: "Internal Academic Index", url: "https://groq.com", snippet: "High-speed Llama-3-70B synthesis." }],
    thinking: "Groq Speed Active"
  };
}

export async function deepDive(source: SearchSource): Promise<string> {
  const res = await fetch("/api/deep-dive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source })
  });
  
  if (!res.ok) throw new Error("Deep dive failed.");
  const data = await res.json();
  return data.analysis;
}

export async function synthesizeChat(context: string, message: string, history: any[]): Promise<string> {
  const cleanHistory = history.map(h => ({ role: h.role, content: h.parts[0].text }));
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, message, history: cleanHistory })
  });
  
  if (!res.ok) throw new Error("Chat failed.");
  const data = await res.json();
  return data.response;
}

export async function advancedScholarChat(message: string, history: any[]): Promise<string> {
  return synthesizeChat("Advanced Scholarly Mode", message, history);
}

export async function checkConfig(): Promise<boolean> {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    return data.hasGroqKey;
  } catch {
    return false;
  }
}
