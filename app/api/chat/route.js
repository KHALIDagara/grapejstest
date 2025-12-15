import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req) {
  try {
    const { messages, model } = await req.json();

    // Default to a model if none provided
    const aiModel = model || 'google/gemini-2.0-flash-exp:free';

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        "X-Title": "GrapesJS AI Builder",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: aiModel,
        messages: messages,
        stream: true, // Critical for the typing effect
        temperature: 0.7, // Adds slight creativity but keeps structure
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Error: ${response.status} - ${errorText}`);
    }

    // Return the stream directly to the client
    return new Response(response.body, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
