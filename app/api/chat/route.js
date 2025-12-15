import { NextResponse } from 'next/server';

// Optional: Increase timeout for complex reasoning
export const maxDuration = 30; 

export async function POST(req) {
  try {
    const { messages, model, tools, tool_choice } = await req.json();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL,
        "X-Title": "GrapesJS AI Builder",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        tools: tools,           // <--- Critical: Pass tools to provider
        tool_choice: tool_choice
      })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter Error: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
