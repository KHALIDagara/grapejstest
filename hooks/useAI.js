import { useState } from 'react';
import DOMPurify from 'dompurify';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  // --- HELPER: Fix & Sanitize HTML ---
  const sanitizeHtml = (html) => {
    try {
      let clean = html.replace(/```html/g, '').replace(/```/g, '');
      const sanitized = DOMPurify.sanitize(clean, {
        USE_PROFILES: { html: true },
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
    
    const syntaxRules = `
      CRITICAL SYNTAX RULES:
      1. ATTRIBUTES: Close all attributes with double quotes (style="...").
      2. VOID TAGS: Self-close void tags (<img />, <br />).
      3. CLEAN OUTPUT: Raw HTML only. No Markdown.
    `;

    const themeContext = pageTheme ? `
      PAGE THEME:
      - Primary: ${pageTheme.primaryColor || 'Default'}
      - Font: ${pageTheme.fontFamily || 'Default'}
      - Radius: ${pageTheme.borderRadius || '0px'}
    ` : '';

    let systemPrompt = '';

    if (selectedContext) {
        // --- THE FIX: STRICT SCOPE ENFORCEMENT ---
        // We inject the tagName and force the AI to respect it.
        const tag = selectedContext.tagName.toLowerCase(); // e.g., 'button', 'img', 'div'
        
        systemPrompt = `
           You are an expert web developer refining a SINGLE existing component.
           ${syntaxRules}
           ${themeContext}
           
           CONTEXT:
           User selected element: <${tag.toUpperCase()}>
           Current HTML:
           \`\`\`html
           ${selectedContext.currentHTML}
           \`\`\`
           
           USER REQUEST: "${userText}"
           
           CRITICAL RULES FOR REFINEMENT:
           1. KEEP THE ROOT TAG: You must return a <${tag}> ... </${tag}>. 
           2. NO WRAPPERS: Do NOT wrap the element in a container (div, section).
           3. NO SIBLINGS: Do NOT add extra elements outside the root tag.
           4. ONLY UPDATE STYLES/CONTENT: Modify the inline styles and internal text only.
           
           Example:
           If selected is <button>, output must be <button style="...">...</button>
           Do NOT output <div...><button...></button></div>
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
                if (onStreamUpdate) onStreamUpdate(fullText);
              }
            } catch (e) {}
          }
        }
      }

      setIsThinking(false);
      
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
