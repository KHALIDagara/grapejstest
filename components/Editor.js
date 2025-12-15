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
              
              // 1. Tailwind Plugin (Handles the UI/Dropdowns on the right)
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

                // --- FORCE INJECT TAILWIND (The Fix) ---
                // We manually grab the iframe and shove the script in.
                // This bypasses any configuration merging issues.
                const frameEl = editor.Canvas.getFrameEl();
                const frameDoc = frameEl.contentWindow.document;
                
                const script = frameDoc.createElement('script');
                script.src = "https://cdn.tailwindcss.com";
                script.onload = () => {
                    // Optional: Configure Tailwind to play nice with GrapesJS
                    const configScript = frameDoc.createElement('script');
                    configScript.innerHTML = `
                        tailwind.config = {
                            corePlugins: { preflight: false } // Disable reset to save default styles
                        }
                    `;
                    frameDoc.head.appendChild(configScript);
                    console.log("✅ Tailwind loaded in Canvas");
                };
                frameDoc.head.appendChild(script);
                // ---------------------------------------

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
