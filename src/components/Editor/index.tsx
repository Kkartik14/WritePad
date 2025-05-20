import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { ShortcutExtension } from './extensions/ShortcutExtension';
import { AutocompleteExtension } from './extensions/AutocompleteExtension';
import { Wand2 } from 'lucide-react';

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
}

export const WritePad = ({ 
  initialContent = '<p></p>', 
  onChange, 
  onEditorReady,
  documentTitle = 'Untitled',
  onDocumentTitleChange
}: WritePadProps) => {
  const [wordCount, setWordCount] = useState(0);
  const [content, setContent] = useState(initialContent);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Underline,
      Strike,
      ShortcutExtension,
      AutocompleteExtension.configure({
        enabled: autocompleteEnabled,
      }),
    ],
    content: initialContent,
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

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle keyboard shortcuts here if needed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  // Update debug message periodically
  useEffect(() => {
    if (!autocompleteEnabled) {
      setDebugMsg(null);
      return;
    }
    
    // Listen for the custom events
    const handleDebugMessage = (event: CustomEvent) => {
      setDebugMsg(event.detail);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setDebugMsg(null);
      }, 3000);
    };
    
    document.addEventListener('autocomplete-debug', handleDebugMessage as EventListener);
    return () => {
      document.removeEventListener('autocomplete-debug', handleDebugMessage as EventListener);
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
        <div className="bg-[#F5E5B0] text-black text-sm p-2 border-b border-[#D0B56F]">
          <span className="flex items-center">
            <Wand2 className="w-4 h-4 mr-1" /> 
            <span>
              <strong>AI Autocomplete is ON</strong> - As you type, AI will suggest completions. Press <kbd className="px-1 py-0.5 bg-[#E0CA80] rounded border border-[#D0B56F] mx-1">Space</kbd> to accept a suggestion.
              {debugMsg && (
                <span className="ml-2 text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-xs">
                  {debugMsg}
                </span>
              )}
            </span>
          </span>
        </div>
      )}
      <div className={`flex-grow min-h-[400px] bg-[#F8F2D8] overflow-y-auto max-h-[calc(100vh-180px)] ${autocompleteEnabled ? 'has-suggestion' : ''}`}>
        <div className="prose max-w-none p-4">
          {editor && (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
      <div className="py-2 text-sm text-white flex justify-between items-center bg-[#A97A53] px-4">
        <div>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
        <div>
          WritePad Editor
        </div>
      </div>
    </div>
  );
};

export { Editor, Toolbar }; 