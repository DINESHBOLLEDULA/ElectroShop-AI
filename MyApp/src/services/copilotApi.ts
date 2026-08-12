export const COPILOT_API_BASE = 'http://192.168.29.222:8000';

export type ConversationListItem = {
  id: string;
  title: string;
  message_count: number;
  last_message_preview?: string | null;
  updated_at: string;
};

export type StoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: { products_shown?: number[] };
};

export type Conversation = {
  id: string;
  title: string;
  messages: StoredMessage[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${COPILOT_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`Copilot request failed (${response.status})`);
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export const copilotApi = {
  createConversation: () => request<Conversation>('/v2/copilot/conversations', { method: 'POST', body: JSON.stringify({ user_id: 'default' }) }),
  listConversations: (skip = 0, limit = 20) => request<ConversationListItem[]>(`/v2/copilot/conversations?user_id=default&skip=${skip}&limit=${limit}`),
  loadConversation: (id: string) => request<Conversation>(`/v2/copilot/conversations/${id}?user_id=default`),
  saveMessage: (id: string, role: 'user' | 'assistant', content: string, productsShown: number[] = []) => request<StoredMessage>(`/v2/copilot/conversations/${id}/messages?user_id=default`, {
    method: 'POST', body: JSON.stringify({ role, content, metadata: { products_shown: productsShown } }),
  }),
  legacyChat: (query: string, history: string[]) => request<{ message: string; products: any[] }>('/copilot/chat', {
    method: 'POST', body: JSON.stringify({ query, chat_history: history.slice(-4) }),
  }),
};

/**
 * React Native's built-in fetch does not consistently expose streaming bodies
 * across Android/iOS runtimes. This token renderer preserves a streaming UX
 * today and can consume the backend SSE endpoint unchanged when enabled.
 */
export async function renderStreamingText(text: string, onChunk: (value: string) => void): Promise<void> {
  const chunkSize = 12;
  for (let index = chunkSize; index <= text.length + chunkSize; index += chunkSize) {
    onChunk(text.slice(0, index));
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}
