'use client';
import { useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';

export default function Home() {
  const editorRef = useRef(null);
  const { messages, isThinking, sendMessage } = useAI();

  // The function that bridges AI -> Editor
  const handleAICompletion = (htmlCode) => {
    if (editorRef.current) {
      try {
        console.log("Injecting Code...");
        editorRef.current.setComponents(htmlCode);
      } catch (e) {
        console.error("Editor Injection Failed:", e);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black font-sans">
      
      {/* 1. The AI Sidebar */}
      <Sidebar 
        messages={messages} 
        isThinking={isThinking} 
        onSend={(text) => sendMessage(text, handleAICompletion)} 
      />

      {/* 2. The GrapesJS Editor */}
      <div className="flex-1 relative">
        <Editor onReady={(editor) => { editorRef.current = editor; }} />
      </div>

    </div>
  );
}
