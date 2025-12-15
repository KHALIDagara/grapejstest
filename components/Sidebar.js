'use client';
import { useState, useRef, useEffect } from 'react';

// Added `selectedContext` prop
export default function Sidebar({ messages, isThinking, onSend, selectedContext }) {
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if(!input.trim() || isThinking) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button onClick={() => setCollapsed(!collapsed)} className="toggle-btn">
        {collapsed ? '→' : '←'}
      </button>

      <div className="sidebar-content">
        <div className="chat-header">
          <div className={`status-dot ${isThinking ? 'active' : ''}`} />
          <span>AI Designer</span>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-section">
          
          {/* --- NEW: CONTEXT INDICATOR --- */}
          {selectedContext ? (
             <div style={{ 
                 marginBottom: '8px', 
                 padding: '6px 10px', 
                 background: '#4a148c', 
                 borderRadius: '4px', 
                 fontSize: '12px',
                 color: 'white',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'space-between'
             }}>
                <span>EDITING: <b>&lt;{selectedContext.tagName.toUpperCase()}&gt;</b></span>
                {/* Optional: Small 'X' to deselect could go here */}
             </div>
          ) : (
             <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                Generating new elements (Global)
             </div>
          )}
          {/* ------------------------------- */}

          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
            placeholder={selectedContext ? "How should I change this element?" : "Describe your layout..."}
            className="chat-input"
          />
          <button onClick={handleSubmit} disabled={isThinking} className="send-btn">
            {isThinking ? 'Processing...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
