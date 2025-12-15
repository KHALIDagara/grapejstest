'use client';
import { useState, useRef, useEffect } from 'react';

export default function Sidebar({ messages, isThinking, onSend }) {
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if(!input.trim() || isThinking) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className={`relative flex flex-col bg-[#1e1e1e] border-r border-[#333] transition-all duration-300 z-10 ${collapsed ? 'w-0' : 'w-[350px]'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-10 top-4 w-10 h-10 bg-[#1e1e1e] border border-l-0 border-[#333] rounded-r text-gray-300 flex items-center justify-center hover:text-[#9c27b0]"
      >
        {collapsed ? '→' : '←'}
      </button>

      <div className={`flex flex-col h-full overflow-hidden transition-opacity ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="p-4 border-b border-[#333] bg-[#252525] text-white font-bold flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          AI Designer
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`p-3 rounded text-sm max-w-[90%] leading-relaxed ${
              msg.role === 'user' ? 'bg-[#4a148c] self-end text-white' : 'bg-[#2d2d2d] self-start text-gray-200 border border-[#333]'
            }`}>
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#333] bg-[#252525] flex flex-col gap-2">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
            placeholder="Describe your layout..."
            className="w-full h-20 bg-[#1a1a1a] border border-[#444] rounded p-2 text-white focus:outline-none focus:border-[#9c27b0] resize-none"
          />
          <button 
            onClick={handleSubmit} 
            disabled={isThinking}
            className="bg-[#9c27b0] text-white py-2 rounded font-bold hover:bg-[#7b1fa2] disabled:bg-[#444] transition-colors"
          >
            {isThinking ? 'Building...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
