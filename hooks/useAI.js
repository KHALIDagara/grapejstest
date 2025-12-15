import { useState } from 'react';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  // Helper: Use the browser to fix malformed HTML (unclosed tags, etc.)
  const sanitizeHtml = (html) => {
    try {
      // 1. Strip Markdown code blocks if the AI adds them
      let clean = html.replace(/```html/g, '').replace(/```/g, '');
      
      // 2. Browser Native Parser to fix unclosed tags
      const parser = new DOMParser();
      const doc = parser.parseFromString(clean, 'text/html');
      return doc.body.innerHTML;
    } catch (e) {
      console.warn("HTML Sanitization failed, using raw output", e);
      return html;
    }
  };

  const generateResponse = async (userText, history, selectedContext, pageTheme, onStreamUpdate, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);

    // --- 1. CONSTRUCT SYSTEM PROMPT ---
    
    // STRICT SYNTAX RULES (Crucial for GrapesJS)
    const syntaxRules = `
      CRITICAL SYNTAX RULES:
      1. ATTRIBUTES: You MUST close all attributes with double quotes. 
         - CORRECT: style="width: 100%; color: black;"
         - WRONG: style="width: 100%; color: black
      2. VOID TAGS: Always self-close void tags (e.g., <img />, <br />, <hr />).
      3. CLEAN OUTPUT: Return raw HTML only. NO markdown blocks (\`\`\`), NO explanations.
    `;

    // Page Theme Injection
    const themeContext = pageTheme ? `
      PAGE THEME SETTINGS:
      - Primary: ${pageTheme.primaryColor || 'Default'}
      - Font: ${pageTheme.fontFamily || 'Default'}
      - Radius: ${pageTheme.borderRadius || '0px'}
      INSTRUCTION: Apply these styles using inline CSS.
    ` : '';

    let systemPrompt = '';

    if (selectedContext) {
        // Context-Aware Prompt
        systemPrompt = `
           You are an expert web developer refining a specific component.
           ${syntaxRules}
           ${themeContext}
           
           CONTEXT:
           User selected: <${selectedContext.tagName}>
           Current HTML:
           \`\`\`html
           ${selectedContext.currentHTML}
           \`\`\`
           
           USER REQUEST: "${userText}"
           
           INSTRUCTIONS:
           1. Return ONLY the updated HTML for this component.
           2. Use Inline CSS (style="...") strictly.
           3. Do not use external classes.
        `;
    } else {
        // New Component Prompt
        systemPrompt = `
           You are an expert GrapesJS component generator.
           ${syntaxRules}
           ${themeContext}
           
           USER REQUEST: "${userText}"
           
           INSTRUCTIONS:
           1. Create a responsive, beautiful HTML structure.
           2. Start strictly with a <div style="..."> wrapper.
           3. Use Inline CSS (style="...") for all styling.
        `;
    }

    // --- 2. PREPARE MESSAGES ---
    const apiMessages = history.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.text || msg.content
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
                // Live stream update (Raw text for typing effect)
                if (onStreamUpdate) onStreamUpdate(fullText);
              }
            } catch (e) {}
          }
        }
      }

      setIsThinking(false);
      
      // FINAL STEP: Sanitize before sending to GrapesJS
      // This fixes the specific error where the browser "swallows" tags due to unclosed quotes
      const finalHtml = sanitizeHtml(fullText);
      
      if (onComplete) onComplete(finalHtml);

    } catch (error) {
      console.error(error);
      setIsThinking(false);
      if (onStreamUpdate) onStreamUpdate("Error: " + error.message);
    }
  };

  return { isThinking, generateResponse };
}
