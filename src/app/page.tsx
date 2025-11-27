'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WritePad } from '../components/Editor';
import { DocumentManager } from '../components/DocumentManager';
import { Editor } from '@tiptap/react';
import { TabsManager } from '../components/Editor/TabsManager';
import { FileText, Settings, HelpCircle, Printer, PlusCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DocumentSizer from '../components/DocumentSizing';
import { Modal } from '../components/Modal';
import { CollaborationProvider, useCollaboration } from '../components/CollaborationProvider';
import { NerdStats } from '../components/NerdStats';
import { ShareButton } from '../components/ShareButton';
import dynamic from 'next/dynamic';

// Wrapper to inject collaboration context
const ConnectedEditor = dynamic(() => Promise.resolve((props: React.ComponentProps<typeof WritePad>) => {
  const { doc, provider } = useCollaboration();
  return <WritePad {...props} collaborationDoc={doc} collaborationProvider={provider || undefined} />;
}), { ssr: false });

interface Tab {
  id: string;
  title: string;
  content: string;
}

export default function Home() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { theme } = useTheme(); // Assuming theme is used for styling purposes

  const [tabs, setTabs] = useState<Tab[]>([
    { id: Date.now().toString(), title: 'Untitled Document', content: '<p>Welcome to WritePad!</p>' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  // State for the content of the active editor (driven by activeTabId change)
  const [currentEditorContent, setCurrentEditorContent] = useState<string>('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [roomID, setRoomID] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for room ID on mount
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomID(room);
    }
  }, []);

  // Effect to update currentEditorContent when activeTabId or tabs change
  useEffect(() => {
    const activeTabData = tabs.find(tab => tab.id === activeTabId);
    if (activeTabData) {
      setCurrentEditorContent(activeTabData.content);
    } else if (tabs.length > 0) {
      // Fallback if activeTabId is somehow invalid but tabs exist
      setActiveTabId(tabs[0].id);
      setCurrentEditorContent(tabs[0].content);
    } else {
      // No tabs exist, create a default one
      const newTabId = Date.now().toString();
      const defaultNewTab: Tab = { id: newTabId, title: 'Untitled', content: '<p></p>' };
      setTabs([defaultNewTab]);
      setActiveTabId(defaultNewTab.id);
      setCurrentEditorContent(defaultNewTab.content);
    }
  }, [activeTabId, tabs]);


  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;

    // Save content of the PREVIOUSLY active tab
    if (editor) {
      const previousTabContent = editor.getHTML();
      setTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.id === activeTabId ? { ...tab, content: previousTabContent } : tab
        )
      );
    }
    setActiveTabId(tabId);
    // currentEditorContent will be updated by the useEffect above
  }, [activeTabId, editor]);


  const handleContentChange = useCallback((newContent: string) => {
    // Update the specific active tab's content in the tabs array immediately
    // This makes the data model consistent even before saving to localStorage
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent } : tab
      );
      // Save to localStorage
      localStorage.setItem('writepad-tabs', JSON.stringify(updatedTabs));
      return updatedTabs;
    });
    // Also update the local state for the editor if necessary, though Tiptap handles its own state
    setCurrentEditorContent(newContent);
  }, [activeTabId]);


  useEffect(() => {
    const savedTabsJson = localStorage.getItem('writepad-tabs');
    if (savedTabsJson) {
      try {
        const savedTabs = JSON.parse(savedTabsJson) as Tab[];
        if (Array.isArray(savedTabs) && savedTabs.length > 0) {
          setTabs(savedTabs);
          const savedActiveTabId = localStorage.getItem('writepad-active-tab-id');
          const validActiveTab = savedTabs.find(tab => tab.id === savedActiveTabId);

          if (validActiveTab) {
            setActiveTabId(validActiveTab.id);
            setCurrentEditorContent(validActiveTab.content);
          } else {
            // If saved active tab is not found, default to the first tab
            setActiveTabId(savedTabs[0].id);
            setCurrentEditorContent(savedTabs[0].content);
          }
        }
      } catch (e) {
        console.error("Failed to load tabs from localStorage", e);
        // Initialize with a default tab if loading fails
        const newTabId = Date.now().toString();
        const defaultTab: Tab = { id: newTabId, title: 'Untitled', content: '<p></p>' };
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
        setCurrentEditorContent(defaultTab.content);
      }
    } else {
      // No saved tabs, initialize with a default one
      const newTabId = tabs[0]?.id || Date.now().toString(); // Use existing or new
      if (!tabs[0]) {
        const defaultTab: Tab = { id: newTabId, title: 'Untitled', content: '<p></p>' };
        setTabs([defaultTab]);
        setActiveTabId(defaultTab.id);
        setCurrentEditorContent(defaultTab.content);
      }
    }
  }, []); // Run only on mount

  useEffect(() => {
    if (activeTabId) { // Only save if activeTabId is valid
      localStorage.setItem('writepad-active-tab-id', activeTabId);
    }
  }, [activeTabId]);


  const handleAddTab = useCallback(() => {
    const newTabId = Date.now().toString();
    const newTab: Tab = { id: newTabId, title: `Document ${tabs.length + 1}`, content: '<p></p>' };

    // Save current editor content before adding new tab
    if (editor) {
      const previousTabContent = editor.getHTML();
      setTabs(prevTabs => {
        const updatedOldTabs = prevTabs.map(tab =>
          tab.id === activeTabId ? { ...tab, content: previousTabContent } : tab
        );
        return [...updatedOldTabs, newTab];
      });
    } else {
      setTabs(prevTabs => [...prevTabs, newTab]);
    }

    setActiveTabId(newTabId);
    setCurrentEditorContent(newTab.content); // Set content for the new tab
  }, [tabs.length, editor, activeTabId]);


  const handleDeleteTab = useCallback((tabIdToDelete: string) => {
    if (tabs.length <= 1) return; // Don't delete the last tab

    setTabs(prevTabs => {
      const remainingTabs = prevTabs.filter(tab => tab.id !== tabIdToDelete);
      if (tabIdToDelete === activeTabId) {
        // If active tab is deleted, switch to the first available tab
        const newActiveTab = remainingTabs[0];
        setActiveTabId(newActiveTab.id);
        setCurrentEditorContent(newActiveTab.content);
      }
      localStorage.setItem('writepad-tabs', JSON.stringify(remainingTabs)); // Update localStorage
      return remainingTabs;
    });
  }, [tabs.length, activeTabId]);


  const handleRenameTab = useCallback((tabIdToRename: string, newTitle: string) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab =>
        tab.id === tabIdToRename ? { ...tab, title: newTitle } : tab
      );
      localStorage.setItem('writepad-tabs', JSON.stringify(updatedTabs)); // Update localStorage
      return updatedTabs;
    });
  }, []);

  // Get the most current HTML content from the editor instance if available
  const contentForPrinting = editor?.getHTML() || currentEditorContent;
  const activeTabForTitle = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Left Sidebar */}
      <aside className="sidebar w-60 flex-shrink-0 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">WritePad</h1>
          {/* You can add a logo or icon here */}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              title={tab.title}
              className={`flex items-center p-2 rounded-md cursor-pointer text-sm transition-colors duration-150 ${tab.id === activeTabId
                ? 'bg-[var(--selected-bg)] text-[var(--selected-fg)] font-medium'
                : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]'
                }`}
              onClick={() => handleTabChange(tab.id)}
            >
              <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate flex-1">{tab.title}</span>
              {/* Optionally add a close button for tabs here */}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--border-color)]">
          <button
            onClick={handleAddTab}
            className="w-full flex items-center justify-center px-3 py-2 bg-[var(--accent-color)] text-white text-sm rounded-md hover:bg-[var(--accent-hover)] transition-colors duration-150"
          >
            <PlusCircle size={16} className="mr-2" />
            New Document
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden"> {/* Added overflow-hidden */}
        {/* Tabs Bar + Print Button */}
        <header className="flex-shrink-0 flex items-center justify-between p-1 pr-2 bg-[var(--toolbar-bg)] border-b border-[var(--border-color)]">
          <TabsManager
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabAdd={handleAddTab}
            onTabDelete={handleDeleteTab}
            onTabRename={handleRenameTab}
          />
          <div className="ml-auto flex items-center gap-2">
            <ShareButton
              isShared={!!roomID}
              onShare={() => {
                // Generate UUID and update URL
                const newRoomID = crypto.randomUUID();
                const url = new URL(window.location.href);
                url.searchParams.set('room', newRoomID);
                window.history.pushState({}, '', url.toString());
                setRoomID(newRoomID);
              }}
            />
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="p-2 rounded-md hover:bg-[var(--hover-bg)] text-[var(--foreground)] flex-shrink-0"
              title="Page Setup & Print"
            >
              <Printer size={18} />
            </button>
          </div>
        </header>

        {/* Editor Section */}
        <section className="flex-1 overflow-y-auto bg-[var(--editor-bg)]"> {/* Editor takes remaining space and scrolls */}
          {tabs.length > 0 && activeTabId && currentEditorContent !== undefined && (
            <CollaborationProvider roomID={roomID || undefined} username="User">
              <ConnectedEditor
                key={activeTabId} // Crucial for re-initializing Tiptap with new content
                initialContent={currentEditorContent}
                onChange={handleContentChange}
                onEditorReady={setEditor}
                documentTitle={activeTabForTitle?.title || 'Untitled'}
                onDocumentTitleChange={(newTitle: string) => {
                  if (activeTabId) {
                    handleRenameTab(activeTabId, newTitle);
                  }
                }}
              />
              <NerdStats />
            </CollaborationProvider>
          )}
        </section>
      </main>

      {/* Print Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`Print: ${activeTabForTitle?.title || 'Untitled'}`}
        size="xl" // Or 'full' for a larger preview experience
      >
        <DocumentSizer>
          <div
            className="prose dark:prose-invert max-w-none p-4 print-content-area bg-white dark:bg-gray-800 text-black dark:text-white"
            style={{ minHeight: '297mm' }} // Ensure some min height for A4 example, adjust as needed
            dangerouslySetInnerHTML={{ __html: contentForPrinting }}
          />
        </DocumentSizer>
      </Modal>
    </div>
  );
}