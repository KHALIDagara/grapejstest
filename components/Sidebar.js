'use client';
import { useState, useRef, useEffect } from 'react';

// Simple Icons
const ChatIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const SaveIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;

export default function Sidebar({ messages, isThinking, onSend, selectedContext, currentPage, currentTheme, onThemeChange, onSave }) {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'settings'
    const [input, setInput] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, activeTab]);

    const handleSubmit = () => {
        if (!input.trim() || isThinking) return;
        onSend(input);
        setInput('');
    };

    const updateTheme = (key, value) => {
        if (onThemeChange && currentTheme) {
            onThemeChange({ ...currentTheme, [key]: value });
        }
    };

    return (
        <div className="sidebar">
            {/* HEADER */}
            <div className="sidebar-header">
                <div className="page-title">
                    {currentPage?.name || 'Unknown Page'}
                </div>
                <div className="tab-buttons">
                    <button
                        onClick={onSave}
                        className="tab-btn"
                        title="Save Page"
                    >
                        <SaveIcon />
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        title="AI Chat"
                    >
                        <ChatIcon />
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        title="Page Settings"
                    >
                        <SettingsIcon />
                    </button>
                </div>
            </div>

            <div className="sidebar-content-wrapper">

                {/* === TAB 1: CHAT === */}
                {activeTab === 'chat' && (
                    <>
                        <div className="chat-messages">
                            {(!messages || messages.length === 0) && (
                                <div className="empty-state">
                                    Start chatting to edit <b>{currentPage?.name}</b>.
                                </div>
                            )}
                            {messages && messages.map((msg, i) => (
                                <div key={i} className={`msg ${msg.role}`}>
                                    {msg.content}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="input-section">
                            {selectedContext && (
                                <div className="context-badge">
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

                {/* === TAB 2: SETTINGS === */}
                {activeTab === 'settings' && currentTheme && (
                    <div className="settings-panel">
                        <h3 className="settings-title">Page Theme</h3>
                        <p className="settings-subtitle">Settings for <b>{currentPage?.name}</b></p>

                        <div className="setting-group">
                            <label>Primary Color</label>
                            <div className="color-picker-wrapper">
                                <input type="color"
                                    value={currentTheme.primaryColor || '#000000'}
                                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                                    className="color-swatch"
                                />
                                <input type="text"
                                    value={currentTheme.primaryColor || ''}
                                    onChange={(e) => updateTheme('primaryColor', e.target.value)}
                                    className="text-input"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>

                        <div className="setting-group">
                            <label>Secondary Color</label>
                            <div className="color-picker-wrapper">
                                <input type="color"
                                    value={currentTheme.secondaryColor || '#ffffff'}
                                    onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                                    className="color-swatch"
                                />
                                <input type="text"
                                    value={currentTheme.secondaryColor || ''}
                                    onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                                    className="text-input"
                                    placeholder="#ffffff"
                                />
                            </div>
                        </div>

                        <div className="setting-group">
                            <label>Font Family</label>
                            <select
                                value={currentTheme.fontFamily || 'Arial'}
                                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                                className="dropdown-input"
                            >
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Georgia, serif">Georgia</option>
                                <option value="Verdana, sans-serif">Verdana</option>
                            </select>
                        </div>

                        <div className="setting-group">
                            <label>Border Radius</label>
                            <input type="text"
                                value={currentTheme.borderRadius || '4px'}
                                onChange={(e) => updateTheme('borderRadius', e.target.value)}
                                className="text-input"
                                placeholder="e.g. 8px"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
