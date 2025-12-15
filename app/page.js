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
    <>
      <style jsx>{`
        .main-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: black;
          font-family: sans-serif;
        }
        .editor-wrapper {
          flex: 1;
          position: relative;
        }
      `}</style>

      <div className="main-container">

        {/* 1. The AI Sidebar */}
        <Sidebar
          messages={messages}
          isThinking={isThinking}
          onSend={(text) => sendMessage(text, handleAICompletion)}
        />

        {/* 2. The GrapesJS Editor */}
        <div className="editor-wrapper">
          <Editor onReady={(editor) => { editorRef.current = editor; }} />
        </div>

      </div>
    </>
  );
}
