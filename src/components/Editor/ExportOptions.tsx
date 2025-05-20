import { Editor } from '@tiptap/react';
import { Share2, FileText, Code2, AlignLeft, Braces } from 'lucide-react';
import { useState } from 'react';

interface ExportOptionsProps {
  editor: Editor;
}

export const ExportOptions = ({ editor }: ExportOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportAs = (format: 'html' | 'text' | 'markdown' | 'json') => {
    let content = '';
    let fileName = `document.${format === 'html' ? 'html' : format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt'}`;
    let mimeType = 'text/plain';
    
    switch (format) {
      case 'html':
        content = editor.getHTML();
        mimeType = 'text/html';
        break;
      case 'text':
        content = editor.getText();
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = editor.storage.markdown?.getMarkdown() || '';
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(editor.getJSON(), null, 2);
        mimeType = 'application/json';
        break;
    }
    
    // Create a downloadable file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Close menu after export
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 bg-[var(--selected-bg)] hover:bg-[var(--hover-bg)] rounded flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--foreground)]"
        title="Export Options"
      >
        <Share2 className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9]" onClick={closeMenu}></div>
          <div className="absolute top-full right-0 mt-1 bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-lg shadow-lg z-10 w-48">
            <div className="p-2">
              <button
                onClick={() => exportAs('markdown')}
                className="w-full text-left p-2 hover:bg-[var(--hover-bg)] rounded flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <FileText className="w-4 h-4" /> Markdown
              </button>
              <button
                onClick={() => exportAs('html')}
                className="w-full text-left p-2 hover:bg-[var(--hover-bg)] rounded flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <Code2 className="w-4 h-4" /> HTML
              </button>
              <button
                onClick={() => exportAs('text')}
                className="w-full text-left p-2 hover:bg-[var(--hover-bg)] rounded flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <AlignLeft className="w-4 h-4" /> Plain Text
              </button>
              <button
                onClick={() => exportAs('json')}
                className="w-full text-left p-2 hover:bg-[var(--hover-bg)] rounded flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <Braces className="w-4 h-4" /> JSON
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 