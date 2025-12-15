'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script'; // Next.js optimized script loader

// CONFIGURATION
const CONFIG = {
  // ⚠️ REPLACE THIS WITH YOUR ACTUAL KEY
  apiKey: 'OPENROUTER_API_KEY', 
  siteUrl: 'http://localhost:3000',
  appName: 'GrapesJS AI Builder',
  model: 'google/gemini-2.0-flash-lite-preview-02-05:free'
};

export default function Home() {
  const editorRef = useRef(null);      // Stores the Editor Instance
  const [isEditorReady, setEditorReady] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! Describe the layout you want, and I will build it.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // AI History Memory
  const historyRef = useRef([]);

  // ---------------------------------------------------------
  // 1. Initialize GrapesJS
  // ---------------------------------------------------------
  useEffect(() => {
    // We check if the SDK is loaded on the window object
    const initEditor = () => {
      if (window.GrapesJsStudioSDK && !editorRef.current) {
        console.log('Initializing GrapesJS...');
        
        window.GrapesJsStudioSDK.createStudioEditor({
          root: '#studio-editor',
          licenseKey: '', // Leave empty for local dev
          theme: 'dark',
          project: { type: 'web' },
          assets: { storageType: 'self' },
          onReady: (editor) => {
            editorRef.current = editor;
            setEditorReady(true);
            console.log('✅ Editor Ready');
          }
        });
      }
    };

    // Retry mechanism in case script takes a moment to load
    const interval = setInterval(() => {
        if (window.GrapesJsStudioSDK) {
            initEditor();
            clearInterval(interval);
        }
    }, 100);

    return () => clearInterval(interval);
  }, []);


  // ---------------------------------------------------------
  // 2. AI Logic (Streaming & Cleaning)
  // ---------------------------------------------------------
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setIsThinking(true);

    // Add User Message to UI
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    // Create a placeholder for the Bot's incoming stream
    setMessages(prev => [...prev, { role: 'bot', text: '' }]);

    const systemPrompt = `
        You are an expert web developer using GrapesJS.
        1. Output ONLY valid HTML code. No Markdown (no \`\`\`).
        2. No <html>, <head>, or <body> tags. Start with <section>, <div>, etc.
        3. Add 'data-gjs-name="Layer Name"' to major elements.
        4. Use inline styles or <style> tags.
    `;

    const allMessages = [
        { role: 'system', content: systemPrompt },
        ...historyRef.current,
        { role: 'user', content: userText }
    ];

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CONFIG.apiKey}`,
                "HTTP-Referer": CONFIG.siteUrl,
                "X-Title": CONFIG.appName,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CONFIG.model,
                messages: allMessages,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.trim().startsWith("data: ")) {
                    const jsonStr = line.replace("data: ", "").trim();
                    if (jsonStr === "[DONE]") break;
                    
                    try {
                        const json = JSON.parse(jsonStr);
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullText += content;
                            
                            // Update the last message (the bot placeholder) with new text
                            setMessages(prev => {
                                const newArr = [...prev];
                                const lastMsg = newArr[newArr.length - 1];
                                lastMsg.text = fullText; 
                                return newArr;
                            });
                        }
                    } catch (e) { /* ignore partial json */ }
                }
            }
        }

        // Save to memory
        historyRef.current.push({ role: 'user', content: userText });
        historyRef.current.push({ role: 'assistant', content: fullText });

        // CLEAN & INJECT
        setIsThinking(false);
        const cleanCode = fullText.replace(/```html/g, '').replace(/```/g, '').trim();
        injectCode(cleanCode);

    } catch (error) {
        setIsThinking(false);
        setMessages(prev => [...prev, { role: 'bot', text: `Error: ${error.message}` }]);
    }
  };

  const injectCode = (html) => {
    if (editorRef.current) {
        try {
            editorRef.current.setComponents(html);
            console.log("Injecting components...");
        } catch (e) {
            console.error("Injection failed", e);
        }
    }
  };


  // ---------------------------------------------------------
  // 3. Render
  // ---------------------------------------------------------
  return (
    <>
      {/* Load SDK Style & Script */}
      <link rel="stylesheet" href="https://unpkg.com/@grapesjs/studio-sdk/dist/style.css" />
      <Script 
        src="https://unpkg.com/@grapesjs/studio-sdk/dist/index.umd.js" 
        strategy="lazyOnload"
      />

      <div className="flex h-screen w-screen bg-black text-gray-200 overflow-hidden font-sans">
        
        {/* --- LEFT SIDEBAR (AI) --- */}
        <div 
          className={`relative bg-[#1e1e1e] border-r border-[#333] flex flex-col transition-all duration-300 ease-in-out z-10
          ${isSidebarCollapsed ? 'w-0 border-none' : 'w-[350px]'}`}
        >
          {/* Toggle Button */}
          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-10 top-4 w-10 h-10 bg-[#1e1e1e] border border-l-0 border-[#333] rounded-r-lg flex items-center justify-center text-gray-300 hover:text-purple-400 cursor-pointer shadow-lg z-20"
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>

          {/* AI Content */}
          <div className={`flex flex-col h-full transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Header */}
            <div className="p-4 border-b border-[#333] bg-[#252525] font-semibold flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isThinking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              AI Designer
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm max-w-[95%] leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-purple-900/30 border border-purple-500/50 self-end text-purple-100' 
                    : 'bg-[#2d2d2d] border border-[#333] self-start'
                }`}>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#333] bg-[#252525] flex flex-col gap-3">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder="Describe your layout..."
                className="w-full h-20 p-3 bg-[#1a1a1a] border border-[#444] rounded-md text-white focus:outline-none focus:border-purple-500 resize-none text-sm"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Gemini Flash 2.0</span>
                <button 
                    onClick={handleSendMessage}
                    disabled={isThinking || !input.trim()}
                    className={`px-5 py-2 rounded text-sm font-semibold transition-colors 
                    ${isThinking ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  {isThinking ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT: EDITOR --- */}
        <div className="flex-1 relative bg-black">
          {!isEditorReady && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono">
              Loading Editor SDK...
            </div>
          )}
          <div id="studio-editor" className="h-full w-full" />
        </div>

      </div>
    </>
  );
}
