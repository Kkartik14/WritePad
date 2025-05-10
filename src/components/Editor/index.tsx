import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { useState, useEffect, useMemo } from 'react';
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
}

export const WritePad = ({ initialContent = '<p></p>', onChange, onEditorReady }: WritePadProps) => {
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
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose-writing focus:outline-none',
      },
    }
  });
  
  // Update content when initialContent prop changes
  useEffect(() => {
    if (editor && initialContent !== content) {
      // Only set content if it's significantly different (not just cursor changes)
      const isSignificantChange = 
        initialContent.replace(/\s+/g, '') !== content.replace(/\s+/g, '');
      
      if (isSignificantChange) {
        setContent(initialContent);
        editor.commands.setContent(initialContent);
        
        // Focus the editor after content is set
        setTimeout(() => {
          editor.commands.focus();
        }, 10);
      }
    }
  }, [initialContent, content, editor]);
  
  // Provide editor instance to parent
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);
  
  // Calculate word count
  const wordCount = useMemo(() => {
    if (editor) {
      const text = editor.getText();
      if (!text) return 0;
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    return 0;
  }, [editor, content]);
  
  return (
    <div className="writepad-container bg-white">
      <Toolbar editor={editor} />
      <div className="p-4 min-h-[400px]">
        <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto">
          {editor && (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
      <div className="px-4 py-2 border-t text-sm text-gray-500 flex justify-between items-center">
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