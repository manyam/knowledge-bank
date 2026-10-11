import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Sparkles, Layers, BookOpen } from 'lucide-react';
import { streamChat } from '../../api/client.js';
import { CitationCard } from './CitationCard.js';
import { FormattedMessage } from './FormattedMessage.js';
import type { ChatMessage, SearchResult } from '../../../../shared/types.js';

interface ChatInterfaceProps {
  onOpenDocument: (documentId: string) => void;
  docCount: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onOpenDocument, docCount }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    'Summarize the main insights across the latest indexed articles',
    'What are the key technical concepts mentioned in my knowledge bank?',
    'Compare the perspectives discussed in the saved sources',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (messageText: string = input) => {
    const text = messageText.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      citations: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setIsStreaming(true);

    const historyPayload = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let accumulatedContent = '';

    await streamChat(text, historyPayload, {
      topK: 5,
      minSimilarity: 0.25,
      onCitations: (citations: SearchResult[]) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, citations } : msg
          )
        );
      },
      onToken: (token: string) => {
        accumulatedContent += token;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      },
      onDone: () => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
      },
      onError: (err: string) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedContent
                    ? accumulatedContent + `\n\n*(Error: ${err})*`
                    : `⚠️ Unable to generate response: ${err}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0 && confirm('Clear conversation history?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">RAG Knowledge Assistant</h3>
            <p className="text-[11px] text-slate-400">
              Grounded in {docCount} local documents via DuckDB vectors
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center space-x-1"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-base font-semibold text-slate-200">
                Ask anything about your saved knowledge
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The assistant searches DuckDB for relevant article passages and uses local Ollama models to synthesize answers with source citations.
              </p>
            </div>

            <div className="w-full max-w-md space-y-2 pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Suggested Prompts
              </span>
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 transition-colors flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{q}</span>
                  <Send className="w-3 h-3 text-slate-600 group-hover:text-sky-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-3 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-tr-sm shadow-md'
                        : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-sans">
                        {message.content}
                      </div>
                    ) : (
                      <div>
                        {message.isStreaming && !message.content ? (
                          <span className="text-slate-500 animate-pulse">
                            Searching DuckDB vectors and reasoning...
                          </span>
                        ) : (
                          <FormattedMessage
                            content={message.content}
                            isStreaming={message.isStreaming}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Citations section if available */}
                  {!isUser && message.citations && message.citations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>Sources Cited from DuckDB:</span>
                      </div>
                      <div className="space-y-1.5">
                        {message.citations.map((c, idx) => (
                          <CitationCard
                            key={c.chunkId}
                            citation={c}
                            index={idx}
                            onOpenDocument={onOpenDocument}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-3"
        >
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={
              docCount === 0
                ? 'Add sources first to enable RAG chat...'
                : 'Ask a question about your knowledge bank (Enter to send, Shift+Enter for newline)...'
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none max-h-32"
          />

          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-4 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-sky-500/20 shrink-0"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
