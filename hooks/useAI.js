import { useState } from 'react';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  // We no longer manage 'messages' state here. 
  // We accept the CURRENT history to send to the API.
  const generateResponse = async (userText, history, selectedContext, pageTheme, onStreamUpdate, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);

    // --- CONSTRUCT SYSTEM PROMPT ---
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
           2. **Use Inline CSS** (style="...") for all styling. 
           3. Do NOT use classes.
        `;
    } else {
        systemPrompt = `
           You are an expert GrapesJS developer.
           ${themeContext}
           INSTRUCTIONS:
           1. Output ONLY valid HTML.
           2. Start directly with <section>/<div>.
           3. **Use Inline CSS** (style="...") for all styling.
           4. Do NOT use classes.
        `;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_AI_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'system', content: systemPrompt }, ...history]
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
                // Call the parent to update the "Streaming" message
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
