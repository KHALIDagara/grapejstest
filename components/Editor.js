'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Editor({ onReady }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Poll for the SDK until it exists
    const interval = setInterval(() => {
      if (window.GrapesJsStudioSDK) {
        clearInterval(interval);
        
        // Prevent double init
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
                if (onReady) onReady(editor);
              }
            });
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [onReady]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/@grapesjs/studio-sdk/dist/style.css" />
      <Script src="https://unpkg.com/@grapesjs/studio-sdk/dist/index.umd.js" strategy="lazyOnload" />
      
      <div className="relative w-full h-full bg-black">
        {!isLoaded && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Loading Studio SDK...
             </div>
        )}
        <div id="studio-editor" style={{ height: '100%' }}></div>
      </div>
    </>
  );
}
