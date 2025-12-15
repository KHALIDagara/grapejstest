'use client';
import { useRef, useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null); 
  
  // Destructure resetHistory from our hook
  const { messages, isThinking, sendMessage, resetHistory } = useAI(); 

  // Track the previous selection ID to detect changes
  const prevSelectionId = useRef(null);

  // --- 1. Detect Component Context Switch ---
  useEffect(() => {
    // If we have a new selected element AND it's different from the last one
    if (selectedElement && selectedElement.id !== prevSelectionId.current) {
        console.log("Component context switched. Resetting AI memory.");
        resetHistory();
        prevSelectionId.current = selectedElement.id;
    } 
    // If we deselected (selectedElement is null) and previously had something selected
    else if (!selectedElement && prevSelectionId.current) {
        console.log("Selection cleared. Resetting AI memory.");
        resetHistory();
        prevSelectionId.current = null;
    }
  }, [selectedElement, resetHistory]);

  // --- 2. Detect Page Switch (Passed from Editor) ---
  const handlePageChange = () => {
      console.log("Page switched. Resetting AI memory.");
      resetHistory();
      // Also clear any selected element state just in case
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
      <style jsx global>{`
        /* ... (Your existing CSS) ... */
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
          // Pass the page change handler to the Editor component
          onPageChange={handlePageChange} 
        />

      </div>
    </>
  );
}
