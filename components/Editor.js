'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Editor({ onReady, onSelection, onPageChange, onUpdate }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.GrapesJsStudioSDK) {
        clearInterval(interval);

        const container = document.getElementById('studio-editor');
        if (container && container.innerHTML === '') {

          window.GrapesJsStudioSDK.createStudioEditor({
            root: '#studio-editor',
            licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || '',
            theme: 'dark',
            project: { type: 'web' },
            assets: { storageType: 'self' },

            onReady: (editor) => {
              setIsLoaded(true);
              window.studioEditor = editor;

              // --- HELPER: Get Page Info ---
              const sendPageInfo = () => {
                const page = editor.Pages.getSelected();

                // FIX: Check if 'page' exists before accessing .id
                if (page && onPageChange) {
                  onPageChange({
                    id: page.id,
                    name: page.get('name') || 'Untitled Page'
                  });
                }
              };

              // 1. Send initial page info
              sendPageInfo();

              // 2. Listen for Page Switches
              editor.on('page:select', () => {
                sendPageInfo();
                // Also clear selection when switching pages
                if (onSelection) onSelection(null);
              });

              // 3. Selection Listeners
              editor.on('component:selected', (model) => {
                if (!model) return;
                const elData = {
                  id: model.cid,
                  tagName: model.get('tagName'),
                  currentHTML: model.toHTML()
                };
                if (onSelection) onSelection(elData);
              });

              editor.on('component:deselected', () => {
                if (onSelection) onSelection(null);
              });

              // 4. Change Listener for Auto-Save
              editor.on('update', () => {
                if (onUpdate) {
                  // Pass a function to get data to avoid heavy serialization on every event if not needed
                  // Or just pass the data object
                  const projectData = editor.getProjectData();
                  onUpdate(projectData);
                }
              });

              if (onReady) onReady(editor);
            }
          });
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [onReady, onSelection, onPageChange]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/@grapesjs/studio-sdk/dist/style.css" />
      <Script src="https://unpkg.com/@grapesjs/studio-sdk/dist/index.umd.js" strategy="lazyOnload" />
      <div className="editor-area">
        {!isLoaded && <div className="loading-overlay">Loading Studio SDK...</div>}
        <div id="studio-editor" style={{ height: '100%' }}></div>
      </div>
    </>
  );
}
