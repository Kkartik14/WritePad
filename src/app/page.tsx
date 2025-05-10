'use client';

import { useState, useEffect, useCallback } from 'react';
import { WritePad } from '../components/Editor';
import { DocumentManager } from '../components/DocumentManager';
import { Editor } from '@tiptap/react';
import { TabsManager, Tab } from '../components/Editor/TabsManager';

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
  
  // Load tabs from localStorage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('writepad-tabs');
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          setTabs(parsedTabs);
          const savedActiveTabId = localStorage.getItem('writepad-active-tab-id');
          // Make sure the saved active tab exists in the saved tabs
          if (savedActiveTabId && parsedTabs.some(tab => tab.id === savedActiveTabId)) {
            setActiveTabId(savedActiveTabId);
            const activeTab = parsedTabs.find(tab => tab.id === savedActiveTabId);
            if (activeTab) {
              setContent(activeTab.content);
            }
          } else {
            setActiveTabId(parsedTabs[0].id);
            setContent(parsedTabs[0].content);
          }
        }
      } catch (e) {
        console.error('Error loading tabs from localStorage:', e);
      }
    }
  }, []);
  
  // Save tabs to localStorage whenever they change
  useEffect(() => {
    // Save current content to active tab before saving
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content } 
        : tab
    );
    
    localStorage.setItem('writepad-tabs', JSON.stringify(updatedTabs));
    localStorage.setItem('writepad-active-tab-id', activeTabId);
  }, [tabs, activeTabId, content]);
  
  // Update the tab content when the editor content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: newContent } 
          : tab
      )
    );
  }, [activeTabId]);
  
  // Change active tab
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTabId) return; // Skip if already active
    
    // Save current content before switching
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content } 
          : tab
      );
      
      // Set the content of the new active tab
      const newActiveTab = updatedTabs.find(tab => tab.id === tabId);
      if (newActiveTab) {
        // Use setTimeout to avoid state update conflicts
        setTimeout(() => {
          setContent(newActiveTab.content);
        }, 0);
      }
      
      return updatedTabs;
    });
    
    // Update active tab id
    setActiveTabId(tabId);
  }, [activeTabId, content]);
  
  // Add a new tab
  const handleAddTab = useCallback(() => {
    const newTabId = Date.now().toString();
    const newTab: Tab = {
      id: newTabId,
      title: `Untitled ${tabs.length + 1}`,
      content: '<p></p>'
    };
    
    // Save current content before adding new tab
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content } 
          : tab
      );
      
      return [...updatedTabs, newTab];
    });
    
    setActiveTabId(newTabId);
    setContent('<p></p>');
  }, [tabs.length, activeTabId, content]);
  
  // Delete a tab
  const handleDeleteTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) {
      return; // Don't delete the last tab
    }
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're deleting the active tab, switch to the first tab
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
  
  // Get current tab title for document manager
  const activeTabTitle = activeTab.title;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="z-10 max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">WritePad</h1>
        
        <div className="w-full max-w-4xl mx-auto">
          <DocumentManager 
            currentContent={content}
            onLoadDocument={(newContent) => {
              setContent(newContent);
              handleContentChange(newContent);
            }}
            editor={editor}
            documentTitle={activeTabTitle}
            onDocumentTitleChange={(newTitle) => {
              handleRenameTab(activeTabId, newTitle);
            }}
          />
          
          <div className="mt-4 border rounded-lg shadow overflow-hidden bg-white">
            <TabsManager 
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={handleTabChange}
              onTabAdd={handleAddTab}
              onTabDelete={handleDeleteTab}
              onTabRename={handleRenameTab}
            />
            
            <WritePad 
              key={activeTabId} // Force re-render when tab changes
              initialContent={content}
              onChange={handleContentChange}
              onEditorReady={setEditor}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
