'use client';
import { useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  const [selectedElement, setSelectedElement] = useState(null); // Context State
  const { messages, isThinking, sendMessage } = useAI();

  // --- THE LOGIC SWITCH ---
  const handleAICompletion = (htmlCode) => {
    if (!editorRef.current) return;
    
    try {
        if (selectedElement) {
            // SCENARIO A: Modify Specific Component
            // 1. Get the currently selected component from the editor
            const selectedComponent = editorRef.current.getSelected();
            
            if (selectedComponent) {
                console.log("Replacing component:", selectedComponent);
                // 2. Replace it with the AI's new HTML
                selectedComponent.replaceWith(htmlCode);
            } else {
                console.warn("Selection lost, appending instead.");
                editorRef.current.addComponents(htmlCode);
            }

        } else {
            // SCENARIO B: Global Generation (No selection)
            console.log("Adding new components to canvas...");
            editorRef.current.addComponents(htmlCode); 
            // Note: use addComponents to append, setComponents to overwrite everything
        }
    } catch (e) {
        console.error("Editor Injection Failed:", e);
    }
  };

  return (
    <div className="main-layout">
      
      <Sidebar 
        messages={messages} 
        selectedContext={selectedElement} // Pass context to UI
        isThinking={isThinking} 
        // Pass context to Logic
        onSend={(text) => sendMessage(text, selectedElement, handleAICompletion)} 
      />

      <Editor 
        onReady={(editor) => { editorRef.current = editor; }} 
        onSelection={(data) => setSelectedElement(data)} // Update Context
      />

    </div>
  );
}
