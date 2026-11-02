import { API_BASE_URL, refreshAdminRollingToken } from './authApi';
import type { AiChatConfig, ChatMessage, ChatResponse } from '../types';

export const defaultChatConfig: AiChatConfig = {
  enabled: true,
  botName: 'Trợ Lý AI Shop',
  welcomeMessage: 'Xin chào! Mình là Trợ lý ảo của shop. Mình có thể giúp gì cho bạn hôm nay?',
  quickPrompts: [
    'Bảng giá Key VIP?',
    'Hướng dẫn cài đặt iOS (IPA)?',
    'Cách lấy Key Free?',
    'Kiểm tra đơn hàng'
  ],
  aiModel: 'gemini-2.5-flash',
  hasApiKey: false
};

/**
 * Fetch public chatbot configuration for customer UI
 */
export async function fetchAiChatConfig(): Promise<AiChatConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/config`);
    if (res.ok) {
      const data: AiChatConfig = await res.json();
      return {
        ...defaultChatConfig,
        ...data,
        quickPrompts: (data.quickPrompts && data.quickPrompts.length > 0)
          ? data.quickPrompts
          : defaultChatConfig.quickPrompts
      };
    }
  } catch (err) {
    console.warn('Failed to fetch public AI chat config, using defaults:', err);
  }
  return defaultChatConfig;
}

/**
 * Send user message to AI Chat Assistant
 */
export async function sendAiChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  let deviceId = '';
  try {
    deviceId = localStorage.getItem('modlienquan_device_id') || '';
  } catch (ignored) {}

  const historyPayload = history.slice(-8).map((msg) => ({
    role: msg.role,
    content: msg.content
  }));

  const res = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      conversationHistory: historyPayload,
      deviceId
    })
  });

  if (!res.ok) {
    throw new Error(`Chat API error (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch full Chatbot configuration for Admin
 */
export async function fetchAdminChatConfig(): Promise<AiChatConfig> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/chat/admin/config`, {
    headers: { 'X-Admin-Auth': token }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch admin chatbot configuration');
  }

  return await res.json();
}

/**
 * Update Chatbot configuration (Admin)
 */
export async function updateAdminChatConfig(config: Partial<AiChatConfig>): Promise<void> {
  const token = await refreshAdminRollingToken();
  const res = await fetch(`${API_BASE_URL}/chat/admin/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Auth': token
    },
    body: JSON.stringify(config)
  });

  if (!res.ok) {
    throw new Error('Failed to update chatbot configuration');
  }
}

