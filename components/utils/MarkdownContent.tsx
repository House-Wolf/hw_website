"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({
  content,
  className = "",
}: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1 text-foreground">{children}</h3>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-crimson-light hover:text-crimson underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-xs">{children}</li>
        ),

        // Emphasis
        strong: ({ children }) => (
          <strong className="font-bold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),

        // Code
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-background-elevated px-1 py-0.5 rounded text-xs font-mono text-crimson-light">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-background-elevated p-2 rounded text-xs font-mono overflow-x-auto mb-2">
              {children}
            </code>
          );
        },

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-crimson pl-3 mb-2 text-foreground-muted italic">
            {children}
          </blockquote>
        ),

        // Horizontal rule
        hr: () => (
          <hr className="border-border-subtle my-2" />
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
