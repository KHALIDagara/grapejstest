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
    <>
      <style jsx>{`
        .sidebar {
          position: relative;
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
          border-right: 1px solid #333;
          transition: all 0.3s;
          z-index: 10;
          width: 350px;
        }
        .sidebar.collapsed {
          width: 0;
          border: none;
        }

        .toggle-btn {
          position: absolute;
          right: -40px;
          top: 1rem;
          width: 40px;
          height: 40px;
          background: #1e1e1e;
          border: 1px solid #333;
          border-left: none;
          border-radius: 0 8px 8px 0;
          color: #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .toggle-btn:hover {
          color: #9c27b0;
        }

        .content {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          transition: opacity 0.2s;
          opacity: 1;
        }
        .content.collapsed {
          opacity: 0;
          pointer-events: none;
        }

        .header {
          padding: 1rem;
          border-bottom: 1px solid #333;
          background: #252525;
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6b7280;
        }
        .status-dot.active {
          background: #4ade80;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .chat-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .message {
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 14px;
          max-width: 90%;
          line-height: 1.625;
        }
        .message.user {
          background: #4a148c;
          align-self: flex-end;
          color: white;
        }
        .message.bot {
          background: #2d2d2d;
          align-self: flex-start;
          color: #e5e7eb;
          border: 1px solid #333;
        }

        .input-area {
          padding: 1rem;
          border-top: 1px solid #333;
          background: #252525;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .textarea {
          width: 100%;
          height: 80px;
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 0.375rem;
          padding: 0.5rem;
          color: white;
          resize: none;
          font-family: inherit;
        }
        .textarea:focus {
          outline: none;
          border-color: #9c27b0;
        }

        .submit-btn {
          background: #9c27b0;
          color: white;
          padding: 0.5rem 0;
          border-radius: 0.375rem;
          font-weight: bold;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .submit-btn:hover {
          background: #7b1fa2;
        }
        .submit-btn:disabled {
          background: #444;
          cursor: not-allowed;
        }
      `}</style>

      <div className={collapsed ? 'sidebar collapsed' : 'sidebar'}>

        {/* Toggle Button */}
        <button onClick={() => setCollapsed(!collapsed)} className="toggle-btn">
          {collapsed ? '→' : '←'}
        </button>

        <div className={collapsed ? 'content collapsed' : 'content'}>
          {/* Header */}
          <div className="header">
            <div className={isThinking ? 'status-dot active' : 'status-dot'} />
            AI Designer
          </div>

          {/* Chat List */}
          <div className="chat-list">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'message user' : 'message bot'}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
              placeholder="Describe your layout..."
              className="textarea"
            />
            <button onClick={handleSubmit} disabled={isThinking} className="submit-btn">
              {isThinking ? 'Building...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
