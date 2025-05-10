import { Download, FileText, Code, FileJson } from 'lucide-react';
import { useState } from 'react';

interface ExportOptionsProps {
  content: string;
  documentTitle: string;
  editor: any;
}

export const ExportOptions = ({ content, documentTitle, editor }: ExportOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const exportAsHTML = () => {
    const fileName = `${sanitizeFilename(documentTitle)}.html`;
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; }
    pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 3px; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    downloadFile(htmlContent, fileName, 'text/html');
    setIsOpen(false);
  };

  const exportAsText = () => {
    const fileName = `${sanitizeFilename(documentTitle)}.txt`;
    const plainText = editor ? editor.getText() : content.replace(/<[^>]*>/g, '');
    downloadFile(plainText, fileName, 'text/plain');
    setIsOpen(false);
  };

  const exportAsMarkdown = () => {
    const fileName = `${sanitizeFilename(documentTitle)}.md`;
    // This is a very simple HTML to Markdown conversion
    // For a production app, you'd want to use a proper HTML to Markdown converter
    let markdown = content
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre><code>(.*?)<\/code><\/pre>/g, '```\n$1\n```\n\n')
      .replace(/<ul>(.*?)<\/ul>/g, '$1\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ol>(.*?)<\/ol>/g, '$1\n')
      .replace(/<li>(.*?)<\/li>/g, '1. $1\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<br>/g, '\n')
      .replace(/&nbsp;/g, ' ');

    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    downloadFile(markdown, fileName, 'text/markdown');
    setIsOpen(false);
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
        title="Export Document"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[200px]">
          <div className="p-2">
            <button
              onClick={exportAsHTML}
              className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
              title="Export as HTML"
            >
              <Code className="w-4 h-4" />
              <span>Export as HTML</span>
            </button>
            <button
              onClick={exportAsText}
              className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
              title="Export as Plain Text"
            >
              <FileText className="w-4 h-4" />
              <span>Export as Plain Text</span>
            </button>
            <button
              onClick={exportAsMarkdown}
              className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
              title="Export as Markdown"
            >
              <FileJson className="w-4 h-4" />
              <span>Export as Markdown</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 