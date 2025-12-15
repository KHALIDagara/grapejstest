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
      const placeholderBotMsg = { role: 'bot', text: '' }; // Placeholder for streaming

      setPagesStore(prev => ({
          ...prev,
          [currentPage.id]: {
              ...prev[currentPage.id],
              messages: [...currentHistory, userMsg, placeholderBotMsg]
          }
      }));

      // Update the last message in chat as AI generates/finishes
      const onStreamUpdate = (streamedText) => {
          setPagesStore(prev => {
             const pageData = prev[currentPage.id];
             const msgs = [...pageData.messages];
             msgs[msgs.length - 1] = { role: 'bot', text: streamedText };
             return { ...prev, [currentPage.id]: { ...pageData, messages: msgs } };
          });
      };

      const historyToSend = [...currentHistory, userMsg];

      // --- CRITICAL FIX ---
      // 1. We pass editorRef.current as the first argument
      // 2. We remove the 'handleAICompletion' callback because useAI now handles 
      //    DOM updates internally via tools. onStreamUpdate handles the chat text.
      await generateResponse(
          editorRef.current, // <--- Editor Instance
          text, 
          historyToSend, 
          selectedElement, 
          onStreamUpdate, 
          null // No onComplete needed, onStreamUpdate handles the final text
      );
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
        /* ... (Rest of your CSS kept same) ... */
        .sidebar { position: relative; width: 400px; background: #1a1a1a; border-right: 1px solid #333; display: flex; flex-direction: column; }
        .editor-area { flex: 1; background: #000; position: relative; }
        #studio-editor { width: 100%; height: 100%; }
      `}</style>

      <div className="main-layout">
        <Sidebar 
          messages={getCurrentPageData().messages} 
          currentTheme={getCurrentPageData().theme}
          onThemeChange={handleThemeChange}
          currentPage={currentPage}
          selectedContext={selectedElement}
          onClearContext={() => setSelectedElement(null)} 
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
