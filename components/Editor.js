'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Editor({ onReady, onSelection, onPageChange }) { 
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

                // 1. SELECTION LISTENER
                editor.on('component:selected', (model) => {
                    if (!model) return;
                    const elData = {
                        id: model.cid,
                        tagName: model.get('tagName'),
                        currentHTML: model.toHTML() 
                    };
                    if (onSelection) onSelection(elData);
                });

                // 2. DESELECTION LISTENER
                editor.on('component:deselected', () => {
                    if (onSelection) onSelection(null);
                });

                // 3. PAGE CHANGE LISTENER (New)
                editor.on('page:select', () => {
                    if (onPageChange) onPageChange();
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
