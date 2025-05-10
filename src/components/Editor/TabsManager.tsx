import { useState, useEffect, useRef } from 'react';
import { Plus, X, MoreHorizontal } from 'lucide-react';

export interface Tab {
  id: string;
  title: string;
  content: string;
}

interface TabsManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabAdd: () => void;
  onTabDelete: (tabId: string) => void;
  onTabRename: (tabId: string, newTitle: string) => void;
}

export const TabsManager = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabAdd,
  onTabDelete,
  onTabRename
}: TabsManagerProps) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTabClick = (tabId: string) => {
    if (editingTabId === null) {
      onTabChange(tabId);
    }
  };

  const startRenaming = (tabId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditedTitle(title);
  };

  const handleRenameSubmit = (tabId: string) => {
    if (editedTitle.trim()) {
      onTabRename(tabId, editedTitle);
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  // Handle clicking outside the input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle click outside if we're editing a tab
      if (editingTabId && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleRenameSubmit(editingTabId);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingTabId, editedTitle]);

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTabDelete(tabId);
  };

  return (
    <div className="flex items-center border-b overflow-x-auto scrollbar-hide bg-gray-50">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center px-4 py-3 cursor-pointer border-r relative min-w-[120px] max-w-[200px] transition-colors duration-150 ${
            tab.id === activeTabId 
              ? 'bg-white font-medium border-b-2 border-b-blue-500' 
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
          onClick={() => handleTabClick(tab.id)}
        >
          {editingTabId === tab.id ? (
            <input
              ref={inputRef}
              className="w-full bg-white border px-1 py-0.5 outline-none rounded"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between w-full">
              <span 
                className="truncate flex-1"
                title={tab.title}
                onDoubleClick={(e) => startRenaming(tab.id, tab.title, e)}
              >
                {tab.title}
              </span>
              <button
                className="ml-2 hover:bg-gray-200 rounded p-0.5 opacity-60 hover:opacity-100"
                onClick={(e) => handleDeleteTab(tab.id, e)}
                title="Close tab"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        className="px-3 py-3 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors duration-150"
        onClick={onTabAdd}
        title="Add new tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}; 