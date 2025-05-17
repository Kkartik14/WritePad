'use client';

import { useState, useEffect, useCallback } from 'react';
import { WritePad } from '../components/Editor';
import { DocumentManager } from '../components/DocumentManager';
import { Editor } from '@tiptap/react';
import { TabsManager, Tab } from '../components/Editor/TabsManager';
import { FileText, Settings, HelpCircle } from 'lucide-react';

export default function Home() {
  const [editor, setEditor] = useState<Editor | null>(null);
  
  // Tabs state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Untitled', content: '<p></p>' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  
  // Get current tab content
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];
  const [content, setContent] = useState(activeTab.content);
  
  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    // Save current content before switching
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content } 
          : tab
      )
    );
    
    // Switch to new tab
    setActiveTabId(tabId);
    const newTab = tabs.find(tab => tab.id === tabId);
    if (newTab) {
      setContent(newTab.content);
    }
  }, [activeTabId, content, tabs]);
  
  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // Save to localStorage
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content: newContent } 
        : tab
    );
    localStorage.setItem('writepad-tabs', JSON.stringify(updatedTabs));
    setTabs(updatedTabs);
  }, [activeTabId, tabs]);
  
  // Load tabs from localStorage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('writepad-tabs');
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          setTabs(parsedTabs);
          const savedActiveTabId = localStorage.getItem('writepad-active-tab-id');
          if (savedActiveTabId && parsedTabs.some(tab => tab.id === savedActiveTabId)) {
            setActiveTabId(savedActiveTabId);
            const activeTab = parsedTabs.find(tab => tab.id === savedActiveTabId);
            if (activeTab) {
              setContent(activeTab.content);
            }
          }
        }
      } catch (e) {
        console.error('Error loading tabs from localStorage:', e);
      }
    }
  }, []);
  
  // Save active tab ID to localStorage
  useEffect(() => {
    localStorage.setItem('writepad-active-tab-id', activeTabId);
  }, [activeTabId]);
  
  // Add a new tab
  const handleAddTab = useCallback(() => {
    const newTabId = Date.now().toString();
    const newTab: Tab = {
      id: newTabId,
      title: 'Untitled',
      content: '<p></p>'
    };
    
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTabId);
    setContent('<p></p>');
  }, []);
  
  // Delete a tab
  const handleDeleteTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId) {
        const newActiveTabId = newTabs[0].id;
        setActiveTabId(newActiveTabId);
        setContent(newTabs[0].content);
      }
      return newTabs;
    });
  }, [tabs.length, activeTabId]);
  
  // Rename a tab
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, title: newTitle } 
          : tab
      )
    );
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left Sidebar */}
      <div className="sidebar w-64 flex flex-col">
        <div className="p-4 border-b border-border-color">
          <h1 className="text-xl font-semibold text-foreground">WritePad</h1>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center p-2 rounded cursor-pointer mb-1 ${
                tab.id === activeTabId ? 'bg-hover-bg text-foreground' : 'text-text-muted hover:text-foreground'
              }`}
              onClick={() => handleTabChange(tab.id)}
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="truncate">{tab.title}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border-color">
          <button
            onClick={handleAddTab}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            New Document
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Tabs */}
        <div className="flex items-center p-2 bg-black">
          <TabsManager 
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabAdd={handleAddTab}
            onTabDelete={handleDeleteTab}
            onTabRename={handleRenameTab}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 bg-black">
          <WritePad 
            key={activeTabId}
            initialContent={content}
            onChange={handleContentChange}
            onEditorReady={setEditor}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="right-sidebar w-64 flex flex-col">
        <div className="p-4 border-b border-border-color">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            Document Context
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <DocumentManager 
            currentContent={content}
            onLoadDocument={(newContent) => {
              setContent(newContent);
              handleContentChange(newContent);
            }}
            editor={editor}
            documentTitle={activeTab.title}
            onDocumentTitleChange={(newTitle) => {
              handleRenameTab(activeTabId, newTitle);
            }}
          />
        </div>
        <div className="p-4 border-t border-border-color flex justify-between">
          <button className="p-2 hover:bg-hover-bg rounded text-text-muted hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-hover-bg rounded text-text-muted hover:text-foreground">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
