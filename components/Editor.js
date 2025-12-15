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
                  options: { suggestClasses: true }
                }
              ],

              onReady: (editor) => {
                setIsLoaded(true);
                window.studioEditor = editor; 

                // --- 1. FORCE INJECT TAILWIND ---
                const frameEl = editor.Canvas.getFrameEl();
                
                // Helper to load script
                const injectScript = () => {
                    const frameDoc = frameEl.contentWindow?.document;
                    if (!frameDoc) return;

                    // Prevent duplicate loading
                    if (frameDoc.getElementById('tailwind-script')) return;

                    const script = frameDoc.createElement('script');
                    script.id = 'tailwind-script';
                    script.src = "https://cdn.tailwindcss.com";
                    
                    script.onload = () => {
                        // Disable Preflight to prevent layout shifts
                        const config = frameDoc.createElement('script');
                        config.innerHTML = `tailwind.config = { corePlugins: { preflight: false } }`;
                        frameDoc.head.appendChild(config);
                        console.log("✅ Tailwind injected successfully!");
                    };
                    frameDoc.head.appendChild(script);
                };

                // Try immediately, and also listen for frame load (rendering changes)
                injectScript();
                editor.on('load', injectScript);
                // --------------------------------

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
