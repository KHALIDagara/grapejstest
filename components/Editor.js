'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import grapesjsTailwind from 'grapesjs-tailwind';

export default function Editor({ onReady, onSelection }) { 
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
              plugins: [
                {
                  id: 'grapesjs-tailwind',
                  src: grapesjsTailwind,
                  options: {
                    // Optional: Custom config for the plugin
                    suggestClasses: true // Enables autocomplete for Tailwind classes
                  }
                }
              ],
              // 3. Keep the Canvas Script (Required for Visual Rendering)
              // The plugin handles the UI (dropdowns), but this handles the Rendering.
              canvas: {
                scripts: ['https://cdn.tailwindcss.com']
              },
             
              onReady: (editor) => {
                setIsLoaded(true);
                window.studioEditor = editor; 

                // --- 1. SELECTION LISTENER (FIXED) ---
                editor.on('component:selected', (model) => {
                    // Safety check
                    if (!model) return;

                    const elData = {
                        // FIX: use .cid (property), not .getCid() (function)
                        id: model.cid, 
                        tagName: model.get('tagName'),
                        currentHTML: model.toHTML() 
                    };
                    if (onSelection) onSelection(elData);
                });

                // --- 2. DESELECTION LISTENER ---
                editor.on('component:deselected', () => {
                    if (onSelection) onSelection(null);
                });

                if (onReady) onReady(editor);
              }
            });
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [onReady, onSelection]);

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
