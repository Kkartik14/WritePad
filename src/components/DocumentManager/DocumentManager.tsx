import { useState, useEffect } from 'react';
import { Save, FileText, Plus, Trash } from 'lucide-react';
import { ExportOptions } from '../Editor/ExportOptions';

interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

interface DocumentManagerProps {
  currentContent: string;
  onLoadDocument: (content: string) => void;
  editor?: any;
  documentTitle?: string;
  onDocumentTitleChange?: (newTitle: string) => void;
}

export const DocumentManager = ({ 
  currentContent, 
  onLoadDocument, 
  editor,
  documentTitle: propDocumentTitle,
  onDocumentTitleChange
}: DocumentManagerProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTitle, setDocumentTitle] = useState(propDocumentTitle || 'Untitled Document');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    if (propDocumentTitle && propDocumentTitle !== documentTitle) {
      setDocumentTitle(propDocumentTitle);
    }
  }, [propDocumentTitle]);

  useEffect(() => {
    // Load documents from local storage on component mount
    const savedDocs = localStorage.getItem('writepad-documents');
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    }
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDocumentTitle(newTitle);
    if (onDocumentTitleChange) {
      onDocumentTitleChange(newTitle);
    }
  };

  const saveDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      title: documentTitle,
      content: currentContent,
      lastModified: Date.now()
    };

    const updatedDocs = [...documents, newDoc];
    setDocuments(updatedDocs);
    localStorage.setItem('writepad-documents', JSON.stringify(updatedDocs));
    setIsMenuOpen(false);
  };

  const loadDocument = (doc: Document) => {
    onLoadDocument(doc.content);
    setDocumentTitle(doc.title);
    if (onDocumentTitleChange) {
      onDocumentTitleChange(doc.title);
    }
    setIsMenuOpen(false);
  };

  const deleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDocs = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocs);
    localStorage.setItem('writepad-documents', JSON.stringify(updatedDocs));
  };

  const createNewDocument = () => {
    onLoadDocument('<p></p>');
    const newTitle = 'Untitled Document';
    setDocumentTitle(newTitle);
    if (onDocumentTitleChange) {
      onDocumentTitleChange(newTitle);
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={documentTitle}
          onChange={handleTitleChange}
          className="px-2 py-1 border rounded flex-grow font-medium"
          placeholder="Document title"
        />
        <button 
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
          onClick={saveDocument}
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
        <button 
          className="p-2 bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <FileText className="w-4 h-4" />
          <span>Documents</span>
        </button>
        <ExportOptions 
          content={currentContent}
          documentTitle={documentTitle}
          editor={editor}
        />
      </div>

      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 z-10">
          <div className="p-2 border-b">
            <button 
              className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
              onClick={createNewDocument}
            >
              <Plus className="w-4 h-4" />
              <span>New Document</span>
            </button>
          </div>
          <div className="max-h-60 overflow-auto">
            {documents.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No saved documents</p>
            ) : (
              documents.map(doc => (
                <div 
                  key={doc.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={() => loadDocument(doc)}
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.lastModified).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="p-1 hover:bg-red-100 rounded"
                    onClick={(e) => deleteDocument(doc.id, e)}
                  >
                    <Trash className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 