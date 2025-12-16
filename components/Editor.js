'use client';
import { useRef, useState, useEffect } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

export default function Editor({ onReady, onSelection, onPageChange, onUpdate, onSave }) {
  const editorRef = useRef(null);
  const onSaveRef = useRef(onSave); // Keep track of latest onSave prop
  const [isLoaded, setIsLoaded] = useState(false);

  // Update ref when prop changes
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleReady = (editor) => {
    editorRef.current = editor;
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

    // 4. Update Listener
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
            // root: '#studio-editor', // REMOVED: Managed by React Component
            theme: 'dark',
            project: { type: 'web' },
            assets: {
              storageType: 'self',
              onUpload: async ({ files }) => {
                console.log('Assets upload triggered', files);
                // TODO: Implement actual upload
                return [];
              },
              onDelete: async ({ assets }) => {
                console.log('Assets delete triggered', assets);
              }
            },
            storage: {
              type: 'self',
              autosaveChanges: 100,
              autosaveIntervalMs: 10000,
              onSave: async ({ project }) => {
                if (onSaveRef.current && editorRef.current) {
                  const editor = editorRef.current;

                  // Capture HTML/CSS for ALL pages
                  const pages = editor.Pages.getAll();
                  const pagesData = pages.map(page => {
                    const component = page.getMainComponent();
                    return {
                      id: page.id,
                      name: page.get('name'),
                      html: editor.getHtml({ component }),
                      css: editor.getCss({ component })
                    };
                  });

                  // For backward compatibility, also send current page's HTML/CSS as top-level args
                  // But the structured `pagesData` is what resolves the user's issue.
                  const currentHtml = editor.getHtml();
                  const currentCss = editor.getCss();

                  await onSaveRef.current(project, currentHtml, currentCss, pagesData);
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
