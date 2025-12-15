import { useState, useRef } from 'react';

export function useAI() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! Select an element to edit it, or type here to build new sections.' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef([]);

  // Added `selectedContext` argument
  const sendMessage = async (userText, selectedContext, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);
    
    // UI Update
    const newHistory = [...historyRef.current, { role: 'user', content: userText }];
    historyRef.current = newHistory;
    
    setMessages(prev => [
      ...prev, 
      { role: 'user', text: userText },
      { role: 'bot', text: '' }
    ]);

    // --- DYNAMIC SYSTEM PROMPT ---
    let systemPrompt = '';
    
    if (selectedContext) {
        // MODE A: EDITING SPECIFIC ELEMENT
        systemPrompt = `
           You are an expert web developer.
           The user has selected a specific HTML component: <${selectedContext.tagName}>.
           
           CURRENT HTML OF SELECTION:
           \`\`\`html
           ${selectedContext.currentHTML}
           \`\`\`

           USER REQUEST: "${userText}"

           INSTRUCTIONS:
           1. Return the **UPDATED HTML** for this component only.
           2. Do NOT wrap it in <html> or <body>.
           3. Maintain the original ID if possible, or allow GrapesJS to handle it.
           4. You can add Tailwind classes or inline styles.
           5. Output ONLY the code. No markdown.
        `;
    } else {
        // MODE B: GLOBAL GENERATION
        systemPrompt = `
           You are an expert GrapesJS developer.
           1. Output ONLY valid HTML. No Markdown backticks.
           2. No <html>/<body> tags. Start with <section>/<div>.
           3. Add 'data-gjs-name="Layer Name"' to major elements.
           4. Use inline styles or <style> tags.
        `;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_AI_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'system', content: systemPrompt }, ...newHistory]
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
                setMessages(prev => {
                   const updated = [...prev];
                   updated[updated.length - 1].text = fullText;
                   return updated;
                });
              }
            } catch (e) {}
          }
        }
      }

      historyRef.current.push({ role: 'assistant', content: fullText });
      setIsThinking(false);
      
      const cleanCode = fullText.replace(/```html/g, '').replace(/```/g, '').trim();
      if (onComplete) onComplete(cleanCode);

    } catch (error) {
      console.error(error);
      setIsThinking(false);
      setMessages(prev => [...prev, { role: 'bot', text: "Error: " + error.message }]);
    }
  };

  return { messages, isThinking, sendMessage };
}
