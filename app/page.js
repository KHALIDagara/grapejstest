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

    const [selectedElement, setSelectedElement] = useState(null);
    const [currentPage, setCurrentPage] = useState(null); 
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [pagesStore, setPagesStore] = useState({});

    const { isThinking, generateResponse } = useAI();

    useEffect(() => {
        const init = async () => {
            const user = await supabaseService.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const pages = await supabaseService.getUserPages();

            if (pages && pages.length > 0) {
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

    const saveTimeoutRef = useRef(null);
    const savePageData = useCallback((pageId, data) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            // Guard: Never save if content is missing to prevent overwriting with "fallback project"
            if (!data.content || Object.keys(data.content).length === 0) return;
            
            console.log('Saving to DB...', pageId);
            await supabaseService.savePage(pageId, data);
        }, 1500); 
    }, []);

    const handlePageChange = (pageInfo) => {
        setCurrentPage(pageInfo);
        setSelectedElement(null);

        setPagesStore(prev => {
            if (prev[pageInfo.id] && prev[pageInfo.id].name !== pageInfo.name) {
                const updated = { ...prev };
                updated[pageInfo.id] = { ...updated[pageInfo.id], name: pageInfo.name };
                savePageData(pageInfo.id, updated[pageInfo.id]);
                return updated;
            }
            return prev;
        });
    };

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

    const handleSelectTemplate = async (template) => {
        if (!editorRef.current) return;

        // 1. Add page to LIVE editor
        const newPageInfo = editorRef.current.addPage(template);
        if (!newPageInfo) return;

        const newPageData = {
            messages: [],
            theme: template.theme || { primaryColor: '#2563eb', secondaryColor: '#ffffff' },
            content: template.content || {},
            name: newPageInfo.name,
            html: template.html || '',
            css: template.css || ''
        };

        // 2. Sync React state
        setPagesStore(prev => ({ ...prev, [newPageInfo.id]: newPageData }));
        setCurrentPage({ name: newPageInfo.name, id: newPageInfo.id });

        // 3. Immediate Save
        await supabaseService.savePage(newPageInfo.id, newPageData);
        
        // 4. Force internal GrapesJS sync
        if (editorRef.current.getEditor) {
             editorRef.current.getEditor().store();
        }
    };

    const handleSendMessage = async (text) => {
        if (!currentPage || !editorRef.current) return;
        const pageId = currentPage.id;
        const currentData = pagesStore[pageId] || { messages: [], theme: {} };
        const currentHistory = currentData.messages || [];
        const currentTheme = currentData.theme;

        const userMsg = { role: 'user', content: text };
        const placeholderBotMsg = { role: 'assistant', content: '' };

        setPagesStore(prev => {
            const newList = { ...prev };
            if (!newList[pageId]) newList[pageId] = { ...currentData };
            newList[pageId].messages = [...currentHistory, userMsg, placeholderBotMsg];
            return newList;
        });

        const onStreamUpdate = (streamedText) => {
            setPagesStore(prev => {
                if (!prev[pageId]) return prev;
                const msgs = [...prev[pageId].messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: streamedText };
                return { ...prev, [pageId]: { ...prev[pageId], messages: msgs } };
            });
        };

        const editorInstance = editorRef.current.getEditor();
        await generateResponse(
            editorInstance,
            text,
            [...currentHistory.slice(-2), userMsg],
            selectedElement,
            onStreamUpdate,
            null,
            currentTheme
        );

        setPagesStore(prev => {
            if (prev[pageId]) savePageData(pageId, prev[pageId]);
            return prev;
        });
    };

    const handleGrapesSave = async (projectData, html, css, pagesData) => {
        if (!currentPage) return;

        // CRITICAL GUARD: Prevent "Fallback project" from overwriting real data
        if (!projectData || !projectData.pages || projectData.pages.length === 0) {
            console.warn('[Storage] Blocked empty save');
            return;
        }

        const pageId = currentPage.id;
        const updatedData = {
            ...pagesStore[pageId],
            content: projectData,
            html,
            css
        };

        setPagesStore(prev => ({ ...prev, [pageId]: updatedData }));
        savePageData(pageId, updatedData);
    };

    const handleManualSave = () => {
        if (editorRef.current?.getEditor) {
            editorRef.current.getEditor().store();
            alert('Saved!');
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white">Loading Project...</div>;

    return (
        <>
            <style jsx global>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: sans-serif; background: #000; color: #fff; overflow: hidden; }
                .main-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
                .sidebar { position: relative; width: 400px; background: #1a1a1a; border-right: 1px solid #333; display: flex; flex-direction: column; }
                .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #252525; border-bottom: 1px solid #333; }
                .page-title { font-weight: bold; font-size: 14px; color: #fff; }
                .tab-buttons { display: flex; gap: 5px; background: #111; padding: 4px; border-radius: 6px; }
                .tab-btn { background: transparent; border: none; color: #666; padding: 6px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; }
                .tab-btn:hover { background: #333; }
                .tab-btn.active { background: #2563eb; color: white; }
                .sidebar-content-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
                .settings-panel { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
                .settings-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; }
                .settings-subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
                .setting-group { display: flex; flex-direction: column; gap: 6px; }
                .setting-group label { font-size: 12px; color: #ccc; }
                .color-picker-wrapper { display: flex; gap: 10px; }
                .color-swatch { width: 30px; height: 30px; border: none; background: none; cursor: pointer; }
                .text-input, .dropdown-input { background: #333; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px; font-size: 12px; width: 100%; }
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
                .templates-gallery { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .templates-search { padding: 15px; border-bottom: 1px solid #333; }
                .templates-search-input { width: 100%; background: #2a2a2a; border: 1px solid #444; color: white; padding: 10px; border-radius: 6px; font-size: 14px; }
                .templates-grid { flex: 1; overflow-y: auto; padding: 15px; display: grid; grid-template-columns: 1fr; gap: 15px; }
                .editor-area { flex: 1; background: #000; position: relative; }
                .loading-overlay { position: absolute; inset: 0; background: #000; color: #666; display: flex; align-items: center; justify-content: center; }
                #studio-editor { width: 100%; height: 100%; }
            `}</style>

            <div className="main-layout">
                <Sidebar
                    key={currentPage?.id || 'init'}
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
                    ref={editorRef}
                    onReady={() => setIsEditorReady(true)}
                    onSelection={setSelectedElement}
                    onPageChange={handlePageChange}
                    onSave={handleGrapesSave}
                    initialProjectData={currentPage ? pagesStore[currentPage.id]?.content : null}
                />
            </div>
        </>
    );
}
