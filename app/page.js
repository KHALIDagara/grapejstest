'use client';
import { useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  
  // 1. Current Transient State
  const [selectedElement, setSelectedElement] = useState(null); 
  const [currentPage, setCurrentPage] = useState({ name: 'Home', id: 'page-1' });
  
  // 2. THE STORE (Dictionary of Pages)
  const [pagesStore, setPagesStore] = useState({
      'page-1': { 
          messages: [{ role: 'bot', text: 'Hello! Editing Home Page.' }],
          theme: { primaryColor: '#2563eb', secondaryColor: '#ffffff', fontFamily: 'Arial', borderRadius: '4px' } 
      }
  });

  const { isThinking, generateResponse } = useAI(); 

  // --- HELPER: Get Current Page Data ---
  const getCurrentPageData = () => {
      return pagesStore[currentPage.id] || { 
          messages: [], 
          theme: { primaryColor: '#000000', secondaryColor: '#ffffff' } 
      };
  };

  // --- 3. Handle Page Switch ---
  const handlePageChange = (pageInfo) => {
      if (pageInfo.id === currentPage.id) return;
      console.log(`Switching Context: ${currentPage.name} -> ${pageInfo.name}`);
      
      setPagesStore(prev => {
          if (!prev[pageInfo.id]) {
              return {
                  ...prev,
                  [pageInfo.id]: {
                      messages: [{ role: 'bot', text: `Switched to ${pageInfo.name}. Ready to edit.` }],
                      theme: { primaryColor: '#000000', secondaryColor: '#ffffff' }
                  }
              };
          }
          return prev;
      });

      setCurrentPage(pageInfo);
      setSelectedElement(null);
  };

  // --- 4. Handle Theme Updates ---
  const handleThemeChange = (newTheme) => {
      setPagesStore(prev => ({
          ...prev,
          [currentPage.id]: { ...prev[currentPage.id], theme: newTheme }
      }));
  };

  // --- 5. Handle AI Logic ---
  const handleSendMessage = async (text) => {
      const currentData = getCurrentPageData();
      const currentHistory = currentData.messages;
      const currentTheme = currentData.theme;

      const userMsg = { role: 'user', text };
      const placeholderBotMsg = { role: 'bot', text: '' };

      setPagesStore(prev => ({
          ...prev,
          [currentPage.id]: {
              ...prev[currentPage.id],
              messages: [...currentHistory, userMsg, placeholderBotMsg]
          }
      }));

      const onStreamUpdate = (streamedText) => {
          setPagesStore(prev => {
             const pageData = prev[currentPage.id];
             const msgs = [...pageData.messages];
             msgs[msgs.length - 1] = { role: 'bot', text: streamedText };
             return { ...prev, [currentPage.id]: { ...pageData, messages: msgs } };
          });
      };

      const historyToSend = [...currentHistory, userMsg];

      await generateResponse(
          text, historyToSend, selectedElement, currentTheme, onStreamUpdate, 
          (finalCode) => handleAICompletion(finalCode)
      );
  };

  const handleAICompletion = (htmlCode) => {
      if (!editorRef.current) return;
      try {
        if (selectedElement) {
            const selectedComponent = editorRef.current.getSelected();
            if (selectedComponent) {
                const parent = selectedComponent.parent();
                if (parent) selectedComponent.replaceWith(htmlCode);
                else selectedComponent.components(htmlCode);
            } else {
                editorRef.current.addComponents(htmlCode);
            }
        } else {
            editorRef.current.addComponents(htmlCode); 
        }
      } catch (e) { console.error(e); }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #000;
          color: #fff;
          overflow: hidden;
        }
        .main-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        /* === SIDEBAR CSS === */
        .sidebar {
          position: relative; width: 400px; background: #1a1a1a;
          border-right: 1px solid #333; display: flex; flex-direction: column;
        }
        .sidebar-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px; background-color: #252525; border-bottom: 1px solid #333;
        }
        .page-title { font-weight: bold; font-size: 14px; color: #fff; }
        
        .tab-buttons { display: flex; gap: 5px; background: #111; padding: 4px; border-radius: 6px; }
        .tab-btn {
            background: transparent; border: none; color: #666; padding: 6px;
            cursor: pointer; border-radius: 4px; display: flex; align-items: center;
        }
        .tab-btn:hover { background: #333; }
        .tab-btn.active { background: #2563eb; color: white; }

        .sidebar-content-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        
        /* Settings Panel */
        .settings-panel { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .settings-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; }
        .settings-subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
        
        .setting-group { display: flex; flex-direction: column; gap: 6px; }
        .setting-group label { font-size: 12px; color: #ccc; }
        
        .color-picker-wrapper { display: flex; gap: 10px; }
        .color-swatch { width: 30px; height: 30px; border: none; background: none; cursor: pointer; }
        
        .text-input, .dropdown-input {
            background: #333; border: 1px solid #444; color: white;
            padding: 8px; border-radius: 4px; font-size: 12px; width: 100%;
        }

        /* Chat Styles (retained) */
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .empty-state { text-align: center; color: #666; font-size: 13px; margin-top: 40px; }
        .msg { padding: 10px 14px; border-radius: 8px; line-height: 1.5; font-size: 14px; max-width: 90%; }
        .msg.user { background: #2563eb; align-self: flex-end; }
        .msg.bot { background: #333; align-self: flex-start; }
        
        .input-section { padding: 15px; border-top: 1px solid #333; display: flex; flex-direction: column; gap: 10px; }
        .context-badge { background: #7b1fa2; color: white; padding: 6px 10px; border-radius: 4px; font-size: 11px; }
        .chat-input { background: #2a2a2a; border: 1px solid #444; color: white; padding: 10px; border-radius: 6px; min-height: 60px; resize: vertical; }
        .send-btn { background: #2563eb; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .send-btn:disabled { background: #444; }
        
        /* Editor */
        .editor-area { flex: 1; background: #000; position: relative; }
        .loading-overlay { position: absolute; inset: 0; background: #000; color: #666; display: flex; align-items: center; justify-content: center; }
        #studio-editor { width: 100%; height: 100%; }
      `}</style>

      <div className="main-layout">
        <Sidebar 
          messages={getCurrentPageData().messages} 
          currentTheme={getCurrentPageData().theme}
          onThemeChange={handleThemeChange}
          currentPage={currentPage}
          selectedContext={selectedElement}
          isThinking={isThinking} 
          onSend={handleSendMessage} 
        />
        <Editor 
          onReady={(editor) => { editorRef.current = editor; }} 
          onSelection={setSelectedElement}
          onPageChange={handlePageChange} 
        />
      </div>
    </>
  );
}
