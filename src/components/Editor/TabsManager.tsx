import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

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
  onTabRename,
}: TabsManagerProps) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleInputBlur = () => {
    if (editingTabId && editingTitle.trim()) {
      onTabRename(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab group flex items-center min-w-[120px] max-w-[200px] h-8 px-3 rounded-t cursor-pointer ${
            tab.id === activeTabId ? 'active' : ''
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {editingTabId === tab.id ? (
            <input
              ref={inputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-full bg-transparent border-none outline-none"
            />
          ) : (
            <>
              <span
                className="flex-1 truncate"
                onDoubleClick={() => handleDoubleClick(tab)}
              >
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabDelete(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-0.5 hover:bg-hover-bg rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <button
        onClick={onTabAdd}
        className="p-1 hover:bg-hover-bg rounded"
        title="New Tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}; 