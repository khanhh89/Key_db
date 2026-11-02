import React, { useState, useEffect } from 'react';
import type { Language, AiChatConfig } from '../../types';
import {
  fetchAdminChatConfig,
  updateAdminChatConfig,
  sendAiChatMessage,
  defaultChatConfig
} from '../../services/api';

interface AiChatbotAdminSectionProps {
  lang: Language;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function AiChatbotAdminSection({ lang, showToast }: AiChatbotAdminSectionProps) {
  const [currentConfig, setConfig] = useState<AiChatConfig>(defaultChatConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [enabled, setEnabled] = useState(true);
  const [botName, setBotName] = useState('Trợ Lý AI Shop');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [quickPromptsText, setQuickPromptsText] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');

  // Live Simulator Chat states
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminChatConfig();
      setConfig(data);
      setEnabled(data.enabled ?? true);
      setBotName(data.botName || 'Trợ Lý AI Shop');
      setWelcomeMessage(data.welcomeMessage || defaultChatConfig.welcomeMessage);
      setQuickPromptsText((data.quickPrompts || defaultChatConfig.quickPrompts).join('\n'));
      setSystemInstruction(data.systemInstruction || '');

      setTestMessages([
        {
          role: 'model',
          content: data.welcomeMessage || defaultChatConfig.welcomeMessage
        }
      ]);
    } catch (err: any) {
      console.warn('Failed to load admin chat config:', err);
      showToast(lang === 'vi' ? 'Không thể tải cấu hình Chatbot' : 'Failed to load chatbot config', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const promptList = quickPromptsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateAdminChatConfig({
        enabled,
        botName: botName.trim(),
        welcomeMessage: welcomeMessage.trim(),
        quickPrompts: promptList,
        systemInstruction: systemInstruction.trim()
      });

      showToast(
        lang === 'vi'
          ? '🎉 Đã cập nhật cấu hình Trợ lý AI thành công!'
          : 'AI Chatbot configuration saved successfully!',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu cấu hình', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async (textToSend?: string) => {
    const text = (textToSend || testInput).trim();
    if (!text || isTestLoading) return;

    setTestInput('');
    const newHistory = [...testMessages, { role: 'user' as const, content: text }];
    setTestMessages(newHistory);
    setIsTestLoading(true);

    try {
      const res = await sendAiChatMessage(
        text,
        newHistory.map((m, idx) => ({ id: `test-${idx}`, role: m.role, content: m.content }))
      );

      setTestMessages((prev) => [...prev, { role: 'model', content: res.reply }]);
    } catch (err: any) {
      setTestMessages((prev) => [
        ...prev,
        { role: 'model', content: '⚠️ Lỗi kiểm tra AI: ' + (err.message || 'Không thể phản hồi') }
      ]);
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleResetTestChat = () => {
    setTestMessages([
      {
        role: 'model',
        content: welcomeMessage || 'Xin chào! Mình có thể giúp gì cho bạn?'
      }
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#64748B] gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin inline-block" />
        <span className="text-xs font-semibold">Đang tải cấu hình Trợ lý AI...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: CONFIGURATION FORM */}
      <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-3xl p-6 md:p-8 backdrop-blur-md flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div>
            <h3 className="m-0 text-xl font-bold text-gray-900 flex items-center gap-2">
              🤖 {lang === 'vi' ? 'Cấu Hình Trợ Lý Ảo AI (Gemini Assistant)' : 'AI Chatbot Assistant Configuration'}
            </h3>
            <p className="m-0 text-xs text-[#64748B] mt-1">
              {lang === 'vi'
                ? 'Thiết lập tính cách, lời chào và kiến thức đặc thù cho Trợ lý ảo hoạt động 24/7 trên trang chủ.'
                : 'Configure AI behavior, greeting, and custom instructions for 24/7 customer support.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <span
              className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}
            />
            <span className="text-xs font-bold text-gray-700">
              {enabled ? (lang === 'vi' ? 'Đang Bật' : 'Enabled') : (lang === 'vi' ? 'Đang Tắt' : 'Disabled')} (Model: {currentConfig.aiModel || 'gemini-2.5-flash'})
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Toggle Enable/Disable */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <div>
              <label className="text-sm font-bold text-gray-900 block cursor-pointer">
                {lang === 'vi' ? 'Kích hoạt Trợ lý ảo trên Trang chủ' : 'Enable AI Assistant on Storefront'}
              </label>
              <span className="text-xs text-[#64748B]">
                {lang === 'vi'
                  ? 'Khi bật, nút chat Trợ lý AI sẽ xuất hiện ở góc phải màn hình của khách hàng.'
                  : 'Displays the floating AI chat bubble for visiting customers.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Bot Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              🏷️ {lang === 'vi' ? 'Tên hiển thị của Bot' : 'Bot Display Name'}
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="VD: Trợ Lý AI Shop, MOD CSKH 24/7..."
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Welcome Message Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              👋 {lang === 'vi' ? 'Lời chào mở đầu (Welcome Message)' : 'Initial Welcome Message'}
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Lời chào khách khi mở khung chat lần đầu..."
              className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Quick Prompts Textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                ⚡ {lang === 'vi' ? 'Câu hỏi gợi ý nhanh (Mỗi dòng một câu)' : 'Quick Prompt Chips (One per line)'}
              </label>
              <span className="text-[11px] text-[#64748B]">
                {quickPromptsText.split('\n').filter((s) => s.trim()).length} gợi ý
              </span>
            </div>
            <textarea
              value={quickPromptsText}
              onChange={(e) => setQuickPromptsText(e.target.value)}
              rows={4}
              placeholder="Bảng giá Key VIP?&#10;Hướng dẫn cài đặt iOS (IPA)?&#10;Cách lấy Key Free?&#10;Kiểm tra đơn hàng"
              className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Special System Instructions / Knowledge Base */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              🧠 {lang === 'vi' ? 'Chỉ dẫn hệ thống riêng cho Bot (System Prompt bổ sung)' : 'Custom System Instructions'}
            </label>
            <span className="text-[11px] text-[#64748B]">
              {lang === 'vi'
                ? 'Nhập lưu ý đặc biệt, chương trình khuyến mãi tháng này hoặc cảnh báo game mod để AI luôn nhớ khi tư vấn.'
                : 'Special guidelines, active promotion rules, or specific game mod alerts for AI.'}
            </span>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Ưu tiên tư vấn gói Tháng vì đang được tặng thêm 3 ngày. Nhắc khách quét VietQR nhớ ghi đúng nội dung chuyển khoản MK..."
              className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center gap-2"
            >
              {isSaving ? '⏳ Đang lưu...' : '💾 Lưu & Cập Nhật Trợ Lý AI'}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: LIVE SIMULATOR / INTERACTIVE PREVIEW */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Simulator Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                📱
              </span>
              <div>
                <h4 className="m-0 text-xs font-bold text-gray-900">
                  {lang === 'vi' ? 'Trình Giả Lập Trợ Lý AI (Live Preview)' : 'Interactive AI Simulator'}
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold">● Kết nối trực tiếp Database & Gemini</span>
              </div>
            </div>

            <button
              onClick={handleResetTestChat}
              title="Làm mới cuộc trò chuyện"
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              🔄 Reset
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
            {testMessages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {isTestLoading && (
              <div className="self-start p-2.5 rounded-2xl bg-gray-100 text-gray-500 text-xs flex items-center gap-2 border border-gray-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
                <span>AI đang tạo câu trả lời...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Testing Pills */}
          <div className="py-2 border-t border-gray-100 flex gap-1.5 overflow-x-auto scrollbar-none">
            {['Bảng giá Key?', 'Cách cài đặt iOS?', 'Lấy Key Free?'].map((q, qIdx) => (
              <button
                key={qIdx}
                onClick={() => handleSendTestMessage(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold transition-colors"
              >
                ⚡ {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="pt-2 border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendTestMessage();
                }
              }}
              placeholder="Nhập câu hỏi thử nghiệm (hoặc mã MK...)..."
              disabled={isTestLoading}
              className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSendTestMessage()}
              disabled={!testInput.trim() || isTestLoading}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer transition-all"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
