'use client';
import { useRef, useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  
  // 1. Current Transient State
  const [selectedElement, setSelectedElement] = useState(null); 
  const [currentPage, setCurrentPage] = useState({ name: 'Home', id: 'page-1' }); // Default to page-1
  
  // 2. THE STORE (Dictionary of Pages)
  // Structure: { 'page-id': { messages: [], theme: {} } }
  const [pagesStore, setPagesStore] = useState({
      'page-1': { 
          messages: [{ role: 'bot', text: 'Hello! Editing Home Page.' }],
          theme: { primaryColor: '#2563eb', secondaryColor: '#ffffff', fontFamily: 'Arial', borderRadius: '4px' } 
      }
  });

  const { isThinking, generateResponse } = useAI(); 

  // --- HELPER: Get Current Page Data ---
  // Safely retrieve data for current page, or return defaults
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
      
      // Ensure the new page exists in store
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
          [currentPage.id]: {
              ...prev[currentPage.id],
              theme: newTheme
          }
      }));
  };

  // --- 5. Handle AI Logic ---
  const handleSendMessage = async (text) => {
      const currentData = getCurrentPageData();
      const currentHistory = currentData.messages;
      const currentTheme = currentData.theme;

      // Optimistic UI Update (User Message)
      const userMsg = { role: 'user', text };
      const placeholderBotMsg = { role: 'bot', text: '' };

      // Update Store immediately
      setPagesStore(prev => ({
          ...prev,
          [currentPage.id]: {
              ...prev[currentPage.id],
              messages: [...currentHistory, userMsg, placeholderBotMsg]
          }
      }));

      // Callback to update the streaming bot message
      const onStreamUpdate = (streamedText) => {
          setPagesStore(prev => {
             const pageData = prev[currentPage.id];
             const msgs = [...pageData.messages];
             // Update the last message (the bot placeholder)
             msgs[msgs.length - 1] = { role: 'bot', text: streamedText };
             
             return {
                 ...prev,
                 [currentPage.id]: { ...pageData, messages: msgs }
             };
          });
      };

      // Call AI
      // Note: We pass the *raw* history (without the new user msg yet) to the hook? 
      // No, we should pass the updated history.
      const historyToSend = [...currentHistory, userMsg];

      await generateResponse(
          text, 
          historyToSend, 
          selectedElement, 
          currentTheme, 
          onStreamUpdate, 
          (finalCode) => handleAICompletion(finalCode)
      );
  };

  const handleAICompletion = (htmlCode) => {
      // ... (Your Existing Injection Logic - Works perfectly) ...
      if (!editorRef.current) return;
      try {
        // Logic to replace component or append
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
      {/* Include your CSS here or imported */}
      <style jsx global>{`
        /* ... existing css ... */
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
