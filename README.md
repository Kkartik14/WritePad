# WritePad

WritePad is an open-source rich text editor built with Next.js, TipTap, and Tailwind CSS. It provides a clean, intuitive interface for document creation and editing.

## Features

- Modern rich text editing
- Comprehensive formatting options:
  - Text styling (bold, italic, underline, strikethrough)
  - Headings (H1, H2)
  - Lists (ordered and unordered)
  - Blockquotes and code blocks
  - Text alignment controls
- Notion-like tabbed interface:
  - Create multiple documents in tabs
  - Switch between tabs with a single click
  - Start with a clean slate (no placeholder text)
  - Automatic cursor focus when switching tabs
  - Rename tabs with double-click
  - Add and delete tabs as needed
  - Persistent tabs saved to localStorage
- Document management:
  - Save documents locally
  - Open saved documents
  - Export in multiple formats (HTML, Plain Text, Markdown)
- Keyboard shortcuts for all formatting options
- Word count tracking
- Clean, responsive UI
- Built with modern web technologies

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [TipTap](https://tiptap.dev/) - Headless editor framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide React](https://lucide.dev/) - Beautiful & consistent icons

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Keyboard Shortcuts

WritePad offers a comprehensive set of keyboard shortcuts for efficient editing:

| Action | Shortcut |
|--------|----------|
| Bold | Ctrl/⌘ + B |
| Italic | Ctrl/⌘ + I |
| Underline | Ctrl/⌘ + U |
| Strikethrough | Ctrl/⌘ + Shift + X |
| Heading 1 | Ctrl/⌘ + Alt + 1 |
| Heading 2 | Ctrl/⌘ + Alt + 2 |
| Ordered List | Ctrl/⌘ + Shift + 7 |
| Bullet List | Ctrl/⌘ + Shift + 8 |
| Blockquote | Ctrl/⌘ + Shift + B |
| Code Block | Ctrl/⌘ + Shift + C |
| Align Left | Ctrl/⌘ + Shift + L |
| Align Center | Ctrl/⌘ + Shift + E |
| Align Right | Ctrl/⌘ + Shift + R |

## Using Tabs

WritePad features a Notion-like tabbed interface that allows you to:

1. **Create new tabs** - Click the "+" button to add a new tab
2. **Switch between tabs** - Click on any tab to view its content
3. **Start fresh** - New tabs begin with a clean slate and auto-focus the cursor
4. **Rename tabs** - Double-click on a tab name to edit it
5. **Delete tabs** - Click the "X" on any tab to remove it (at least one tab will always remain)
6. **Work across sessions** - Tabs and their content are automatically saved to localStorage

Each tab maintains its own separate content and title, allowing you to work on multiple documents simultaneously without losing your work.

## Exporting Documents

WritePad allows you to export your documents in multiple formats:

1. **HTML** - Export with basic styling for web use
2. **Plain Text** - Export as simple text without formatting
3. **Markdown** - Export in Markdown format for use in other applications

Click the "Export" button in the document manager to access these options.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Ensure all code is properly typed with TypeScript
2. Follow the existing component structure
3. Use Tailwind CSS for styling
4. Write meaningful commit messages
5. Update documentation as necessary

## License

This project is open source and available under the [MIT License](LICENSE).
