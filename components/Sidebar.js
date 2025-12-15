'use client';
import { useState, useRef, useEffect } from 'react';

// Icons (Simple SVG placeholders)
const ChatIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

export default function Sidebar({ messages, isThinking, onSend, selectedContext, currentPage, currentTheme, onThemeChange }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'settings'
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSubmit = () => {
    if(!input.trim() || isThinking) return;
    onSend(input);
    setInput('');
  };

  // Helper to update specific theme key safely
  const updateTheme = (key, value) => {
    if (onThemeChange && currentTheme) {
        onThemeChange({ ...currentTheme, [key]: value });
    }
  };

  return (
    <div className="sidebar">
      {/* HEADER WITH TABS */}
      <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#252525]">
        <div className="font-bold text-white text-sm">
             {currentPage?.name || 'Unknown Page'}
        </div>
        <div className="flex gap-2 bg-[#1a1a1a] p-1 rounded">
            <button 
                onClick={() => setActiveTab('chat')}
                className={`p-2 rounded hover:bg-[#333] ${activeTab === 'chat' ? 'bg-[#2563eb] text-white' : 'text-gray-400'}`}
                title="AI Chat"
            >
                <ChatIcon />
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded hover:bg-[#333] ${activeTab === 'settings' ? 'bg-[#2563eb] text-white' : 'text-gray-400'}`}
                title="Page Settings"
            >
                <SettingsIcon />
            </button>
        </div>
      </div>

      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* === TAB 1: CHAT === */}
        {activeTab === 'chat' && (
            <>
                <div className="chat-messages">
                {(!messages || messages.length === 0) && (
                    <div className="text-gray-500 text-center mt-10 text-sm">
                        Start chatting to edit <b>{currentPage?.name}</b>.
                    </div>
                )}
                {messages && messages.map((msg, i) => (
                    <div key={i} className={`msg ${msg.role}`}>
                    {msg.text}
                    </div>
                ))}
                <div ref={chatEndRef} />
                </div>

                <div className="input-section">
                {selectedContext && (
                    <div className="bg-[#4a148c] text-white text-xs p-2 rounded mb-2 flex justify-between items-center">
                        <span>EDITING: <b>&lt;{selectedContext.tagName.toUpperCase()}&gt;</b></span>
                    </div>
                )}
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                    placeholder={`Ask to change ${currentPage?.name}...`}
                    className="chat-input"
                />
                <button onClick={handleSubmit} disabled={isThinking} className="send-btn">
                    {isThinking ? 'Generating...' : 'Send'}
                </button>
                </div>
            </>
        )}

        {/* === TAB 2: PAGE SETTINGS === */}
        {activeTab === 'settings' && currentTheme && (
            <div className="p-4 flex flex-col gap-4 text-white overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-400 uppercase">Page Theme</h3>
                <p className="text-xs text-gray-500">These settings apply ONLY to <b>{currentPage?.name}</b>.</p>
                
                <div className="flex flex-col gap-1">
                    <label className="text-xs">Primary Color</label>
                    <div className="flex gap-2">
                        <input type="color" 
                            value={currentTheme.primaryColor || '#000000'} 
                            onChange={(e) => updateTheme('primaryColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input type="text" 
                            value={currentTheme.primaryColor || ''}
                            onChange={(e) => updateTheme('primaryColor', e.target.value)}
                            className="bg-[#333] border border-[#444] rounded p-1 text-xs flex-1 text-white"
                            placeholder="#000000"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs">Secondary Color</label>
                    <div className="flex gap-2">
                        <input type="color" 
                            value={currentTheme.secondaryColor || '#ffffff'} 
                            onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input type="text" 
                            value={currentTheme.secondaryColor || ''}
                            onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                            className="bg-[#333] border border-[#444] rounded p-1 text-xs flex-1 text-white"
                            placeholder="#ffffff"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs">Font Family</label>
                    <select 
                        value={currentTheme.fontFamily || 'Arial'} 
                        onChange={(e) => updateTheme('fontFamily', e.target.value)}
                        className="bg-[#333] border border-[#444] rounded p-2 text-xs text-white"
                    >
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="'Courier New', monospace">Courier New</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Verdana, sans-serif">Verdana</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs">Border Radius (Buttons/Cards)</label>
                    <input type="text" 
                        value={currentTheme.borderRadius || '4px'} 
                        onChange={(e) => updateTheme('borderRadius', e.target.value)}
                        className="bg-[#333] border border-[#444] rounded p-2 text-xs text-white"
                        placeholder="e.g. 8px"
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
