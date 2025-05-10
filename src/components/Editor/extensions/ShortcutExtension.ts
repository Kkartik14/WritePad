import { Extension } from '@tiptap/core';

export const ShortcutExtension = Extension.create({
  name: 'shortcutExtension',
  
  addKeyboardShortcuts() {
    return {
      // Formatting shortcuts
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      
      // Heading shortcuts
      'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      
      // List shortcuts
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      
      // Blockquote & Code block
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
      'Mod-Shift-c': () => this.editor.commands.toggleCodeBlock(),
      
      // Alignment shortcuts
      'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
      
      // Paragraph
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
    }
  },
}); 