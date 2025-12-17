'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useAI } from '@/hooks/useAI';
import { supabaseService } from '@/services/supabaseService';

export default function Home() {
    // We use a ref to access the Editor's imperative methods (addPage, getEditor)
    const editorRef = useRef(null);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    // 1. Current State
    const [selectedElement, setSelectedElement] = useState(null);
    const [currentPage, setCurrentPage] = useState(null); // { name, id }
    const [isEditorReady, setIsEditorReady] = useState(false);

    // 2. THE STORE (Local cache of page metadata/messages)
    const [pagesStore, setPagesStore] = useState({});

    const { isThinking, generateResponse } = useAI();

    // --- EFFECT: Check Auth & Load Initial Data ---
    useEffect(() => {
        const init = async () => {
            const user = await supabaseService.getUser();
            if (!user) {
                console.log('[Home] No user found, redirecting');
                router.push('/login');
                return;
            }

            console.log('[Home] User authenticated');
            const pages = await supabaseService.getUserPages();

            if (pages && pages.length > 0) {
                // Load existing pages into store
                // We assume the first page in the list is the "active" one for initial load
                const latestPage = pages[0];
                
                const newStore = {};
                pages.forEach(p => {
                    newStore[p.id] = {
                        messages: p.messages || [],
                        theme: p.theme || { primaryColor: '#2563eb', secondaryColor: '#ffffff' },
                        content: p.content,
                        name: p.name
                    };
                });
                setPagesStore(newStore);
                setCurrentPage({ name: latestPage.name, id: latestPage.id });
            } else {
                // No existing pages - create default
                const defaultId = 'page-home-' + Math.random().toString(36).substr(2, 5);
                const defaultPage = {
                    messages: [{ role: 'assistant', content: 'Hello! I created a new project for you.' }],
                    theme: { primaryColor: '#2563eb', secondaryColor: '#ffffff' },
                    content: {},
                    name: 'Home'
                };
                setPagesStore({ [defaultId]: defaultPage });
                setCurrentPage({ name: 'Home', id: defaultId });
                supabaseService.savePage(defaultId, defaultPage);
            }
            setIsLoading(false);
        };
        init();
    }, [router]);

    // --- SAVE LOGIC (Debounced) ---
    const saveTimeoutRef = useRef(null);
    const savePageData = useCallback((pageId, data) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            console.log('Saving page to DB...', pageId);
            await supabaseService.savePage(pageId, data);
        }, 1000); 
    }, []);

    // --- 3. Handle Page Switch ---
    const handlePageChange = (pageInfo) => {
        // This is called when GrapesJS switches pages internally
        // OR when we rename a page.
        
        console.log('[Home] Page updated/switched:', pageInfo);
        
        // Just update UI state. DO NOT RELOAD EDITOR CONTENT.
        setCurrentPage(pageInfo);
        setSelectedElement(null);

        // If the name changed, update the store immediately
        setPagesStore(prev => {
            if (prev[pageInfo.id] && prev[pageInfo.id].name !== pageInfo.name) {
                const updated = { ...prev };
                updated[pageInfo.id] = { ...updated[pageInfo.id], name: pageInfo.name };
                // Also trigger a save for the rename
                savePageData(pageInfo.id, updated[pageInfo.id]);
                return updated;
            }
            return prev;
        });
    };

    // --- 4. Handle Theme Updates ---
    const handleThemeChange = (newTheme) => {
        if (!currentPage) return;
        setPagesStore(prev => {
            const newList = { ...prev };
            if (newList[currentPage.id]) {
                newList[currentPage.id] = { ...newList[currentPage.id], theme: newTheme };
                savePageData(currentPage.id, newList[currentPage.id]); 
            }
            return newList;
        });
    };

    // --- 4.5 Handle Template Selection (FIXED) ---
    const handleSelectTemplate = async (template) => {
        if (!editorRef.current) return;

        console.log('[Template] Adding new page from template:', template.name);

        // 1. Add page to LIVE editor. DO NOT wipe existing pages.
        // returns { id, name } of the newly created page
        const newPageInfo = editorRef.current.addPage(template);

        if (!newPageInfo) {
            console.error('Failed to add page via editor ref');
            return;
        }

        console.log('[Template] Page created in editor:', newPageInfo);

        // 2. Create the page data structure for our React Store/DB
        // Note: we use the ID generated by GrapesJS to ensure sync
        const newPageData = {
            messages: [], // Fresh chat history for new page
            theme: template.theme || {
                primaryColor: '#2563eb',
                secondaryColor: '#ffffff',
                fontFamily: 'Arial',
                borderRadius: '4px'
            },
            content: template.content || {},
            name: newPageInfo.name,
            html: template.html || '',
            css: template.css || ''
        };

        // 3. Update React Store
        setPagesStore(prev => ({
            ...prev,
            [newPageInfo.id]: newPageData
        }));

        // 4. Update Current Page State (UI)
        setCurrentPage({ name: newPageInfo.name, id: newPageInfo.id });

        // 5. Persist to DB immediately
        await supabaseService.savePage(newPageInfo.id, newPageData);
        
        // 6. Force a GrapesJS save to ensure the project JSON (holding the new page list) is synced
        // This ensures if the user refreshes, the new page exists in the project data
        if (editorRef.current.getEditor) {
             editorRef.current.getEditor().store();
        }
    };

    // --- 5. Handle AI Logic ---
    const handleSendMessage = async (text) => {
        if (!currentPage || !editorRef.current) return;
        const pageId = currentPage.id;
        
        // Safely get current page data or default
        const currentData = pagesStore[pageId] || { messages: [], theme: {} };
        const currentHistory = currentData.messages || [];
        const currentTheme = currentData.theme;

        const userMsg = { role: 'user', content: text };
        const placeholderBotMsg = { role: 'assistant', content: '' };

        // Optimistic Update
        setPagesStore(prev => {
            const newList = { ...prev };
            // Ensure page exists in store
            if (!newList[pageId]) newList[pageId] = { ...currentData };
            
            newList[pageId] = {
                ...newList[pageId],
                messages: [...currentHistory, userMsg, placeholderBotMsg]
            };
            return newList;
        });

        const onStreamUpdate = (streamedText) => {
            setPagesStore(prev => {
                if (!prev[pageId]) return prev;
                const pageData = prev[pageId];
                const msgs = [...pageData.messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: streamedText };
                return { ...prev, [pageId]: { ...pageData, messages: msgs } };
            });
        };

        // Call AI using the underlying GrapesJS editor instance
        // We use the getter from the ref
        const editorInstance = editorRef.current.getEditor ? editorRef.current.getEditor() : null;

        await generateResponse(
            editorInstance,
            text,
            [...currentHistory.slice(-2), userMsg],
            selectedElement,
            onStreamUpdate,
            null,
            currentTheme
        );

        // Final Save after AI
        setPagesStore(prev => {
            if (prev[pageId]) savePageData(pageId, prev[pageId]);
            return prev;
        });
    };

    // --- 6. Handle GrapesJS Storage Save ---
    const handleGrapesSave = async (projectData, html, css, pagesData) => {
        if (!currentPage) return;
        
        // We save the project data to the current page row.
        // In a "Single Row Project" model, this works perfectly.
        // In a "Multi Row Page" model, this saves the whole project structure 
        // into the 'content' field of the current page.
        
        // Important: Update store with latest HTML/CSS/Content
        setPagesStore(prev => {
            const prevPage = prev[currentPage.id];
            if (!prevPage) return prev;
            return {
                ...prev,
                [currentPage.id]: {
                    ...prevPage,
                    content: projectData,
                    html,
                    css
                }
            };
        });

        // Trigger DB save
        savePageData(currentPage.id, {
            ...pagesStore[currentPage.id],
            content: projectData,
            html,
            css
        });
        
        // Optional: If we want to sync other pages metadata (like if names changed)
        // we could loop through pagesData and update other rows, but for now 
        // saving the current active one is sufficient for persistence.
    };

    // Helper for manual save button
    const handleManualSave = () => {
        if (editorRef.current && editorRef.current.getEditor) {
            console.log('Triggering manual store...');
            editorRef.current.getEditor().store();
            alert('Saved!');
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white">Loading Project...</div>;

    // Initial data for the editor (only used on first mount)
    const initialData = currentPage && pagesStore[currentPage.id] ? pagesStore[currentPage.id].content : null;

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

        /* === TEMPLATES GALLERY === */
        .templates-gallery {
            display: flex; flex-direction: column; height: 100%; overflow: hidden;
        }
        .templates-search {
            padding: 15px; border-bottom: 1px solid #333;
        }
        .templates-search-input {
            width: 100%; background: #2a2a2a; border: 1px solid #444; color: white;
            padding: 10px; border-radius: 6px; font-size: 14px;
        }
        .templates-search-input:focus {
            outline: none; border-color: #2563eb;
        }

        .templates-loading, .templates-searching, .templates-error, .templates-empty {
            display: flex; align-items: center; justify-content: center;
            padding: 40px 20px; color: #666; font-size: 14px;
        }
        .templates-error { color: #ef4444; }

        .templates-grid {
            flex: 1; overflow-y: auto; padding: 15px;
            display: grid; grid-template-columns: 1fr;
            gap: 15px;
        }

        /* Template Card */
        .template-card {
            background: #252525; border: 1px solid #333; border-radius: 8px;
            overflow: hidden; transition: border-color 0.2s;
        }
        .template-card:hover {
            border-color: #2563eb;
        }

        .template-preview {
            width: 100%; height: 180px; background: #1a1a1a;
            position: relative; overflow: hidden;
            border-bottom: 1px solid #333;
        }
        .template-iframe {
            width: 100%; height: 100%; border: none;
            pointer-events: none;
        }
        .template-placeholder {
            display: flex; align-items: center; justify-content: center;
            height: 100%; color: #666; font-size: 12px;
        }

        .template-info {
            padding: 12px;
        }
        .template-name {
            font-size: 14px; font-weight: 600; color: #fff;
            margin: 0 0 6px 0;
        }
        .template-description {
            font-size: 12px; color: #999; margin: 0 0 10px 0;
            line-height: 1.4; display: -webkit-box;
            -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .template-tags {
            display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;
        }
        .template-tag {
            font-size: 10px; background: #333; color: #aaa;
            padding: 4px 8px; border-radius: 4px;
        }

        .template-select-btn {
            width: 100%; background: #2563eb; color: white;
            border: none; padding: 10px; border-radius: 6px;
            font-size: 13px; font-weight: 600; cursor: pointer;
            transition: background 0.2s;
        }
        .template-select-btn:hover {
            background: #1d4ed8;
        }

        /* Editor */
        .editor-area { flex: 1; background: #000; position: relative; }
        .loading-overlay { position: absolute; inset: 0; background: #000; color: #666; display: flex; align-items: center; justify-content: center; }
        #studio-editor { width: 100%; height: 100%; }
      `}</style>

            <div className="main-layout">
                <Sidebar
                    key={currentPage?.id || 'init'} // Force re-render of sidebar when page changes to update chat context
                    messages={pagesStore[currentPage?.id]?.messages || []}
                    currentTheme={pagesStore[currentPage?.id]?.theme}
                    onThemeChange={handleThemeChange}
                    currentPage={currentPage}
                    selectedContext={selectedElement}
                    onClearContext={() => setSelectedElement(null)}
                    isThinking={isThinking}
                    onSend={handleSendMessage}
                    onSave={handleManualSave}
                    onSelectTemplate={handleSelectTemplate}
                />
                <Editor
                    ref={editorRef} // Pass ref to access addPage/getEditor
                    onReady={(editor) => {
                        setIsEditorReady(true);
                    }}
                    onSelection={setSelectedElement}
                    onPageChange={handlePageChange}
                    onUpdate={() => {}}
                    onSave={handleGrapesSave}
                    initialProjectData={initialData}
                />
            </div>
        </>
    );
}
