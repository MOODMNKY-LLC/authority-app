"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import rehypeKatex from "rehype-katex"
import { cn } from "@/lib/utils"
import "katex/dist/katex.min.css"

interface EnhancedMarkdownProps {
  content: string
  className?: string
}

export function EnhancedMarkdown({ content, className }: EnhancedMarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-invert max-w-none break-words overflow-wrap-anywhere",
        // Base typography - larger, more readable
        "prose-base prose-p:text-[15px] prose-p:leading-[1.75] prose-p:my-4",
        "prose-p:tracking-[0.01em]",
        // Headings - better hierarchy and spacing
        "prose-headings:text-gray-100 prose-headings:font-bold prose-headings:tracking-tight",
        "prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:leading-tight prose-h1:font-extrabold",
        "prose-h2:text-2xl prose-h2:mt-7 prose-h2:mb-3 prose-h2:leading-tight prose-h2:font-bold",
        "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:leading-snug prose-h3:font-semibold",
        "prose-h4:text-lg prose-h4:mt-5 prose-h4:mb-2 prose-h4:font-semibold",
        // Lists - better spacing and readability
        "prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-li:leading-relaxed",
        "prose-li:pl-1 prose-li:marker:text-red-400",
        "prose-ul:list-disc prose-ol:list-decimal",
        "prose-ul:pl-6 prose-ol:pl-6",
        // Code blocks - better presentation
        "prose-pre:bg-black/50 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-xl",
        "prose-pre:p-4 prose-pre:my-5 prose-pre:overflow-x-auto prose-pre:max-w-full",
        "prose-pre:shadow-lg prose-pre:shadow-black/30",
        // Inline code - more visible
        "prose-code:text-red-400 prose-code:bg-black/40 prose-code:px-2 prose-code:py-1",
        "prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:break-words",
        "prose-code:before:content-[''] prose-code:after:content-['']",
        // Code in code blocks
        "prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0",
        "prose-pre:prose-code:text-gray-200 prose-pre:prose-code:text-sm prose-pre:prose-code:break-normal",
        "prose-pre:prose-code:before:content-none prose-pre:prose-code:after:content-none",
        // Strong and emphasis
        "prose-strong:text-gray-100 prose-strong:font-bold prose-strong:text-[15px]",
        "prose-em:text-gray-200 prose-em:italic",
        // Links - better visibility
        "prose-a:text-red-400 hover:prose-a:text-red-300 prose-a:no-underline",
        "hover:prose-a:underline prose-a:break-all prose-a:font-medium",
        "prose-a:transition-colors prose-a:duration-200",
        // Blockquotes - more prominent
        "prose-blockquote:border-l-4 prose-blockquote:border-red-600/60",
        "prose-blockquote:bg-gray-900/50 prose-blockquote:py-3 prose-blockquote:px-4",
        "prose-blockquote:my-5 prose-blockquote:rounded-r-lg prose-blockquote:italic",
        "prose-blockquote:text-gray-200 prose-blockquote:not-italic",
        // Tables - better spacing
        "prose-table:border-collapse prose-table:w-full prose-table:my-5",
        "prose-table:overflow-x-auto prose-table:rounded-lg prose-table:overflow-hidden",
        "prose-th:bg-gray-900/70 prose-th:border prose-th:border-gray-700",
        "prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold",
        "prose-th:text-gray-100 prose-th:text-sm prose-th:uppercase prose-th:tracking-wider",
        "prose-td:border prose-td:border-gray-800 prose-td:px-4 prose-td:py-3",
        "prose-td:text-gray-200 prose-td:text-sm",
        // Horizontal rules
        "prose-hr:border-gray-700 prose-hr:my-8 prose-hr:border-t-2",
        // Math equations
        "[&_.katex]:text-gray-100 [&_.katex-display]:my-6",
        "[&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
        // General improvements
        "prose-img:rounded-lg prose-img:my-5 prose-img:shadow-lg",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

