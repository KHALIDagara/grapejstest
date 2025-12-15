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
              licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY,
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
      <style jsx>{`
        .editor-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: black;
        }
        .loading {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }
        .editor-element {
          height: 100%;
        }
      `}</style>

      <link rel="stylesheet" href="https://unpkg.com/@grapesjs/studio-sdk/dist/style.css" />
      <Script src="https://unpkg.com/@grapesjs/studio-sdk/dist/index.umd.js" strategy="lazyOnload" />

      <div className="editor-container">
        {!isLoaded && (
          <div className="loading">
            Loading Studio SDK...
          </div>
        )}
        <div id="studio-editor" className="editor-element"></div>
      </div>
    </>
  );
}
