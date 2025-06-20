import { Editor } from '@tiptap/react';
import { 
  Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
  Code, Quote, Underline, StrikethroughIcon, Undo, Redo, Save, FileText, Sparkles, Wand2
} from 'lucide-react';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useState } from 'react';
import { DocumentManager } from '../DocumentManager';
import { AIPrompt } from './AIPrompt';
import { ThemeSwitcher } from '../ThemeSwitcher';

interface ToolbarProps {
  editor: Editor | null;
  documentTitle?: string;
  onDocumentTitleChange?: (newTitle: string) => void;
  currentContent?: string;
  onLoadDocument?: (content: string) => void;
  autocompleteEnabled?: boolean;
  onToggleAutocomplete?: () => void;
}

export const Toolbar = ({ 
  editor, 
  documentTitle, 
  onDocumentTitleChange,
  currentContent,
  onLoadDocument,
  autocompleteEnabled = false,
  onToggleAutocomplete
}: ToolbarProps) => {
  const [showDocManager, setShowDocManager] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);

  if (!editor) {
    return null;
  }

  const handleGenerateTemplate = (template: string) => {
    // Replace editor content with the template
    editor.commands.setContent(template);
    
    // Focus the editor
    editor.commands.focus();
  };

  return (
    <div className="p-2 flex flex-wrap gap-2 bg-[var(--toolbar-bg)] border-b border-[var(--border-color)]">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('bold') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Bold"
      >
        <Bold className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('italic') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Italic"
      >
        <Italic className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('underline') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Underline"
      >
        <Underline className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('strike') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Strike-through"
      >
        <StrikethroughIcon className="w-5 h-5" />
      </button>
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Heading 1"
      >
        <Heading1 className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Heading 2"
      >
        <Heading2 className="w-5 h-5" />
      </button>
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('bulletList') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Bullet List"
      >
        <List className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('orderedList') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Ordered List"
      >
        <ListOrdered className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('blockquote') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Blockquote"
      >
        <Quote className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`toolbar-button p-2 rounded ${editor.isActive('codeBlock') ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Code Block"
      >
        <Code className="w-5 h-5" />
      </button>
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Align Left"
      >
        <AlignLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Align Center"
      >
        <AlignCenter className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`toolbar-button p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
        title="Align Right"
      >
        <AlignRight className="w-5 h-5" />
      </button>
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="toolbar-button p-2 rounded text-[var(--text-muted)]"
        title="Undo"
        disabled={!editor.can().undo()}
      >
        <Undo className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="toolbar-button p-2 rounded text-[var(--text-muted)]"
        title="Redo"
        disabled={!editor.can().redo()}
      >
        <Redo className="w-5 h-5" />
      </button>
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      {/* Autocomplete Toggle Button */}
      {onToggleAutocomplete && (
        <button
          onClick={onToggleAutocomplete}
          className={`toolbar-button p-2 rounded ${autocompleteEnabled ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)]' : 'text-[var(--text-muted)]'}`}
          title={autocompleteEnabled ? "Turn off AI autocomplete" : "Turn on AI autocomplete"}
        >
          <Wand2 className="w-5 h-5" />
          <span className="sr-only">AI Autocomplete</span>
        </button>
      )}
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      {/* Theme Switcher */}
      <ThemeSwitcher />
      
      <div className="border-r border-[var(--border-color)] mx-1 h-6 self-center"></div>
      
      <button
        onClick={() => setShowAIPrompt(true)}
        className="toolbar-button p-2 rounded bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
        title="AI Template Generator"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      
      <div className="ml-auto flex items-center gap-2">
        <input 
          type="text"
          value={documentTitle}
          onChange={(e) => onDocumentTitleChange?.(e.target.value)}
          placeholder="Untitled"
          className="border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--editor-bg)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
        />
        
        {currentContent && onLoadDocument && (
          <button
            onClick={() => setShowDocManager(!showDocManager)}
            className="toolbar-button p-2 rounded text-[var(--text-muted)] hover:bg-[var(--selected-bg)]"
            title="Document Manager"
          >
            <FileText className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {showDocManager && currentContent && onLoadDocument && (
        <div className="absolute right-0 top-full mt-2 bg-[var(--modal-bg)] border border-[var(--border-color)] rounded shadow-lg z-50 w-64">
          <div className="p-2">
            <DocumentManager
              currentContent={currentContent}
              onLoadDocument={onLoadDocument}
              editor={editor}
              documentTitle={documentTitle}
              onDocumentTitleChange={onDocumentTitleChange}
            />
          </div>
        </div>
      )}
      
      {showAIPrompt && (
        <AIPrompt
          onClose={() => setShowAIPrompt(false)}
          onGenerateTemplate={handleGenerateTemplate}
        />
      )}
    </div>
  );
}; 