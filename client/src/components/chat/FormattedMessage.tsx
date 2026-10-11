import React from 'react';

interface FormattedMessageProps {
  content: string;
  isStreaming?: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({
  content,
  isStreaming,
}) => {
  if (!content) return null;

  // Render inline formatting: bold, italic, code, citations
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex matches inline code, bold, italic, citations [Source X] or [X]
    const tokenRegex =
      /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+(?<!\*)|\[(?:Source\s*)?\d+\])/g;

    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Inline code: `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold: **text** or __text__
      if (
        (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
      ) {
        return (
          <strong key={index} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic: *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Citations: [Source 1] or [1]
      const citeMatch = part.match(/^\[(?:Source\s*)?(\d+)\]$/);
      if (citeMatch) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30 align-middle"
          >
            Source {citeMatch[1]}
          </span>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Split into code blocks vs text blocks
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-slate-200">
      {segments.map((segment, segIdx) => {
        if (!segment) return null;

        // Fenced code block
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const lines = segment.slice(3, -3).split('\n');
          const lang = lines[0]?.trim() || '';
          const codeBody = lang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={segIdx}
              className="my-3 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-[11px]"
            >
              {lang && (
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  {lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-slate-300">
                <code>{codeBody.trim()}</code>
              </pre>
            </div>
          );
        }

        // Regular text block: split into paragraphs / blocks
        const blocks = segment.split(/\n\s*\n/);

        return (
          <React.Fragment key={segIdx}>
            {blocks.map((block, blockIdx) => {
              const trimmed = block.trim();
              if (!trimmed) return null;

              // Headings: ###, ##, #
              const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                const text = headingMatch[2];

                if (level <= 2) {
                  return (
                    <h3
                      key={blockIdx}
                      className="text-sm font-bold text-slate-100 pt-2 pb-1 border-b border-slate-800/80"
                    >
                      {renderInline(text)}
                    </h3>
                  );
                }
                return (
                  <h4
                    key={blockIdx}
                    className="text-xs font-bold text-sky-300 pt-1.5 pb-0.5"
                  >
                    {renderInline(text)}
                  </h4>
                );
              }

              // Blockquotes: > quote
              if (trimmed.startsWith('>')) {
                const quoteText = trimmed
                  .split('\n')
                  .map((l) => l.replace(/^>\s?/, ''))
                  .join(' ');
                return (
                  <blockquote
                    key={blockIdx}
                    className="border-l-2 border-sky-500 pl-3 py-1 my-2 italic text-slate-400 bg-sky-500/5 rounded-r-lg"
                  >
                    {renderInline(quoteText)}
                  </blockquote>
                );
              }

              // Check if block is a bulleted list
              const lines = trimmed.split('\n');
              const isBulletList = lines.every((line) =>
                /^\s*[-*•]\s+/.test(line.trim())
              );
              if (isBulletList) {
                return (
                  <ul key={blockIdx} className="space-y-1.5 my-2 pl-4 list-disc text-slate-300">
                    {lines.map((line, liIdx) => {
                      const itemText = line.trim().replace(/^[-*•]\s+/, '');
                      return <li key={liIdx}>{renderInline(itemText)}</li>;
                    })}
                  </ul>
                );
              }

              // Check if block is a numbered list
              const isNumberedList = lines.every((line) =>
                /^\s*\d+\.\s+/.test(line.trim())
              );
              if (isNumberedList) {
                return (
                  <ol
                    key={blockIdx}
                    className="space-y-1.5 my-2 pl-5 list-decimal text-slate-300"
                  >
                    {lines.map((line, liIdx) => {
                      const itemText = line.trim().replace(/^\d+\.\s+/, '');
                      return <li key={liIdx}>{renderInline(itemText)}</li>;
                    })}
                  </ol>
                );
              }

              // Regular paragraph (preserving single linebreaks naturally)
              return (
                <p key={blockIdx} className="leading-relaxed">
                  {lines.map((line, lineIdx) => (
                    <React.Fragment key={lineIdx}>
                      {renderInline(line)}
                      {lineIdx < lines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-1 animate-pulse align-middle" />
      )}
    </div>
  );
};
