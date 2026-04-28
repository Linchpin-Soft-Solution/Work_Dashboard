export async function generateSummary(text: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const prompt = `You are a professional assistant. Please summarize the following daily work logs of an employee into a clear, professional 3–5 sentence summary. Do not add any extra commentary or conversational text.

Logs:
${text}

Summary:`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://dashboard.linchpinsoftsolution.com",
      "X-Title": "Linchpin Dashboard",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemma-3-12b-it:free",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content;
  if (!summary) {
    throw new Error("No summary returned from OpenRouter.");
  }

  return summary.trim();
}
