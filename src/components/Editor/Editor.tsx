import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { Toolbar } from './Toolbar';

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: any) => void;
}

export const Editor = ({ initialContent = '<p></p>', onChange, onEditorReady }: EditorProps) => {
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
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert focus:outline-none text-foreground',
      },
    },
    parseOptions: {
      preserveWhitespace: true,
    },
  });

  return (
    <div className="editor-container">
      <Toolbar editor={editor} />
      <div className="flex-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}; 