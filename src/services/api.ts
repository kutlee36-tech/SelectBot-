import {
  ChatbotConfig,
  Workspace,
  KnowledgeBaseItem,
  HumanAssistanceRequest,
  ActionSubmission,
  BotAnalytics,
  ChatMessage,
  Conversation,
} from '../types';

export const api = {
  // Auth & Workspace
  async getMe(): Promise<{ user: any; workspaces: Workspace[]; geminiConfigured: boolean }> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to load user info');
    return res.json();
  },

  async createWorkspace(name: string, industry: string): Promise<Workspace> {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, industry }),
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    return res.json();
  },

  // Chatbots
  async getBots(workspaceId?: string): Promise<ChatbotConfig[]> {
    const url = workspaceId ? `/api/bots?workspaceId=${encodeURIComponent(workspaceId)}` : '/api/bots';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chatbots');
    return res.json();
  },

  async getBot(id: string): Promise<ChatbotConfig> {
    const res = await fetch(`/api/bots/${id}`);
    if (!res.ok) throw new Error('Failed to fetch chatbot');
    return res.json();
  },

  async createBot(payload: {
    workspaceId: string;
    name: string;
    businessName: string;
    industry: string;
    description: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    templateId?: string;
    conversationStyle?: string;
  }): Promise<ChatbotConfig> {
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create chatbot');
    }
    return res.json();
  },

  async updateBot(id: string, updates: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
    const res = await fetch(`/api/bots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update chatbot');
    return res.json();
  },

  async duplicateBot(id: string): Promise<ChatbotConfig> {
    const res = await fetch(`/api/bots/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to duplicate chatbot');
    return res.json();
  },

  async deleteBot(id: string): Promise<void> {
    const res = await fetch(`/api/bots/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete chatbot');
  },

  async togglePublish(id: string): Promise<{ success: boolean; status: 'draft' | 'published'; bot: ChatbotConfig }> {
    const res = await fetch(`/api/bots/${id}/publish`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle publish status');
    return res.json();
  },

  // Knowledge Base
  async getKnowledge(botId: string): Promise<KnowledgeBaseItem[]> {
    const res = await fetch(`/api/bots/${botId}/knowledge`);
    if (!res.ok) throw new Error('Failed to fetch knowledge items');
    return res.json();
  },

  async addKnowledge(
    botId: string,
    item: { title: string; category: string; type: string; content: string; tags: string[] }
  ): Promise<KnowledgeBaseItem> {
    const res = await fetch(`/api/bots/${botId}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add knowledge item');
    return res.json();
  },

  async updateKnowledge(
    botId: string,
    itemId: string,
    updates: Partial<KnowledgeBaseItem>
  ): Promise<KnowledgeBaseItem> {
    const res = await fetch(`/api/bots/${botId}/knowledge/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update knowledge item');
    return res.json();
  },

  async deleteKnowledge(botId: string, itemId: string): Promise<void> {
    const res = await fetch(`/api/bots/${botId}/knowledge/${itemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete knowledge item');
  },

  async testKnowledgeQuery(botId: string, query: string): Promise<any> {
    const res = await fetch(`/api/bots/${botId}/knowledge/test-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('Failed to test query');
    return res.json();
  },

  // Inbox & Human Assistance
  async getInboxRequests(botId?: string): Promise<HumanAssistanceRequest[]> {
    const url = botId ? `/api/bots/${botId}/inbox` : '/api/inbox/all';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch inbox requests');
    return res.json();
  },

  async updateInboxRequest(
    requestId: string,
    updates: { status?: string; agentNotes?: string; assignedTo?: string }
  ): Promise<HumanAssistanceRequest> {
    const res = await fetch(`/api/inbox/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update request');
    return res.json();
  },

  async sendAgentReply(requestId: string, replyText: string): Promise<any> {
    const res = await fetch(`/api/inbox/${requestId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyText }),
    });
    if (!res.ok) throw new Error('Failed to send reply');
    return res.json();
  },

  // Action Submissions
  async getActionSubmissions(botId?: string): Promise<ActionSubmission[]> {
    const url = botId ? `/api/bots/${botId}/actions/submissions` : '/api/actions/submissions/all';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch action submissions');
    return res.json();
  },

  // Analytics
  async getAnalytics(botId?: string): Promise<BotAnalytics> {
    const url = botId ? `/api/analytics?botId=${encodeURIComponent(botId)}` : '/api/analytics';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Chat Runtime
  async startChatSession(botId: string, customerSessionId?: string): Promise<{ conversation: Conversation; botName: string }> {
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, customerSessionId }),
    });
    if (!res.ok) throw new Error('Failed to initialize chat session');
    return res.json();
  },

  async sendChatMessage(payload: {
    conversationId: string;
    botId: string;
    text?: string;
    selectedMenuId?: string;
    selectedSubtopicId?: string;
    actionSubmission?: any;
    handoffSubmission?: any;
    isNavigationAction?: string;
  }): Promise<{ botResponse: ChatMessage; conversation: Conversation; submission?: any; handoff?: any }> {
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Chat message failed');
    }
    return res.json();
  },

  // Public deployment check
  async getPublicBot(deploymentId: string): Promise<any> {
    const res = await fetch(`/api/public/bot/${deploymentId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Deployment unreachable');
    }
    return res.json();
  },
};
