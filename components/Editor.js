'use client';
import { useRef, useState } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

export default function Editor({ onReady, onSelection, onPageChange, onUpdate, onSave }) {
  const editorInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleReady = (editor) => {
    editorInstanceRef.current = editor;
    setIsLoaded(true);
    window.studioEditor = editor; // For debugging/global access if needed

    // --- HELPER: Get Page Info ---
    const sendPageInfo = () => {
      const page = editor.Pages.getSelected();
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

    // 4. Update Listener (Optional, usually for visual feedback)
    editor.on('update', () => {
      if (onUpdate) onUpdate();
    });

    if (onReady) onReady(editor);
  };

  return (
    <div className="editor-area">
      {!isLoaded && <div className="loading-overlay">Loading Studio SDK...</div>}
      <div id="studio-editor" style={{ height: '100%' }}>
        <StudioEditor
          options={{
            licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || '',
            root: '#studio-editor', // Important to mount cleanly
            theme: 'dark',
            project: { type: 'web' },
            assets: { storageType: 'self' },
            storage: {
              type: 'self',
              autosaveChanges: 100,
              autosaveIntervalMs: 10000,
              onSave: async ({ project }) => {
                if (onSave && editorInstanceRef.current) {
                  const html = editorInstanceRef.current.getHtml();
                  const css = editorInstanceRef.current.getCss();
                  await onSave(project, html, css);
                } else {
                  console.warn('onSave prop missing or editor not ready');
                }
              },
              onLoad: async () => {
                // We currently load data via loadProjectData separately
                return {};
              }
            }
          }}
          onReady={handleReady}
        />
      </div>
    </div>
  );
}
