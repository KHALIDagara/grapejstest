'use client';
import { useRef, useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null); 
  
  // Destructure resetHistory
  const { messages, isThinking, sendMessage, resetHistory } = useAI(); 

  const prevSelectionId = useRef(null);

  // --- 1. Detect Context Switch (Reset History) ---
  useEffect(() => {
    if (selectedElement && selectedElement.id !== prevSelectionId.current) {
        console.log("Context switched. Resetting AI memory.");
        resetHistory();
        prevSelectionId.current = selectedElement.id;
    }
  }, [selectedElement, resetHistory]);

  // --- 2. Handle Page Switch ---
  const handlePageChange = () => {
      console.log("Page switched. Resetting AI.");
      resetHistory();
      setSelectedElement(null);
      prevSelectionId.current = null;
  };

  const handleAICompletion = (htmlCode) => {
    if (!editorRef.current) return;
    try {
        if (selectedElement) {
            const selectedComponent = editorRef.current.getSelected();
            if (selectedComponent) {
                console.log("Replacing component:", selectedComponent);
                selectedComponent.replaceWith(htmlCode);
            } else {
                editorRef.current.addComponents(htmlCode);
            }
        } else {
            console.log("Adding new components...");
            editorRef.current.addComponents(htmlCode); 
        }
    } catch (e) {
        console.error("Editor Injection Failed:", e);
    }
  };

  return (
    <>
      {/* --- RESTORED CSS --- */}
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #000;
          color: #fff;
          overflow: hidden;
        }
        .main-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        /* === SIDEBAR === */
        .sidebar {
          position: relative; width: 400px; background: #1a1a1a;
          border-right: 1px solid #333; display: flex; flex-direction: column;
          transition: width 0.3s ease;
        }
        .sidebar.collapsed { width: 50px; }
        .sidebar.collapsed .sidebar-content { display: none; }

        .toggle-btn {
          position: absolute; top: 20px; right: 10px; background: #333;
          border: none; color: #fff; width: 30px; height: 30px;
          border-radius: 4px; cursor: pointer; z-index: 10;
          display: flex; align-items: center; justify-content: center;
        }
        .toggle-btn:hover { background: #444; }

        .sidebar-content {
          display: flex; flex-direction: column; height: 100%; padding: 20px;
        }

        .chat-header {
          display: flex; align-items: center; gap: 10px; padding-bottom: 15px;
          border-bottom: 1px solid #333; margin-bottom: 15px; font-weight: 600;
        }

        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #666; }
        .status-dot.active { background: #4ade80; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .chat-messages {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column;
          gap: 12px; margin-bottom: 15px; padding-right: 5px;
        }
        .chat-messages::-webkit-scrollbar { width: 6px; }
        .chat-messages::-webkit-scrollbar-track { background: #1a1a1a; }
        .chat-messages::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

        .msg { padding: 10px 14px; border-radius: 8px; line-height: 1.5; font-size: 14px; word-wrap: break-word; }
        .msg.user { background: #2563eb; align-self: flex-end; max-width: 80%; }
        .msg.bot { background: #333; align-self: flex-start; max-width: 90%; }

        .input-section {
          display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid #333;
        }

        .chat-input {
          width: 100%; min-height: 60px; max-height: 120px; padding: 10px;
          background: #2a2a2a; border: 1px solid #444; border-radius: 6px;
          color: #fff; font-size: 14px; font-family: inherit; resize: vertical;
        }
        .chat-input:focus { outline: none; border-color: #2563eb; }

        .send-btn {
          width: 100%; padding: 12px; background: #2563eb; border: none;
          border-radius: 6px; color: #fff; font-weight: 600; cursor: pointer;
          transition: background 0.2s;
        }
        .send-btn:hover:not(:disabled) { background: #1d4ed8; }
        .send-btn:disabled { background: #334155; cursor: not-allowed; }

        /* === EDITOR === */
        .editor-area { position: relative; flex: 1; width: 100%; height: 100%; background: #000; }
        .loading-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center;
          background: #000; color: #6b7280; font-size: 14px; z-index: 100;
        }
        #studio-editor { width: 100%; height: 100%; }
      `}</style>

      <div className="main-layout">
        <Sidebar 
          messages={messages} 
          selectedContext={selectedElement} 
          isThinking={isThinking} 
          onSend={(text) => sendMessage(text, selectedElement, handleAICompletion)} 
        />
        <Editor 
          onReady={(editor) => { editorRef.current = editor; }} 
          onSelection={(data) => setSelectedElement(data)}
          onPageChange={handlePageChange} 
        />
      </div>
    </>
  );
}
