import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
  Code, Quote, Underline, StrikethroughIcon, Undo, Redo
} from 'lucide-react';
import { ShortcutsHelp } from './ShortcutsHelp';

interface ToolbarProps {
  editor: Editor | null;
}

export const Toolbar = ({ editor }: ToolbarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="p-2 flex flex-wrap gap-2 bg-black">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('bold') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Bold"
      >
        <Bold className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('italic') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Italic"
      >
        <Italic className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('underline') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Underline"
      >
        <Underline className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('strike') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Strike-through"
      >
        <StrikethroughIcon className="w-5 h-5" />
      </button>
      
      <div className="border-r border-border-color mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-hover-bg text-foreground' : ''}`}
        title="Heading 1"
      >
        <Heading1 className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-hover-bg text-foreground' : ''}`}
        title="Heading 2"
      >
        <Heading2 className="w-5 h-5" />
      </button>
      
      <div className="border-r border-border-color mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('bulletList') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Bullet List"
      >
        <List className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('orderedList') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Ordered List"
      >
        <ListOrdered className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('blockquote') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Blockquote"
      >
        <Quote className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('codeBlock') ? 'bg-hover-bg text-foreground' : ''}`}
        title="Code Block"
      >
        <Code className="w-5 h-5" />
      </button>
      
      <div className="border-r border-border-color mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-hover-bg text-foreground' : ''}`}
        title="Align Left"
      >
        <AlignLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-hover-bg text-foreground' : ''}`}
        title="Align Center"
      >
        <AlignCenter className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-hover-bg text-foreground' : ''}`}
        title="Align Right"
      >
        <AlignRight className="w-5 h-5" />
      </button>
      
      <div className="border-r border-border-color mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="toolbar-button p-2 rounded"
        title="Undo"
        disabled={!editor.can().undo()}
      >
        <Undo className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="toolbar-button p-2 rounded"
        title="Redo"
        disabled={!editor.can().redo()}
      >
        <Redo className="w-5 h-5" />
      </button>
      
      <div className="ml-auto">
        <ShortcutsHelp />
      </div>
    </div>
  );
}; 