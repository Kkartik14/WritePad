import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { ShortcutExtension } from './extensions/ShortcutExtension';
import { AutocompleteExtension } from './extensions/AutocompleteExtension';
import { Wand2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { ShortcutsHelp } from './ShortcutsHelp';
import { ExportOptions } from './ExportOptions';

// Helper function to dispatch debug messages to the UI - matches the one in AutocompleteExtension
function dispatchDebugMessage(message: string) {
  document.dispatchEvent(new CustomEvent('autocomplete-debug', {
    detail: message
  }));
}

interface WritePadProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: TiptapEditor) => void;
  documentTitle?: string;
  onDocumentTitleChange?: (newTitle: string) => void;
  collaborationDoc?: Y.Doc;
  collaborationProvider?: WebsocketProvider;
  username?: string;
}

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];

export const WritePad = ({
  initialContent = '<p></p>',
  onChange,
  onEditorReady,
  documentTitle = 'Untitled',
  onDocumentTitleChange,
  collaborationDoc,
  collaborationProvider,
  username = 'Anonymous'
}: WritePadProps) => {
  const [wordCount, setWordCount] = useState(0);
  const [content, setContent] = useState(initialContent);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const extensions = [
    StarterKit.configure({
      // Disable history if collaboration is enabled (Y.js handles it)
      history: collaborationDoc ? false : undefined,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
      defaultAlignment: 'left',
    }),
    Underline,
    ShortcutExtension,
    AutocompleteExtension.configure({
      enabled: autocompleteEnabled,
    }),
  ];

  if (collaborationDoc) {
    extensions.push(
      Collaboration.configure({
        document: collaborationDoc,
        // No need to specify field - we relay raw Y.js updates now
      })
    );

    if (collaborationProvider) {
      extensions.push(
        CollaborationCursor.configure({
          provider: collaborationProvider,
          user: {
            name: username,
            color: colors[Math.floor(Math.random() * colors.length)],
          },
        })
      );
    }
  }

  const editor = useEditor({
    extensions,
    content: collaborationDoc ? null : initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      onChange?.(html);

      // Update word count
      const text = editor.getText();
      if (text.trim() === '') {
        setWordCount(0);
      } else {
        setWordCount(text.split(/\s+/).filter(word => word !== '').length);
      }
    },
    onCreate: ({ editor }) => {
      if (onEditorReady) {
        onEditorReady(editor);
      }

      // Initial word count
      const text = editor.getText();
      if (text.trim() === '') {
        setWordCount(0);
      } else {
        setWordCount(text.split(/\s+/).filter(word => word !== '').length);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none text-black',
      },
    },
    parseOptions: {
      preserveWhitespace: true,
    },
  });

  // Update autocomplete extension when toggled
  useEffect(() => {
    if (editor) {
      // Extension options are read-only after initialization, so we need to recreate the extension
      console.log('Autocomplete enabled state changed to:', autocompleteEnabled);

      // Try getting the extension instance
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'autocomplete');
      if (extension) {
        console.log('Found autocomplete extension, current enabled state:', extension.options.enabled);

        // Make sure the storage exists
        if (!editor.storage.autocomplete) {
          console.log('Initializing autocomplete storage');
          editor.storage.autocomplete = { enabled: autocompleteEnabled };
        } else {
          console.log('Current storage before update:', editor.storage.autocomplete);
        }

        // Since we can't modify extension options directly post-initialization,
        // we'll use a storage value to track state
        editor.storage.autocomplete = {
          ...editor.storage.autocomplete,
          enabled: autocompleteEnabled
        };

        console.log('Updated storage value:', editor.storage.autocomplete);
        console.log('All editor storage:', editor.storage);

        // Force an update of the entire editor state
        editor.view.updateState(editor.view.state);

        // Check again after update to confirm the storage was properly set
        setTimeout(() => {
          console.log('Storage value after update:', editor.storage.autocomplete);
          if (editor.storage.autocomplete?.enabled !== autocompleteEnabled) {
            console.warn('Storage value does not match expected state!');
          }
        }, 100);

        dispatchDebugMessage(`Autocomplete ${autocompleteEnabled ? 'enabled' : 'disabled'}`);
      } else {
        console.error('Autocomplete extension not found');
      }
    }
  }, [autocompleteEnabled, editor]);

  // Listen for force update events
  useEffect(() => {
    if (!editor) return;

    const handleForceUpdate = () => {
      console.log('Forcing editor update');
      editor.view.updateState(editor.view.state);
    };

    document.addEventListener('force-editor-update', handleForceUpdate);
    return () => {
      document.removeEventListener('force-editor-update', handleForceUpdate);
    };
  }, [editor]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = () => {
      // Handle keyboard shortcuts here if needed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  // Update debug message with new events
  useEffect(() => {
    if (!autocompleteEnabled) {
      setDebugMsg(null);
      return;
    }

    // Listen for the new message events
    const handleMessage = (event: CustomEvent) => {
      const { message, type } = event.detail;
      setDebugMsg(`${type}: ${message}`);

      // Clear message after different durations based on type
      const duration = type === 'error' ? 5000 : type === 'success' ? 2000 : 3000;
      setTimeout(() => {
        setDebugMsg(null);
      }, duration);
    };

    document.addEventListener('autocomplete-message', handleMessage as EventListener);
    return () => {
      document.removeEventListener('autocomplete-message', handleMessage as EventListener);
    };
  }, [autocompleteEnabled]);

  return (
    <div className="editor-container h-full flex flex-col">
      <Toolbar
        editor={editor}
        documentTitle={documentTitle}
        onDocumentTitleChange={onDocumentTitleChange}
        currentContent={content}
        onLoadDocument={onChange}
        autocompleteEnabled={autocompleteEnabled}
        onToggleAutocomplete={() => setAutocompleteEnabled(!autocompleteEnabled)}
      />
      {autocompleteEnabled && (
        <div className="bg-[var(--sidebar-bg)] text-[var(--foreground)] text-sm p-2 border-b border-[var(--border-color)]">
          <div className="flex items-center">
            <Wand2 className="w-4 h-4 mr-1 text-[var(--accent-color)]" />
            <div className="flex-1">
              <strong>AI Autocomplete is ON</strong> - Type naturally and see AI suggestions appear. Press <kbd className="px-1 py-0.5 bg-[var(--kbd-bg)] rounded border border-[var(--kbd-border)] mx-1">Tab</kbd> to accept or <kbd className="px-1 py-0.5 bg-[var(--kbd-bg)] rounded border border-[var(--kbd-border)] mx-1">Esc</kbd> to dismiss.
              {debugMsg && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-opacity-80" style={{
                  backgroundColor: debugMsg.startsWith('error') ? '#fee' :
                    debugMsg.startsWith('success') ? '#efe' :
                      debugMsg.startsWith('loading') ? '#fef' : '#eef',
                  color: debugMsg.startsWith('error') ? '#c33' :
                    debugMsg.startsWith('success') ? '#363' :
                      debugMsg.startsWith('loading') ? '#636' : '#336'
                }}>
                  {debugMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={`flex-grow min-h-[400px] bg-[var(--editor-bg)] overflow-y-auto max-h-[calc(100vh-180px)] ${autocompleteEnabled ? 'has-suggestion' : ''}`}>
        <div className="prose max-w-none p-4">
          {editor && (
            <EditorContent editor={editor} className="prose prose-slate max-w-none" />
          )}
        </div>
      </div>
      <div className="py-2 text-sm text-[var(--background)] flex justify-between items-center bg-[var(--accent-color)] px-4">
        <div>
          {wordCount > 0 && `${wordCount} word${wordCount !== 1 ? 's' : ''}`}
        </div>
        <div className="flex space-x-2">
          <ShortcutsHelp />
          {editor && <ExportOptions editor={editor} />}
        </div>
      </div>
    </div>
  );
};

export { Editor, Toolbar };