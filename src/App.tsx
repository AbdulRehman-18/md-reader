import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { 
  Moon, Sun, Download, FileText, Type, Image as ImageIcon, Link2, 
  List, ListOrdered, Code, Quote, LayoutPanelLeft, FileDown, Scissors
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion } from 'motion/react';

// Configure marked with highlight.js
marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  gfm: true,
  breaks: true,
});

const DEFAULT_MARKDOWN = `# Markdown Studio
A modern, minimalist markdown editor and previewer.

## Features
- **Live Preview**: See your changes instantly
- *Exports*: Download as \`.md\`, \`.html\`, or print to PDF!
- ~~Cluttered UI~~ Clean, distraction-free design

> "Simplicity is the ultimate sophistication."

### Code Blocks
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
greet('World');
\`\`\`

### Task Lists
- [x] Set up project
- [ ] Write documentation
- [ ] Ship to production

| Feature | Status |
| :--- | :--- |
| Autosave | Active |
| Dark Mode | Supported |
| Export | Available |
`;

export default function App() {
  const [markdown, setMarkdown] = useState(() => {
    return localStorage.getItem('markdown-studio-content') || DEFAULT_MARKDOWN;
  });
  const [html, setHtml] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  const [fileName, setFileName] = useState('Untitled.md');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Mobile views
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [isMobile, setIsMobile] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced Render
  useEffect(() => {
    const timer = setTimeout(() => {
      const rawHtml = marked(markdown);
      const cleanHtml = DOMPurify.sanitize(rawHtml as string);
      setHtml(cleanHtml);
      
      // Calculate words and time
      const text = markdown.replace(/[#*`_>\[\]\(\)-]/g, '').trim();
      const words = text ? text.split(/\s+/).length : 0;
      setWordCount(words);
      setReadTime(Math.ceil(words / 200)); // Average reading speed 200wpm
      
      // Autosave
      localStorage.setItem('markdown-studio-content', markdown);
    }, 150);
    return () => clearTimeout(timer);
  }, [markdown]);

  // Dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        exportFile('md');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markdown, fileName]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newRatio > 20 && newRatio < 80) {
      setSplitRatio(newRatio);
    }
  }, [isDragging]);

  const stopDrag = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', stopDrag);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [isDragging, handleDrag, stopDrag]);

  // File parsing
  const handleFileImport = (file: File) => {
    if (!file.name.endsWith('.md')) {
      alert('Please select a Markdown (.md) file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setMarkdown(e.target.result as string);
        setFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileImport(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const exportFile = (type: 'md' | 'html' | 'pdf') => {
    setShowExportMenu(false);
    
    if (type === 'pdf') {
      window.print();
      return;
    }

    const blob = new Blob(
      [type === 'md' ? markdown : `<!DOCTYPE html><html><head><title>${fileName}</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6} pre{background:#f4f4f4;padding:1rem;overflow:auto} code{background:#f4f4f4;padding:0.2rem} blockquote{border-left:4px solid #ccc;margin-left:0;padding-left:1rem;color:#666}</style></head><body>${html}</body></html>`],
      { type: type === 'md' ? 'text/markdown' : 'text/html' }
    );
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.md$/, '') + (type === 'md' ? '.md' : '.html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const text = editorRef.current.value;
    
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    setMarkdown(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  return (
    <div className="flex flex-col h-screen bg-[color:var(--color-bg)] font-sans overflow-hidden transition-colors duration-200">
      {/* Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <div className="flex items-center gap-2">
          <div className="bg-[color:var(--color-text-primary)] text-[color:var(--color-surface)] p-1 rounded">
            <LayoutGridIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg hidden sm:block tracking-tight text-[color:var(--color-text-primary)]">
            Markdown Studio
          </span>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-[color:var(--color-text-primary)] w-32 sm:w-48 focus:ring-2 focus:ring-[color:var(--color-accent)] rounded px-2 py-1 truncate text-center"
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] rounded-md transition-colors"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 bg-[color:var(--color-text-primary)] text-[color:var(--color-surface)] px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <span>Export</span>
                <Download className="w-4 h-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-md shadow-lg z-50 py-1">
                  <button onClick={() => exportFile('md')} className="w-full text-left px-4 py-2 text-sm text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Download .md
                  </button>
                  <button onClick={() => exportFile('html')} className="w-full text-left px-4 py-2 text-sm text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] flex items-center gap-2">
                    <Code className="w-4 h-4" /> Download .html
                  </button>
                  <button onClick={() => exportFile('pdf')} className="w-full text-left px-4 py-2 text-sm text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> Print PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Pane */}
      <main 
        ref={containerRef}
        className="flex-1 flex flex-col md:flex-row min-h-0 relative"
      >
        {/* Editor Pane (Left on desktop) */}
        <section 
          className={cn(
            "flex-col h-full",
            isMobile ? (mobileView === 'edit' ? 'flex flex-1' : 'hidden') : "flex"
          )}
          style={{ width: isMobile ? '100%' : `${splitRatio}%` }}
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-x-auto hide-scrollbar shrink-0">
            <ToolbarButton icon={<Type className="w-4 h-4" />} onClick={() => insertFormatting('**', '**')} title="Bold" />
            <ToolbarButton icon={<span className="italic font-serif w-4 h-4 flex items-center justify-center">I</span>} onClick={() => insertFormatting('*', '*')} title="Italic" />
            <ToolbarButton icon={<Scissors className="w-4 h-4" />} onClick={() => insertFormatting('~~', '~~')} title="Strikethrough" />
            <div className="w-px h-4 bg-[color:var(--color-border)] mx-1" />
            <ToolbarButton icon={<Code className="w-4 h-4" />} onClick={() => insertFormatting('`', '`')} title="Inline Code" />
            <ToolbarButton icon={<LayoutPanelLeft className="w-4 h-4" />} onClick={() => insertFormatting('\n\`\`\`\n', '\n\`\`\`\n')} title="Code Block" />
            <div className="w-px h-4 bg-[color:var(--color-border)] mx-1" />
            <ToolbarButton icon={<Link2 className="w-4 h-4" />} onClick={() => insertFormatting('[', '](url)')} title="Link" />
            <ToolbarButton icon={<ImageIcon className="w-4 h-4" />} onClick={() => insertFormatting('![alt](', ')')} title="Image" />
            <div className="w-px h-4 bg-[color:var(--color-border)] mx-1" />
            <ToolbarButton icon={<List className="w-4 h-4" />} onClick={() => insertFormatting('- ')} title="Bullet List" />
            <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} onClick={() => insertFormatting('1. ')} title="Numbered List" />
            <ToolbarButton icon={<Quote className="w-4 h-4" />} onClick={() => insertFormatting('> ')} title="Blockquote" />
            
            <div className="flex-1" />
            
            <label className="cursor-pointer px-2 py-1 text-xs font-medium text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] rounded transition-colors hidden sm:block">
              Import file...
              <input 
                type="file" 
                accept=".md" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
              />
            </label>
            <button 
              onClick={() => {
                if (window.confirm('Clear all content?')) {
                  setMarkdown('');
                  editorRef.current?.focus();
                }
              }}
              className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded transition-colors hidden sm:block"
            >
              Clear
            </button>
          </div>

          {/* Textarea */}
          <div 
            className="flex-1 relative cursor-text group"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <textarea
              ref={editorRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="absolute inset-0 w-full h-full p-4 sm:p-6 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-[color:var(--color-text-primary)] hide-scrollbar"
              placeholder="Start typing your markdown here... (or drag and drop a .md file)"
              spellCheck="false"
            />
            {/* Minimalist word count footer */}
            <div className="absolute bottom-2 left-4 text-xs font-mono text-[color:var(--color-text-muted)] opacity-50 group-hover:opacity-100 transition-opacity bg-[color:var(--color-bg)]/80 px-2 py-1 rounded">
              {wordCount} words • {readTime} min read
            </div>
          </div>
        </section>

        {/* Resizer */}
        {!isMobile && (
          <div 
            className="w-1.5 hover:w-2 -ml-[1px] cursor-col-resize hover:bg-[color:var(--color-accent)]/80 bg-[color:var(--color-border)] z-10 transition-all flex items-center justify-center group"
            onMouseDown={() => setIsDragging(true)}
          >
            <div className="h-8 w-1 rounded-full bg-[color:var(--color-text-muted)] opacity-0 group-hover:opacity-50" />
          </div>
        )}

        {/* Preview Pane (Right on desktop) */}
        <section 
          className={cn(
            "h-full overflow-y-auto hide-scrollbar bg-[color:var(--color-surface)]",
            isMobile ? (mobileView === 'preview' ? 'block flex-1' : 'hidden') : "block"
          )}
          style={{ width: isMobile ? '100%' : `${100 - splitRatio}%` }}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto p-6 sm:p-10 lg:p-16"
          >
            <div 
              className="prose font-serif"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </motion.div>
        </section>

        {/* Mobile Toggle Bar */}
        {isMobile && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[color:var(--color-surface)] p-1 rounded-full shadow-lg border border-[color:var(--color-border)]">
            <button
              onClick={() => setMobileView('edit')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                mobileView === 'edit' ? "bg-[color:var(--color-text-primary)] text-[color:var(--color-surface)]" : "text-[color:var(--color-text-muted)]"
              )}
            >
              Edit
            </button>
            <button
              onClick={() => setMobileView('preview')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                mobileView === 'preview' ? "bg-[color:var(--color-text-primary)] text-[color:var(--color-surface)]" : "text-[color:var(--color-text-muted)]"
              )}
            >
              Preview
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg)] rounded transition-colors"
    >
      {icon}
    </button>
  );
}

function LayoutGridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}
