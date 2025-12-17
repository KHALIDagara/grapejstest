'use client';
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

// Use forwardRef to expose editor methods to the parent
const Editor = forwardRef(({ onReady, onSelection, onPageChange, onUpdate, onSave, initialProjectData }, ref) => {
  const editorRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const initialDataRef = useRef(initialProjectData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep refs updated
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    initialDataRef.current = initialProjectData;
  }, [initialProjectData]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    // Get direct access to editor instance if needed
    getEditor: () => editorRef.current,

    // THE FIX: Dedicated method to add a page without wiping the project
    addPage: (templateData) => {
      const editor = editorRef.current;
      if (!editor) return null;

      console.log('[Editor] addPage called for template:', templateData.name);

      // 1. Extract content. Templates might be full projects ({ pages: [...] }) or just component trees.
      let pageContent = {};
      if (templateData.content) {
        if (templateData.content.pages && templateData.content.pages.length > 0) {
          // It's a project export, take the first page
          pageContent = templateData.content.pages[0];
        } else {
          // It's raw component data
          pageContent = templateData.content;
        }
      }

      // 2. Add new page to GrapesJS
      // Explicitly set the name from the template to prevent "Untitled"
      const newPage = editor.Pages.add({
        ...pageContent,
        name: templateData.name || 'New Page',
        // Let GrapesJS generate a unique ID to ensure no conflicts
        id: undefined 
      });

      // 3. Select the new page immediately
      editor.Pages.select(newPage);

      // 4. Return new ID and Name for React state sync
      return {
        id: newPage.getId(),
        name: newPage.getName()
      };
    },

    // Optional: Load data (destructive) - only used on initial load now
    loadProjectData: (data) => {
      if (editorRef.current) {
        editorRef.current.loadProjectData(data);
      }
    }
  }));

  const handleReady = (editor) => {
    editorRef.current = editor;
    setIsLoaded(true);
    window.studioEditor = editor; // For debugging

    // 1. Listen for Page Switches
    editor.on('page:select', () => {
      const page = editor.Pages.getSelected();
      if (page && onPageChange) {
        console.log('[Editor] Page switched internally to:', page.getName(), page.getId());
        
        // Notify parent of the switch so it can update UI (Sidebar title, etc.)
        // WITHOUT triggering a data reload
        onPageChange({
          id: page.getId(),
          name: page.getName() || 'Untitled Page'
        });
      }
      // Clear selection on page switch
      if (onSelection) onSelection(null);
    });

    // 2. Listen for Page Renames (Fixes "Untitled" persistence issue)
    editor.on('page:update:name', (page) => {
       if (page === editor.Pages.getSelected() && onPageChange) {
           onPageChange({
               id: page.getId(),
               name: page.getName()
           });
       }
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
            theme: 'dark',
            project: { type: 'web' },
            assets: {
              storageType: 'self',
              onUpload: async ({ files }) => {
                console.log('Assets upload triggered', files);
                return [];
              },
            },
            storage: {
              type: 'self',
              autosaveChanges: 100,
              autosaveIntervalMs: 10000,
              onSave: async ({ project }) => {
                if (onSaveRef.current && editorRef.current) {
                  const editor = editorRef.current;
                  
                  // Capture metadata for ALL pages to keep DB updated
                  const pages = editor.Pages.getAll();
                  const pagesData = pages.map(page => {
                    const component = page.getMainComponent();
                    return {
                      id: page.getId(),
                      name: page.getName(),
                      // Optional: grab HTML/CSS if needed for thumbnails
                      html: editor.getHtml({ component }),
                      css: editor.getCss({ component })
                    };
                  });

                  await onSaveRef.current(project, editor.getHtml(), editor.getCss(), pagesData);
                }
              },
              onLoad: async () => {
                // Load initial data if provided (only runs once on mount)
                console.log('[Editor] onLoad triggered');
                return initialDataRef.current || {};
              }
            }
          }}
          onReady={handleReady}
        />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';
export default Editor;
