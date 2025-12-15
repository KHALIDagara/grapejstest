'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// CONFIGURATION
const CONFIG = {
  // ⚠️ REPLACE WITH YOUR ACTUAL KEY
  apiKey: 'OPENROUTER_API_KEY', 
  siteUrl: 'http://localhost:3000',
  appName: 'GrapesJS AI Builder',
  model: 'google/gemini-2.0-flash-lite-preview-02-05:free'
};

export default function Home() {
  const editorRef = useRef(null);
  const [isEditorReady, setEditorReady] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! Describe the layout you want, and I will build it.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef([]);

  // 1. Initialize GrapesJS
  useEffect(() => {
    const initEditor = () => {
      if (window.GrapesJsStudioSDK && !editorRef.current) {
        window.GrapesJsStudioSDK.createStudioEditor({
          root: '#studio-editor',
          licenseKey: 'e50c20f9bbf746e4a85e7bd9ebf0faa601ba3461f1864001a90319272a846cbf', 
          theme: 'dark',
          project: { type: 'web' },
          assets: { storageType: 'self' },
          onReady: (editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }
        });
      }
    };

    const interval = setInterval(() => {
        if (window.GrapesJsStudioSDK) {
            initEditor();
            clearInterval(interval);
        }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // 2. AI Logic
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setIsThinking(true);

    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setMessages(prev => [...prev, { role: 'bot', text: '' }]); // Placeholder

    const systemPrompt = `
        You are an expert web developer using GrapesJS.
        1. Output ONLY valid HTML code. No Markdown.
        2. No <html>, <head>, or <body> tags. Start with <section>, <div>, etc.
        3. Add 'data-gjs-name="Layer Name"' to major elements.
        4. Use inline styles or <style> tags.
    `;

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
                messages: [{ role: 'system', content: systemPrompt }, ...historyRef.current, { role: 'user', content: userText }],
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
                            setMessages(prev => {
                                const newArr = [...prev];
                                newArr[newArr.length - 1].text = fullText; 
                                return newArr;
                            });
                        }
                    } catch (e) { }
                }
            }
        }

        historyRef.current.push({ role: 'user', content: userText });
        historyRef.current.push({ role: 'assistant', content: fullText });
        setIsThinking(false);

        const cleanCode = fullText.replace(/```html/g, '').replace(/```/g, '').trim();
        if (editorRef.current) {
            editorRef.current.setComponents(cleanCode);
        }

    } catch (error) {
        setIsThinking(false);
        setMessages(prev => [...prev, { role: 'bot', text: `Error: ${error.message}` }]);
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/@grapesjs/studio-sdk/dist/style.css" />
      <Script src="https://unpkg.com/@grapesjs/studio-sdk/dist/index.umd.js" strategy="lazyOnload" />

      {/* --- CSS STYLES --- */}
      <style jsx global>{`
        body { margin: 0; padding: 0; overflow: hidden; background: #111; font-family: sans-serif; }
        
        .main-container { display: flex; height: 100vh; width: 100vw; }
        
        /* SIDEBAR */
        .ai-sidebar {
            width: 350px;
            background: #1e1e1e;
            border-right: 1px solid #333;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: width 0.3s ease;
            z-index: 10;
        }
        .ai-sidebar.collapsed { width: 0; border: none; }
        
        .ai-content {
            opacity: 1; transition: opacity 0.2s; display: flex; flex-direction: column; height: 100%; min-width: 350px;
        }
        .ai-sidebar.collapsed .ai-content { opacity: 0; pointer-events: none; }

        /* TOGGLE BUTTON */
        .toggle-btn {
            position: absolute; right: -40px; top: 15px; width: 40px; height: 40px;
            background: #1e1e1e; border: 1px solid #333; border-left: none;
            border-radius: 0 8px 8px 0; cursor: pointer; color: #ddd;
            display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .toggle-btn:hover { color: #9c27b0; }

        /* CHAT UI */
        .header { padding: 15px; background: #252525; border-bottom: 1px solid #333; color: white; font-weight: bold; display: flex; align-items: center; gap: 10px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #666; transition: background 0.3s; }
        .status-dot.active { background: #00e676; box-shadow: 0 0 8px #00e676; }

        .chat-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        
        .msg { padding: 10px 14px; border-radius: 6px; font-size: 14px; line-height: 1.5; max-width: 90%; color: #ddd; }
        .msg.bot { background: #2d2d2d; align-self: flex-start; border: 1px solid #333; }
        .msg.user { background: rgba(156, 39, 176, 0.2); align-self: flex-end; border: 1px solid #9c27b0; color: #fff; }

        .input-area { padding: 15px; background: #252525; border-top: 1px solid #333; display: flex; flex-direction: column; gap: 10px; }
        textarea {
            width: 100%; height: 80px; background: #1a1a1a; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; resize: none; font-family: inherit;
        }
        textarea:focus { outline: none; border-color: #9c27b0; }

        .controls { display: flex; justify-content: space-between; align-items: center; }
        .badge { font-size: 12px; color: #888; background: #333; padding: 3px 6px; border-radius: 4px; }
        
        .send-btn {
            background: #9c27b0; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;
        }
        .send-btn:hover { background: #7b1fa2; }
        .send-btn:disabled { background: #444; cursor: not-allowed; }

        /* EDITOR */
        .editor-container { flex: 1; position: relative; background: #000; }
        #studio-editor { height: 100%; width: 100%; }
        .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; }
      `}</style>

      {/* --- MAIN LAYOUT --- */}
      <div className="main-container">
        
        <div className={`ai-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? '→' : '←'}
          </button>

          <div className="ai-content">
            <div className="header">
              <div className={`status-dot ${isThinking ? 'active' : ''}`} />
              AI Designer
            </div>

            <div className="chat-list">
              {messages.map((msg, i) => (
                <div key={i} className={`msg ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="input-area">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder="Describe your layout..."
              />
              <div className="controls">
                <span className="badge">Gemini Flash 2.0</span>
                <button className="send-btn" onClick={handleSendMessage} disabled={isThinking || !input.trim()}>
                  {isThinking ? 'Thinking...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-container">
          {!isEditorReady && <div className="loading">Loading Editor...</div>}
          <div id="studio-editor"></div>
        </div>

      </div>
    </>
  );
}
