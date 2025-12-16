'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';
import { supabaseService } from '@/services/supabaseService';

export default function Home() {
    const editorRef = useRef(null);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    // 1. Current Transient State
    const [selectedElement, setSelectedElement] = useState(null);
    const [currentPage, setCurrentPage] = useState(null); // { name, id }
    const [isEditorReady, setIsEditorReady] = useState(false);

    // 2. THE STORE (Dictionary of Pages)
    // We keep this to switch between pages quickly, but we sync to DB.
    const [pagesStore, setPagesStore] = useState({});

    const { isThinking, generateResponse } = useAI();
    // const supabase = createClient(); // REMOVED: Using Server Actions now.

    // --- EFFECT: Check Auth & Load Data ---
    useEffect(() => {
        const init = async () => {
            // STEP 1: Check authentication FIRST (ensures session is ready)
            const user = await supabaseService.getUser();
            if (!user) {
                console.log('[Home] No user found, redirecting to login');
                router.push('/login');
                return;
            }

            console.log('[Home] User authenticated:', user.id);

            // STEP 2: Fetch user pages AFTER confirming auth (session is now guaranteed to be ready)
            const pages = await supabaseService.getUserPages();
            console.log('[Home] Fetched pages:', pages ? pages.length : 0);

            if (pages && pages.length > 0) {
                // Load existing pages into store
                const newStore = {};
                pages.forEach(p => {
                    newStore[p.id] = {
                        messages: p.messages || [],
                        theme: p.theme || { primaryColor: '#2563eb', secondaryColor: '#ffffff', fontFamily: 'Arial', borderRadius: '4px' },
                        content: p.content,
                        name: p.name
                    };
                });
                setPagesStore(newStore);
                setCurrentPage({ name: pages[0].name, id: pages[0].id });
            } else {
                // No existing pages - create default page
                console.log('[Home] No pages found, creating default page');
                const defaultId = 'page-' + Math.random().toString(36).substr(2, 9);
                const defaultPage = {
                    messages: [{ role: 'assistant', content: 'Hello! I created a new project for you.' }],
                    theme: { primaryColor: '#2563eb', secondaryColor: '#ffffff', fontFamily: 'Arial', borderRadius: '4px' },
                    content: {},
                    name: 'Home'
                };
                setPagesStore({ [defaultId]: defaultPage });
                setCurrentPage({ name: 'Home', id: defaultId });
                // Save immediately so it persists
                supabaseService.savePage(defaultId, defaultPage);
            }
            setIsLoading(false);
        };
        init();
    }, [router]);

    // --- SAVE LOGIC (Debounced) ---
    // We use a simple timeout for debounce
    const saveTimeoutRef = useRef(null);
    const savePageData = useCallback((pageId, data) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            console.log('Saving page...', pageId);
            await supabaseService.savePage(pageId, data);
        }, 1000); // 1s debounce
    }, []);

    // --- HELPER: Get Current Page Data ---
    const getCurrentPageData = () => {
        if (!currentPage || !pagesStore[currentPage.id]) return {
            messages: [],
            theme: { primaryColor: '#000000', secondaryColor: '#ffffff' }
        };
        return pagesStore[currentPage.id];
    };

    // --- 3. Handle Page Switch ---
    const handlePageChange = (pageInfo) => {
        if (!currentPage || pageInfo.id === currentPage.id) return;

        setCurrentPage(pageInfo);
        setSelectedElement(null);
        // Content loading is now handled by the useEffect below
    };

    // --- 4. Handle Theme Updates ---
    const handleThemeChange = (newTheme) => {
        if (!currentPage) return;
        const pageId = currentPage.id;
        setPagesStore(prev => {
            const newList = { ...prev };
            newList[pageId] = { ...newList[pageId], theme: newTheme };
            savePageData(pageId, newList[pageId]); // Auto-save
            return newList;
        });
    };

    // --- EFFECT: Sync Editor Content ---
    useEffect(() => {
        if (isEditorReady && editorRef.current && currentPage) {
            const pageData = pagesStore[currentPage.id];
            if (pageData && pageData.content) {
                if (editorRef.current.loadProjectData) {
                    console.log(`[Sync] Loading content for page ${currentPage.id}`);
                    editorRef.current.loadProjectData(pageData.content);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage?.id, isEditorReady]);

    // --- 5. Handle AI Logic ---
    const handleSendMessage = async (text) => {
        if (!currentPage) return;
        const pageId = currentPage.id;
        const currentData = getCurrentPageData();
        const currentHistory = currentData.messages || [];
        const currentTheme = currentData.theme;

        const userMsg = { role: 'user', content: text };
        const placeholderBotMsg = { role: 'assistant', content: '' };

        // Optimistic Update
        setPagesStore(prev => {
            const newList = { ...prev };
            newList[pageId] = {
                ...newList[pageId],
                messages: [...currentHistory, userMsg, placeholderBotMsg]
            };
            return newList;
        });

        // Update the last message in chat as AI generates/finishes
        const onStreamUpdate = (streamedText) => {
            setPagesStore(prev => {
                const pageData = prev[pageId];
                const msgs = [...pageData.messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: streamedText };
                const updatedPage = { ...pageData, messages: msgs };
                return { ...prev, [pageId]: updatedPage };
            });
        };

        // Call AI
        const historyToSend = [...currentHistory.slice(-2), userMsg];
        await generateResponse(
            editorRef.current,
            text,
            historyToSend,
            selectedElement,
            onStreamUpdate,
            null,
            currentTheme
        );

        // Final Save after AI done
        setPagesStore(prev => {
            savePageData(pageId, prev[pageId]);
            return prev;
        });
    };

    // --- 6. Handle GrapesJS Storage Save ---
    const handleGrapesSave = async (projectData, html, css, pagesData) => {
        if (!currentPage) return;
        const pageId = currentPage.id;

        console.log(`[Storage] Saving Page: ${pageId} (${currentPage.name})`);
        console.log(`[Storage] All Pages captured:`, pagesData?.length);

        setPagesStore(prev => {
            const prevPage = prev[pageId];
            if (!prevPage) return prev;
            return {
                ...prev,
                [pageId]: {
                    ...prevPage,
                    content: projectData,
                    html,
                    css,
                    rendered_pages: pagesData // Store this locally too
                }
            };
        });

        await savePageData(pageId, {
            ...pagesStore[pageId],
            content: projectData,
            html,
            css,
            rendered_pages: pagesData
        });
    };

    // Kept for backward compat or other UI updates if onUpdate is used, 
    // but Editor.js no longer calls it for saving.
    const handleEditorUpdate = () => { };

    const handleManualSave = () => {
        if (editorRef.current) {
            console.log('Triggering manual store...');
            editorRef.current.store();
            // The storage adapter will call handleGrapesSave
            alert('Save triggered!');
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white">Loading...</div>;

    return (
        <>
            <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #000;
          color: #fff;
          overflow: hidden;
        }
        .main-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        /* === SIDEBAR CSS === */
        .sidebar {
          position: relative; width: 400px; background: #1a1a1a;
          border-right: 1px solid #333; display: flex; flex-direction: column;
        }
        .sidebar-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px; background-color: #252525; border-bottom: 1px solid #333;
        }
        .page-title { font-weight: bold; font-size: 14px; color: #fff; }
        
        .tab-buttons { display: flex; gap: 5px; background: #111; padding: 4px; border-radius: 6px; }
        .tab-btn {
            background: transparent; border: none; color: #666; padding: 6px;
            cursor: pointer; border-radius: 4px; display: flex; align-items: center;
        }
        .tab-btn:hover { background: #333; }
        .tab-btn.active { background: #2563eb; color: white; }

        .sidebar-content-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        
        /* Settings Panel */
        .settings-panel { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .settings-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; }
        .settings-subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
        
        .setting-group { display: flex; flex-direction: column; gap: 6px; }
        .setting-group label { font-size: 12px; color: #ccc; }
        
        .color-picker-wrapper { display: flex; gap: 10px; }
        .color-swatch { width: 30px; height: 30px; border: none; background: none; cursor: pointer; }
        
        .text-input, .dropdown-input {
            background: #333; border: 1px solid #444; color: white;
            padding: 8px; border-radius: 4px; font-size: 12px; width: 100%;
        }

        /* Chat Styles */
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .empty-state { text-align: center; color: #666; font-size: 13px; margin-top: 40px; }
        .msg { padding: 10px 14px; border-radius: 8px; line-height: 1.5; font-size: 14px; max-width: 90%; }
        .msg.user { background: #2563eb; align-self: flex-end; }
        .msg.assistant { background: #333; align-self: flex-start; }
        
        .input-section { padding: 15px; border-top: 1px solid #333; display: flex; flex-direction: column; gap: 10px; }
        .context-badge { background: #7b1fa2; color: white; padding: 6px 10px; border-radius: 4px; font-size: 11px; }
        .chat-input { background: #2a2a2a; border: 1px solid #444; color: white; padding: 10px; border-radius: 6px; min-height: 60px; resize: vertical; }
        .send-btn { background: #2563eb; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .send-btn:disabled { background: #444; }
        
        /* Editor */
        .editor-area { flex: 1; background: #000; position: relative; }
        .loading-overlay { position: absolute; inset: 0; background: #000; color: #666; display: flex; align-items: center; justify-content: center; }
        #studio-editor { width: 100%; height: 100%; }
      `}</style>

            <div className="main-layout">
                <Sidebar
                    messages={getCurrentPageData().messages}
                    currentTheme={getCurrentPageData().theme}
                    onThemeChange={handleThemeChange}
                    currentPage={currentPage}
                    selectedContext={selectedElement}
                    onClearContext={() => setSelectedElement(null)}
                    isThinking={isThinking}
                    onSend={handleSendMessage}
                    onSave={handleManualSave}
                />
                <Editor
                    onReady={(editor) => {
                        editorRef.current = editor;
                        setIsEditorReady(true);
                    }}
                    onSelection={setSelectedElement}
                    onPageChange={handlePageChange}
                    onUpdate={handleEditorUpdate}
                    onSave={handleGrapesSave}
                />
            </div>
        </>
    );
}
