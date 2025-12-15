import { useState, useRef } from 'react';

export function useAI() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am ready to build. Describe your layout.' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef([]); // Keeps track of conversation context

  const sendMessage = async (userText, onComplete) => {
    if (!userText.trim()) return;

    setIsThinking(true);
    
    // 1. Update UI with User Message
    const newHistory = [...historyRef.current, { role: 'user', content: userText }];
    historyRef.current = newHistory;
    
    setMessages(prev => [
      ...prev, 
      { role: 'user', text: userText },
      { role: 'bot', text: '' } // Placeholder for stream
    ]);

    const systemPrompt = `
      You are an expert GrapesJS developer.
      1. Output ONLY valid HTML. No Markdown backticks.
      2. No <html>/<body> tags. Start with <section>/<div>.
      3. Add 'data-gjs-name="Layer Name"' to major elements.
      4. Use inline styles or <style> tags.
    `;

    try {
      // 2. Call our own internal API (not OpenRouter directly)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_AI_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'system', content: systemPrompt }, ...newHistory]
        })
      });

      if (!response.ok) throw new Error('Network error');

      // 3. Handle Stream
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
                // Update the last message in the UI
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

      // 4. Cleanup and Callback
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
