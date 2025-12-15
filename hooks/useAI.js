import { useState, useRef } from 'react';

export function useAI() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! Select an element to edit it, or type here to build new sections.' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef([]);

  // --- NEW: Function to clear history ---
  const resetHistory = () => {
    historyRef.current = [];
    setMessages([
      { role: 'bot', text: 'New context active. How can I help?' }
    ]);
  };

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

    // --- SYSTEM PROMPT ---
    let systemPrompt = '';
    
    if (selectedContext) {
        systemPrompt = `
           You are an expert web developer.
           The user has selected: <${selectedContext.tagName}>.
           
           CURRENT HTML:
           \`\`\`html
           ${selectedContext.currentHTML}
           \`\`\`

           USER REQUEST: "${userText}"

           INSTRUCTIONS:
           1. Return ONLY the updated HTML for this component.
           2. **Use Inline CSS** (style="...") for all styling. 
           3. Do NOT use classes.
           4. Do NOT output markdown.
        `;
    } else {
        systemPrompt = `
           You are an expert GrapesJS developer.
           1. Output ONLY valid HTML. No Markdown backticks.
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

  return { messages, isThinking, sendMessage, resetHistory };
}
