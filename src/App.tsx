import React, { useState, useEffect } from 'react';
import { ChatbotConfig, Workspace, BotAnalytics } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ConversationBuilder } from './components/ConversationBuilder';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { InboxView } from './components/InboxView';
import { ActionsView } from './components/ActionsView';
import { AppearanceView } from './components/AppearanceView';
import { DeploymentView } from './components/DeploymentView';
import { AnalyticsView } from './components/AnalyticsView';
import { CreateBotModal } from './components/CreateBotModal';
import { ChatPreview } from './components/ChatPreview';
import { Bot, ChevronDown, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

import { useFirebaseAuth } from './context/FirebaseAuthContext';
import { firestoreSync } from './services/firestoreSync';

export default function App() {
  const { user } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | undefined>();
  const [bots, setBots] = useState<ChatbotConfig[]>([]);
  const [activeBotId, setActiveBotId] = useState<string>('');
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);

  // Navigation
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Check if page is rendered in iframe embed mode (?embed=true&deploymentId=...)
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedMode = urlParams.get('embed') === 'true';
  const embedDeploymentId = urlParams.get('deploymentId');

  const [embedBot, setEmbedBot] = useState<ChatbotConfig | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const me = await api.getMe();
      setWorkspaces(me.workspaces);
      const activeWs = me.workspaces[0];
      setCurrentWorkspace(activeWs);

      const botList = await api.getBots(activeWs?.id);
      setBots(botList);

      if (botList.length > 0 && !activeBotId) {
        setActiveBotId(botList[0].id);
      }

      const stats = await api.getAnalytics();
      setAnalytics(stats);
    } catch (err: any) {
      console.error('Failed to initialize app', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEmbedMode && embedDeploymentId) {
      // In embed mode, fetch public bot by deployment ID
      api
        .getPublicBot(embedDeploymentId)
        .then((publicBot) => {
          setEmbedBot(publicBot);
          setLoading(false);
        })
        .catch((err) => {
          setEmbedError(err.message || 'This chatbot widget is currently disabled or in draft mode.');
          setLoading(false);
        });
    } else {
      loadAllData();
    }
  }, [isEmbedMode, embedDeploymentId]);

  // Update a single bot in state & sync to Firestore if authenticated
  const handleUpdateBot = (updated: ChatbotConfig) => {
    setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (user?.uid) {
      firestoreSync.saveChatbot(updated, user.uid).catch((e) => {
        console.warn('Firestore bot sync notice:', e);
      });
    }
  };

  const handleBotCreated = (newBot: ChatbotConfig) => {
    setBots((prev) => [newBot, ...prev]);
    setActiveBotId(newBot.id);
    setCurrentTab('builder');
    if (user?.uid) {
      firestoreSync.saveChatbot(newBot, user.uid).catch((e) => {
        console.warn('Firestore new bot sync notice:', e);
      });
    }
    // Refresh analytics
    api.getAnalytics().then(setAnalytics).catch(console.error);
  };

  // Embed Mode View (Full iframe chat screen)
  if (isEmbedMode) {
    if (loading) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-white text-xs text-slate-500">
          Loading chatbot...
        </div>
      );
    }
    if (embedError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs max-w-sm">
            {embedError}
          </div>
        </div>
      );
    }
    if (embedBot) {
      return (
        <div className="h-screen w-screen bg-transparent p-0 overflow-hidden">
          <ChatPreview bot={embedBot} isStandalone />
        </div>
      );
    }
  }

  const activeBot = bots.find((b) => b.id === activeBotId) || bots[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCreateBotModal={() => setIsCreateModalOpen(true)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        unresolvedCount={analytics?.unresolvedHandoffRequests || 0}
      />

      {/* Bot Selector Sub-Bar (Visible when inside bot-specific tabs like builder, knowledge, appearance, deployment) */}
      {currentTab !== 'dashboard' && currentTab !== 'inbox' && currentTab !== 'actions' && currentTab !== 'analytics' && activeBot && (
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Active Chatbot:</span>
            <div className="relative inline-block">
              <select
                value={activeBot.id}
                onChange={(e) => setActiveBotId(e.target.value)}
                className="pl-2.5 pr-8 py-1 rounded-md border border-slate-300 font-bold text-slate-900 bg-slate-50 hover:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.businessName})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2 pointer-events-none" />
            </div>

            <span className="text-slate-400">·</span>
            <span className="text-slate-600 font-medium">{activeBot.industry}</span>

            <span
              className={`ml-2 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                activeBot.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {activeBot.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTab('builder')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                currentTab === 'builder' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Builder
            </button>
            <button
              onClick={() => setCurrentTab('knowledge')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                currentTab === 'knowledge' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Knowledge Base
            </button>
            <button
              onClick={() => setCurrentTab('appearance')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                currentTab === 'appearance' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Appearance
            </button>
            <button
              onClick={() => setCurrentTab('deployment')}
              className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                currentTab === 'deployment' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deploy & Embed
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin mr-2 text-indigo-600" />
            Loading SelectBot Platform...
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertCircle className="w-4 h-4" /> Connection Error
            </div>
            <p>{error}</p>
            <button
              onClick={loadAllData}
              className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded font-semibold text-xs hover:bg-rose-700 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                bots={bots}
                currentWorkspace={currentWorkspace}
                analytics={analytics}
                onSelectBot={(botId, view) => {
                  setActiveBotId(botId);
                  setCurrentTab(view);
                }}
                onOpenCreateBotModal={() => setIsCreateModalOpen(true)}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'builder' && activeBot && (
              <ConversationBuilder
                bot={activeBot}
                onUpdateBot={handleUpdateBot}
                onRefreshAll={loadAllData}
              />
            )}

            {currentTab === 'knowledge' && activeBot && (
              <KnowledgeBaseView bot={activeBot} />
            )}

            {currentTab === 'inbox' && (
              <InboxView bots={bots} />
            )}

            {currentTab === 'actions' && (
              <ActionsView bots={bots} />
            )}

            {currentTab === 'appearance' && activeBot && (
              <AppearanceView bot={activeBot} onUpdateBot={handleUpdateBot} />
            )}

            {currentTab === 'deployment' && activeBot && (
              <DeploymentView bot={activeBot} onUpdateBot={handleUpdateBot} />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView analytics={analytics} bots={bots} />
            )}
          </>
        )}
      </main>

      {/* Guided Chatbot Creation Wizard Modal */}
      <CreateBotModal
        isOpen={isCreateModalOpen}
        workspaceId={currentWorkspace?.id || 'ws_default_1'}
        onClose={() => setIsCreateModalOpen(false)}
        onBotCreated={handleBotCreated}
      />
    </div>
  );
}
