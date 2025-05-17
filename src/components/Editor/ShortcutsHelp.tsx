import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';

export const ShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { keys: 'Ctrl/⌘ + B', description: 'Bold' },
    { keys: 'Ctrl/⌘ + I', description: 'Italic' },
    { keys: 'Ctrl/⌘ + U', description: 'Underline' },
    { keys: 'Ctrl/⌘ + ` (backtick)', description: 'Inline Code' },
    { keys: 'Ctrl/⌘ + Shift + X', description: 'Strikethrough' },
    { keys: 'Ctrl/⌘ + Alt + 1', description: 'Heading 1' },
    { keys: 'Ctrl/⌘ + Alt + 2', description: 'Heading 2' },
    { keys: 'Ctrl/⌘ + Alt + 3', description: 'Heading 3' },
    { keys: 'Ctrl/⌘ + Alt + 0', description: 'Paragraph' },
    { keys: 'Ctrl/⌘ + Shift + 7', description: 'Ordered List' },
    { keys: 'Ctrl/⌘ + Shift + 8', description: 'Bullet List' },
    { keys: 'Ctrl/⌘ + Shift + B', description: 'Blockquote' },
    { keys: 'Ctrl/⌘ + Shift + C', description: 'Code Block' },
    { keys: 'Ctrl/⌘ + Shift + L', description: 'Align Left' },
    { keys: 'Ctrl/⌘ + Shift + E', description: 'Align Center' },
    { keys: 'Ctrl/⌘ + Shift + R', description: 'Align Right' },
    { keys: 'Ctrl/⌘ + Z', description: 'Undo' },
    { keys: 'Ctrl/⌘ + Shift + Z', description: 'Redo' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="toolbar-button p-2 rounded hover:bg-hover-bg"
        title="Keyboard Shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="shortcuts-modal rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-border-color">
              <h2 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="toolbar-button p-1 rounded hover:bg-hover-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-y-4">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className={index % 2 === 0 ? "pr-4" : "pl-4"}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">{shortcut.description}</span>
                      <kbd className="px-2 py-1 rounded text-sm ml-2">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-sm text-text-muted">
                <p>Note: On Mac, use ⌘ (Command) instead of Ctrl.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 