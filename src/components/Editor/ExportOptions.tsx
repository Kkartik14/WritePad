import { Download, FileText, Code, FileJson } from 'lucide-react';
import { useState } from 'react';

interface ExportOptionsProps {
  content: string;
  documentTitle: string;
  editor: any;
}

export const ExportOptions = ({ content, documentTitle, editor }: ExportOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportAsHTML = () => {
    const blob = new Blob([content], { type: 'text/html' });
    downloadBlob(blob, `${documentTitle}.html`);
    setIsOpen(false);
  };

  const exportAsText = () => {
    if (editor) {
      const text = editor.getText();
      const blob = new Blob([text], { type: 'text/plain' });
      downloadBlob(blob, `${documentTitle}.txt`);
      setIsOpen(false);
    }
  };

  const exportAsMarkdown = () => {
    if (editor) {
      // This is a very simple HTML to Markdown conversion
      // For a real app, use a proper HTML to Markdown converter
      let html = content;
      
      // Replace headings
      html = html.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
      html = html.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
      html = html.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
      
      // Replace paragraphs
      html = html.replace(/<p>(.*?)<\/p>/g, '$1\n\n');
      
      // Replace bold
      html = html.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
      
      // Replace italic
      html = html.replace(/<em>(.*?)<\/em>/g, '*$1*');
      
      // Replace links
      html = html.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');
      
      // Replace lists - using multiline approach instead of /s flag
      html = html.replace(/<ul>([^]*?)<\/ul>/g, (match, p1) => {
        return p1.replace(/<li>(.*?)<\/li>/g, '- $1\n');
      });
      
      html = html.replace(/<ol>([^]*?)<\/ol>/g, (match, p1) => {
        let i = 1;
        return p1.replace(/<li>(.*?)<\/li>/g, () => {
          return `${i++}. $1\n`;
        });
      });
      
      // Replace blockquotes
      html = html.replace(/<blockquote>([^]*?)<\/blockquote>/g, '> $1\n\n');
      
      // Replace code blocks
      html = html.replace(/<pre><code>([^]*?)<\/code><\/pre>/g, '```\n$1\n```\n\n');
      
      // Replace inline code
      html = html.replace(/<code>(.*?)<\/code>/g, '`$1`');
      
      // Remove any remaining HTML tags
      html = html.replace(/<[^>]*>/g, '');
      
      // Fix double spaces and clean up
      html = html.replace(/\n\s*\n/g, '\n\n');
      
      const blob = new Blob([html], { type: 'text/markdown' });
      downloadBlob(blob, `${documentTitle}.md`);
      setIsOpen(false);
    }
  };

  const exportAsJSON = () => {
    const jsonData = {
      title: documentTitle,
      content: content,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${documentTitle}.json`);
    setIsOpen(false);
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-[#E0CA80] hover:bg-[#D0BA70] rounded flex items-center gap-1 text-gray-700 hover:text-black"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-[#F5E5B0] border border-[#D0B56F] rounded-lg shadow-lg z-10 w-48">
          <div className="p-1">
            <button
              onClick={exportAsHTML}
              className="w-full text-left p-2 hover:bg-[#E0CA80] rounded flex items-center gap-2 text-gray-700 hover:text-black"
            >
              <FileText className="w-4 h-4" />
              <span>Export as HTML</span>
            </button>
            <button
              onClick={exportAsText}
              className="w-full text-left p-2 hover:bg-[#E0CA80] rounded flex items-center gap-2 text-gray-700 hover:text-black"
            >
              <FileText className="w-4 h-4" />
              <span>Export as Text</span>
            </button>
            <button
              onClick={exportAsMarkdown}
              className="w-full text-left p-2 hover:bg-[#E0CA80] rounded flex items-center gap-2 text-gray-700 hover:text-black"
            >
              <Code className="w-4 h-4" />
              <span>Export as Markdown</span>
            </button>
            <button
              onClick={exportAsJSON}
              className="w-full text-left p-2 hover:bg-[#E0CA80] rounded flex items-center gap-2 text-gray-700 hover:text-black"
            >
              <FileJson className="w-4 h-4" />
              <span>Export as JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 