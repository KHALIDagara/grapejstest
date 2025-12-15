import { useState } from 'react';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  const generateResponse = async (userText, history, selectedContext, pageTheme, onStreamUpdate, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);

    // --- 1. CONSTRUCT SYSTEM PROMPT ---
    let systemPrompt = '';
    
    // Inject Page Theme into the Prompt
    const themeContext = pageTheme ? `
      PAGE THEME SETTINGS (STRICT):
      The user has defined these specific styles for this page:
      - Primary Color: ${pageTheme.primaryColor || 'Default'}
      - Secondary Color: ${pageTheme.secondaryColor || 'Default'}
      - Font Family: ${pageTheme.fontFamily || 'Default'}
      - Border Radius: ${pageTheme.borderRadius || '0px'}
      
      INSTRUCTION: Use these exact values in your inline CSS (e.g., style="color: ${pageTheme.primaryColor}").
    ` : '';

    if (selectedContext) {
        systemPrompt = `
           You are an expert web developer.
           The user has selected: <${selectedContext.tagName}>.
           CURRENT HTML:
           \`\`\`html
           ${selectedContext.currentHTML}
           \`\`\`
           ${themeContext}
           USER REQUEST: "${userText}"
           INSTRUCTIONS:
           1. Return ONLY the updated HTML.
           2. Use Inline CSS (style="...") for all styling. 
           3. Do NOT use classes.
        `;
    } else {
        systemPrompt = `
           You are an expert GrapesJS developer.
           ${themeContext}
           INSTRUCTIONS:
           1. Output ONLY valid HTML.
           2. Start directly with <section>/<div>.
           3. Use Inline CSS (style="...") for all styling.
           4. Do NOT use classes.
        `;
    }

    // --- 2. SANITIZE MESSAGES FOR API (THE FIX) ---
    // The store uses 'bot'/'text', but API needs 'assistant'/'content'
    const apiMessages = history.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.text || msg.content // Handle both keys
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_AI_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'system', content: systemPrompt }, ...apiMessages]
        })
      });

      if (!response.ok) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") break;
            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                if (onStreamUpdate) onStreamUpdate(fullText);
              }
            } catch (e) {}
          }
        }
      }

      setIsThinking(false);
      if (onComplete) onComplete(fullText);

    } catch (error) {
      console.error(error);
      setIsThinking(false);
      if (onStreamUpdate) onStreamUpdate("Error: " + error.message);
    }
  };

  return { isThinking, generateResponse };
}
