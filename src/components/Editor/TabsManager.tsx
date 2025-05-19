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
    }
  }, [editingTabId]);

  const handleDoubleClick = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleInputBlur = () => {
    if (editingTabId) {
      if (editingTitle.trim()) {
        onTabRename(editingTabId, editingTitle);
      }
      setEditingTabId(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingTitle.trim()) {
        onTabRename(editingTabId!, editingTitle);
      }
      setEditingTabId(null);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center max-w-xs px-3 py-1 rounded-t-lg border border-b-0 ${
            tab.id === activeTabId 
              ? 'bg-[#F8F2D8] border-[#D0B56F] text-black' 
              : 'bg-[#F0DCB0] border-[#DBCA9A] text-gray-700 hover:bg-[#E8D396]'
          }`}
        >
          <div
            className="truncate cursor-pointer"
            onClick={() => onTabChange(tab.id)}
            onDoubleClick={() => handleDoubleClick(tab)}
          >
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="bg-[#F8F2D8] border border-[#D0B56F] px-1 rounded focus:outline-none focus:ring-1 focus:ring-[#A97A53] text-sm"
                autoFocus
              />
            ) : (
              tab.title
            )}
          </div>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabDelete(tab.id);
              }}
              className="ml-2 text-gray-500 hover:text-black"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onTabAdd}
        className="p-1 rounded-full bg-[#E0CA80] text-black hover:bg-[#D0BA70] focus:outline-none"
        title="Add new tab"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}; 