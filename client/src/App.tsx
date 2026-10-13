import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar, type ActiveTab } from './components/Sidebar.js';
import { SourceList } from './components/sources/SourceList.js';
import { AddSourceModal } from './components/sources/AddSourceModal.js';
import { ManualContentModal } from './components/sources/ManualContentModal.js';
import { DocumentReaderModal } from './components/sources/DocumentReaderModal.js';
import { SemanticSearch } from './components/search/SemanticSearch.js';
import { ChatInterface } from './components/chat/ChatInterface.js';
import { DocumentLibrary } from './components/documents/DocumentLibrary.js';
import { OllamaStatusModal } from './components/OllamaStatusModal.js';

import {
  fetchSources,
  addSource,
  submitManualContent,
  syncSource,
  deleteSource,
  fetchDocuments,
  deleteDocument,
  fetchStats,
  fetchModels,
  updateActiveModels,
} from './api/client.js';

import type { Source, Document, SystemStats, OllamaStatus, AddSourceRequest } from '../../shared/types.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sources');
  const [sources, setSources] = useState<Source[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);

  // Modals
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [manualContentSource, setManualContentSource] = useState<Source | null>(null);
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
  const [readingDocId, setReadingDocId] = useState<string | null>(null);

  // Filter state for DocumentLibrary
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [sourcesData, docsData, statsData, ollamaData] = await Promise.allSettled([
        fetchSources(),
        fetchDocuments(),
        fetchStats(),
        fetchModels(),
      ]);

      if (sourcesData.status === 'fulfilled') setSources(sourcesData.value);
      if (docsData.status === 'fulfilled') setDocuments(docsData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (ollamaData.status === 'fulfilled') setOllamaStatus(ollamaData.value);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll every 10 seconds to update syncing status
    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleAddSource = async (data: AddSourceRequest) => {
    await addSource(data);
    await loadData();
  };

  const handleSubmitManualContent = async (sourceId: string, rawContent: string, title?: string) => {
    await submitManualContent(sourceId, rawContent, title);
    await loadData();
  };

  const handleSyncSource = async (id: string) => {
    setIsSyncingId(id);
    try {
      await syncSource(id);
      await loadData();
    } finally {
      setIsSyncingId(null);
    }
  };

  const handleDeleteSource = async (id: string) => {
    await deleteSource(id);
    await loadData();
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    await loadData();
  };

  const handleSaveModels = async (embedding: string, chat: string) => {
    await updateActiveModels(embedding, chat);
    await loadData();
  };

  const handleViewSourceDocuments = (sourceId: string) => {
    setSelectedSourceFilter(sourceId);
    setActiveTab('documents');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Navigation */}
      <Navbar
        stats={stats}
        ollamaStatus={ollamaStatus}
        onOpenOllamaModal={() => setIsOllamaModalOpen(true)}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab !== 'documents') setSelectedSourceFilter(null);
            setActiveTab(tab);
          }}
          sourceCount={sources.length}
          docCount={documents.length}
        />

        {/* Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'sources' && (
            <SourceList
              sources={sources}
              onAddClick={() => setIsAddSourceOpen(true)}
              onSync={handleSyncSource}
              onDelete={handleDeleteSource}
              onViewDocuments={handleViewSourceDocuments}
              onInputManualContent={(src) => setManualContentSource(src)}
              isSyncingId={isSyncingId}
            />
          )}

          {activeTab === 'search' && (
            <SemanticSearch
              sources={sources}
              onOpenDocument={(id) => setReadingDocId(id)}
            />
          )}

          {activeTab === 'chat' && (
            <ChatInterface
              onOpenDocument={(id) => setReadingDocId(id)}
              docCount={documents.length}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentLibrary
              documents={documents}
              sources={sources}
              selectedSourceId={selectedSourceFilter}
              onSelectSourceId={setSelectedSourceFilter}
              onOpenDocument={(id) => setReadingDocId(id)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddSourceModal
        isOpen={isAddSourceOpen}
        onClose={() => setIsAddSourceOpen(false)}
        onAdd={handleAddSource}
      />

      <ManualContentModal
        isOpen={manualContentSource !== null}
        source={manualContentSource}
        onClose={() => setManualContentSource(null)}
        onSubmit={handleSubmitManualContent}
      />

      <OllamaStatusModal
        isOpen={isOllamaModalOpen}
        onClose={() => setIsOllamaModalOpen(false)}
        status={ollamaStatus}
        onSaveModels={handleSaveModels}
        onRefresh={loadData}
      />

      <DocumentReaderModal
        isOpen={readingDocId !== null}
        documentId={readingDocId}
        onClose={() => setReadingDocId(null)}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
};
