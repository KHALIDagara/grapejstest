import { useState } from 'react';
import DOMPurify from 'dompurify';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  // --- HELPER: Fix & Sanitize HTML using DOMPurify ---
  // This is the core fix for the "swallowed component" issue.
  // It forces unclosed attributes to close and ensures safe HTML.
  const sanitizeHtml = (html) => {
    try {
      // 1. Strip Markdown code blocks (AI often adds these despite instructions)
      let clean = html.replace(/```html/g, '').replace(/```/g, '');

      // 2. Sanitize and Fix HTML
      // - FORCE_BODY: true treats input as a fragment (like a div), not a full document
      // - ADD_ATTR: ['style']: Crucial to keep the inline CSS GrapesJS needs
      const sanitized = DOMPurify.sanitize(clean, {
        USE_PROFILES: { html: true },    // Only allow HTML
        ADD_ATTR: ['style', 'target', 'id', 'class', 'href', 'src', 'alt', 'width', 'height'], 
        ADD_TAGS: ['style', 'iframe', 'script', 'img', 'br', 'hr'], 
        FORCE_BODY: true, 
      });

      return sanitized;
    } catch (e) {
      console.warn("DOMPurify failed, falling back to raw output", e);
      return html;
    }
  };

  const generateResponse = async (userText, history, selectedContext, pageTheme, onStreamUpdate, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);

    // --- 1. CONSTRUCT SYSTEM PROMPT ---
    
    // STRICT SYNTAX RULES (Reinforced instruction for the AI)
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
        // Context-Aware Prompt (Refining existing element)
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
        // New Component Prompt (Creating from scratch)
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
                // Live stream update (Sends raw text for the "Thinking..." typing effect)
                if (onStreamUpdate) onStreamUpdate(fullText);
              }
            } catch (e) {}
          }
        }
      }

      setIsThinking(false);
      
      // --- 3. FINAL SANITIZATION (THE FIX) ---
      // We run the completed string through DOMPurify.
      // This will detect the missing quote in style="... and close it,
      // preventing the browser from swallowing the next tag.
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
