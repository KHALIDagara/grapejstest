import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use Edge for faster streaming

export async function POST(req) {
  try {
    const { messages, model } = await req.json();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, // Server-side key (no NEXT_PUBLIC needed)
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL,
        "X-Title": "GrapesJS AI Builder",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter Error: ${response.statusText}`);
    }

    // Return the stream directly to the client
    return new Response(response.body, {
      headers: { 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
