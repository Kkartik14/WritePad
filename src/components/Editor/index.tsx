import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { ShortcutExtension } from './extensions/ShortcutExtension';

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
        class: 'prose prose-invert max-w-none focus:outline-none text-foreground',
      },
    },
    parseOptions: {
      preserveWhitespace: true,
    },
  });

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

  return (
    <div className="editor-container">
      <Toolbar 
        editor={editor} 
        documentTitle={documentTitle}
        onDocumentTitleChange={onDocumentTitleChange}
        currentContent={content}
        onLoadDocument={onChange}
      />
      <div className="min-h-[400px] bg-black">
        <div className="prose prose-invert max-w-none">
          {editor && (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
      <div className="py-2 text-sm text-text-muted flex justify-between items-center bg-black">
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