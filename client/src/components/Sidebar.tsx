import React from 'react';
import { Rss, Search, MessageSquare, BookOpen, Database, Sparkles } from 'lucide-react';

export type ActiveTab = 'sources' | 'search' | 'chat' | 'documents';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  sourceCount: number;
  docCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  sourceCount,
  docCount,
}) => {
  const navItems = [
    {
      id: 'sources' as ActiveTab,
      label: 'Sources & Feeds',
      description: 'URLs, RSS & sync engine',
      icon: Rss,
      badge: sourceCount > 0 ? sourceCount : undefined,
    },
    {
      id: 'search' as ActiveTab,
      label: 'Semantic Search',
      description: 'DuckDB vector similarity',
      icon: Search,
    },
    {
      id: 'chat' as ActiveTab,
      label: 'RAG Assistant',
      description: 'Chat grounded in your notes',
      icon: MessageSquare,
      highlight: true,
    },
    {
      id: 'documents' as ActiveTab,
      label: 'Document Library',
      description: 'Extracted articles & chunks',
      icon: BookOpen,
      badge: docCount > 0 ? docCount : undefined,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-3">
            Knowledge Hub
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-medium border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-sky-400'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-sm leading-tight flex items-center space-x-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.highlight && (
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate group-hover:text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-slate-300 font-medium">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span>Local Engine Active</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Embeddings & analytics stored in embedded DuckDB. 100% private to your machine.
        </p>
      </div>
    </aside>
  );
};
