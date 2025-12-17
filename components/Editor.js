'use client';
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

const Editor = forwardRef(({ onReady, onSelection, onPageChange, onUpdate, onSave, initialProjectData }, ref) => {
  const editorRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const initialDataRef = useRef(initialProjectData);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { initialDataRef.current = initialProjectData; }, [initialProjectData]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    addPage: (templateData) => {
      const editor = editorRef.current;
      if (!editor) return null;

      let pageContent = {};
      if (templateData.content?.pages?.length > 0) {
        pageContent = templateData.content.pages[0];
      } else {
        pageContent = templateData.content || {};
      }

      const newPage = editor.Pages.add({
        ...pageContent,
        name: templateData.name || 'New Page',
      });

      editor.Pages.select(newPage);
      return { id: newPage.getId(), name: newPage.getName() };
    }
  }));

  const handleReady = (editor) => {
    editorRef.current = editor;
    setIsLoaded(true);

    editor.on('page:select', () => {
      const page = editor.Pages.getSelected();
      if (page && onPageChange) {
        onPageChange({ id: page.getId(), name: page.getName() || 'Untitled Page' });
      }
      if (onSelection) onSelection(null);
    });

    editor.on('page:update:name', (page) => {
       if (page === editor.Pages.getSelected() && onPageChange) {
           onPageChange({ id: page.getId(), name: page.getName() });
       }
    });

    editor.on('component:selected', (model) => {
      if (!model) return;
      onSelection?.({ id: model.cid, tagName: model.get('tagName'), currentHTML: model.toHTML() });
    });

    editor.on('component:deselected', () => onSelection?.(null));
    editor.on('update', () => onUpdate?.());
    onReady?.(editor);
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
            storage: {
              type: 'self',
              autosaveChanges: 50,
              autosaveIntervalMs: 5000,
              onSave: async ({ project }) => {
                if (onSaveRef.current && editorRef.current) {
                  const editor = editorRef.current;
                  const pagesData = editor.Pages.getAll().map(page => ({
                      id: page.getId(),
                      name: page.getName(),
                      html: editor.getHtml({ component: page.getMainComponent() }),
                      css: editor.getCss({ component: page.getMainComponent() })
                  }));
                  await onSaveRef.current(project, editor.getHtml(), editor.getCss(), pagesData);
                }
              },
              onLoad: async () => {
                console.log('[Editor] onLoad: Loading from DB Ref');
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
