import { NextResponse } from 'next/server';

// Optional: Increase timeout for complex reasoning
export const maxDuration = 30;

export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, model, tools, tool_choice } = body;

    console.log("📨 [API] Incoming Request:", JSON.stringify({ model, toolsCount: tools?.length, tool_choice, messageCount: messages?.length }, null, 2));
    // console.log("📨 [API] Full Messages:", JSON.stringify(messages, null, 2)); // Uncomment for full history

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
        tools: tools,
        tool_choice: tool_choice
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ [API] OpenRouter Error:", response.status, err);
      throw new Error(`OpenRouter Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    console.log("✅ [API] OpenRouter Success:", JSON.stringify(data.usage || {}, null, 2));
    return NextResponse.json(data);

  } catch (error) {
    console.error("🔥 [API] Route Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
