import { useState, useEffect, useRef } from 'react';
import type { AppItem, SystemConfig, Language, ChatMessage, ChatActionCard, AiChatConfig } from '../../types';
import { fetchAiChatConfig, sendAiChatMessage, defaultChatConfig } from '../../services/chatApi';

export interface AiChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  config: SystemConfig;
  apps: AppItem[];
  lang: Language;
  openBuyModal: (app: AppItem) => void;
  openFreeKeyModal?: (app: AppItem) => void;
  openLookupModal?: () => void;
  showToast: (msg: string) => void;
}

const CHAT_STORAGE_KEY = 'modlienquan_ai_chat_history';

export function AiChatWidget({
  isOpen,
  onClose,
  onToggle,
  config,
  apps,
  lang,
  openBuyModal,
  openFreeKeyModal,
  openLookupModal,
  showToast
}: AiChatWidgetProps) {
  const [chatConfig, setChatConfig] = useState<AiChatConfig>(defaultChatConfig);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [actionCardsMap, setActionCardsMap] = useState<Record<string, ChatActionCard[]>>({});
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load public AI Chat config on mount
  useEffect(() => {
    fetchAiChatConfig().then((cfg) => {
      setChatConfig(cfg);
      // If no messages yet, set initial greeting
      setMessages((prev) => {
        if (prev.length === 0) {
          const welcomeMsg: ChatMessage = {
            id: 'welcome-0',
            role: 'model',
            content: cfg.welcomeMessage || defaultChatConfig.welcomeMessage,
            timestamp: Date.now()
          };
          return [welcomeMsg];
        }
        return prev;
      });
    });
  }, []);

  // Save conversation history to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (ignored) {}
    }
  }, [messages]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      const response = await sendAiChatMessage(textToSend, newHistory);
      const botMessageId = `bot-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMessageId,
        role: 'model',
        content: response.reply,
        timestamp: Date.now()
      };

      if (response.actionCards && response.actionCards.length > 0) {
        setActionCardsMap((prev) => ({
          ...prev,
          [botMessageId]: response.actionCards || []
        }));
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: '⚠️ Có lỗi nhẹ khi kết nối với Trợ lý AI. Bạn vui lòng thử lại hoặc liên hệ Admin qua Zalo/Telegram nhé!',
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      content: chatConfig.welcomeMessage || defaultChatConfig.welcomeMessage,
      timestamp: Date.now()
    };
    setMessages([welcomeMsg]);
    setActionCardsMap({});
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (ignored) {}
    showToast(lang === 'vi' ? '🧹 Đã làm mới đoạn hội thoại!' : 'Chat history reset!');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast(lang === 'vi' ? `📋 Đã sao chép ${label}!` : `Copied ${label}!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCardAppBuy = (appId: string) => {
    const foundApp = apps.find((a) => a.id === appId);
    if (foundApp) {
      openBuyModal(foundApp);
      onClose();
    } else {
      showToast(lang === 'vi' ? 'Không tìm thấy ứng dụng trong danh mục!' : 'App not found in catalog');
    }
  };

  const handleCardAppFree = (appId: string) => {
    const foundApp = apps.find((a) => a.id === appId);
    if (foundApp && openFreeKeyModal) {
      openFreeKeyModal(foundApp);
      onClose();
    } else {
      showToast(lang === 'vi' ? 'Ứng dụng này hiện chưa mở cổng Key Free!' : 'Free Key currently unavailable for this app');
    }
  };

  // Helper to render formatted Markdown text
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      // Code block
      if (line.startsWith('```')) {
        return null;
      }

      // Check if line is a bullet
      const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
      const cleanLine = isBullet ? line.substring(2) : line;

      // Inline code blocks and bold
      const parts = cleanLine.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

      const parsedLine = parts.map((part, pIdx) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const codeVal = part.slice(1, -1);
          return (
            <code
              key={pIdx}
              onClick={() => handleCopyText(codeVal, 'mã')}
              title={lang === 'vi' ? 'Bấm để sao chép' : 'Click to copy'}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '0.88em',
                fontFamily: 'monospace',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
                userSelect: 'all'
              }}
            >
              {codeVal}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} style={{ color: '#f8fafc', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lIdx} style={{ display: 'flex', gap: '8px', margin: '4px 0', alignItems: 'flex-start' }}>
            <span style={{ color: '#00f2fe', lineHeight: '1.4' }}>•</span>
            <div style={{ flex: 1, lineHeight: '1.45' }}>{parsedLine}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={lIdx} style={{ height: '6px' }} />;
      }

      return (
        <p key={lIdx} style={{ margin: '4px 0', lineHeight: '1.45' }}>
          {parsedLine}
        </p>
      );
    });
  };

  if (!chatConfig.enabled && !isOpen) return null;

  return (
    <>
      {/* 1. Sleek Floating Trigger Button (Always visible on bottom-right) */}
      <button
        onClick={onToggle}
        className="ai-chat-floating-trigger"
        aria-label="Mở Trợ lý ảo AI"
        title={lang === 'vi' ? 'Trợ lý ảo AI tư vấn 24/7' : 'AI Assistant 24/7'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9991,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 18px',
          borderRadius: '99px',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '13px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45), 0 0 16px rgba(59, 130, 246, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isOpen ? 'scale(0)' : 'scale(1)',
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? 'none' : 'auto'
        }}
      >
        <span style={{ fontSize: '18px', animation: 'pulse 2s infinite' }}>🤖</span>
        <span style={{ letterSpacing: '0.3px' }}>
          {chatConfig.botName || (lang === 'vi' ? 'Trợ Lý AI' : 'AI Assistant')}
        </span>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }}
        />
      </button>

      {/* 2. Glassmorphic Chat Popup Window */}
      {isOpen && (
        <div
          className="ai-chat-window-container"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '590px',
            maxHeight: 'calc(100vh - 48px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 30, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.25)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Top Header Bar */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15))',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                    {chatConfig.botName || (config?.brandName ? 'Trợ Lý ' + config.brandName : 'Trợ Lý AI Shop')}
                  </h4>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    GEMINI AI
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                    {lang === 'vi' ? 'Trực tuyến 24/7' : 'Online 24/7'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleClearHistory}
                title={lang === 'vi' ? 'Làm mới đoạn chat' : 'Clear conversation'}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontSize: '12px',
                  transition: 'background 0.2s'
                }}
              >
                🔄
              </button>
              <button
                onClick={onClose}
                title={lang === 'vi' ? 'Đóng cửa sổ' : 'Close'}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  transition: 'background 0.2s'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontSize: '13.5px',
              color: '#e2e8f0',
              scrollBehavior: 'smooth'
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const actionCards = actionCardsMap[msg.id] || [];

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '11px 15px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isUser
                        ? 'linear-gradient(135deg, #7c3aed, #2563eb)'
                        : 'rgba(30, 41, 59, 0.85)',
                      color: isUser ? '#ffffff' : '#e2e8f0',
                      border: isUser
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isUser
                        ? '0 4px 14px rgba(124, 58, 237, 0.25)'
                        : '0 4px 14px rgba(0, 0, 0, 0.2)',
                      wordBreak: 'break-word',
                      fontSize: '13.5px',
                      lineHeight: '1.5'
                    }}
                  >
                    {isUser ? msg.content : renderFormattedContent(msg.content)}
                  </div>

                  {/* Embedded Action Cards */}
                  {!isUser && actionCards.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '8px',
                        width: '100%',
                        maxWidth: '88%'
                      }}
                    >
                      {actionCards.map((card, cIdx) => {
                        if (card.type === 'APP_BUY') {
                          return (
                            <div
                              key={cIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(0, 242, 254, 0.3)',
                                boxShadow: '0 4px 12px rgba(0, 242, 254, 0.1)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>⚡</span>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                                    {card.title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{card.subtitle}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCardAppBuy(card.appId || '')}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                                  color: '#0f172a',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                🛒 {lang === 'vi' ? 'Mua Key' : 'Buy Key'}
                              </button>
                            </div>
                          );
                        }

                        if (card.type === 'APP_FREE') {
                          return (
                            <div
                              key={cIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                                  🎁 {card.title}
                                </div>
                                <div style={{ fontSize: '11px', color: '#10b981' }}>{card.subtitle}</div>
                              </div>
                              <button
                                onClick={() => handleCardAppFree(card.appId || '')}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {lang === 'vi' ? 'Lấy Free' : 'Get Free'}
                              </button>
                            </div>
                          );
                        }

                        if (card.type === 'ORDER_STATUS' && card.data) {
                          const orderData = card.data;
                          const isPaid = orderData.status === 'PAID';
                          return (
                            <div
                              key={cIdx}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#ffffff' }}>{card.title}</span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: isPaid ? '#10b981' : '#eab308',
                                    color: isPaid ? '#ffffff' : '#0f172a'
                                  }}
                                >
                                  {orderData.status}
                                </span>
                              </div>
                              {isPaid && orderData.deliveredKey && (
                                <div style={{ marginTop: '8px' }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                    Key kích hoạt của bạn:
                                  </div>
                                  <div
                                    onClick={() => handleCopyText(orderData.deliveredKey, 'Key bản quyền')}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.4)',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px dashed #10b981',
                                      color: '#34d399',
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <span>{orderData.deliveredKey}</span>
                                    <span style={{ fontSize: '11px', color: '#10b981' }}>
                                      {copiedKey === orderData.deliveredKey ? '✓ Đã chép' : 'Sao chép'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#38bdf8',
                    animation: 'bounce 1s infinite 0s'
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#38bdf8',
                    animation: 'bounce 1s infinite 0.2s'
                  }}
                />
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#38bdf8',
                    animation: 'bounce 1s infinite 0.4s'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
                  {lang === 'vi' ? 'AI đang suy nghĩ...' : 'AI is thinking...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          {chatConfig.quickPrompts && chatConfig.quickPrompts.length > 0 && (
            <div
              style={{
                padding: '6px 14px',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(15, 23, 42, 0.4)',
                scrollbarWidth: 'none'
              }}
            >
              {chatConfig.quickPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '5px 11px',
                    borderRadius: '99px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  ⚡ {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(15, 23, 42, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '6px 10px'
              }}
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  lang === 'vi'
                    ? 'Hỏi cách cài iOS, Android, giá key hoặc mã đơn...'
                    : 'Ask about iOS/Android install, key prices, order status...'
                }
                rows={1}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  resize: 'none',
                  maxHeight: '100px',
                  fontFamily: 'inherit'
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: inputText.trim() && !isLoading
                    ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                ➔
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '10px',
                color: '#64748b',
                padding: '0 4px'
              }}
            >
              <span>⚡ Google Gemini AI Assistant 24/7</span>
              {openLookupModal && (
                <button
                  onClick={openLookupModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  {lang === 'vi' ? 'Tra cứu đơn' : 'Lookup Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
