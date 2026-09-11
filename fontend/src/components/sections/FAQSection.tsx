import { useState } from 'react';
import type { Language, SystemConfig } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';

interface FAQSectionProps {
  lang: Language;
  config?: SystemConfig;
}

interface FAQItem {
  id: string;
  qVi: string;
  qEn: string;
  aVi: string;
  aEn: string;
}

const faqData: FAQItem[] = [
  {
    id: 'faq-1',
    qVi: 'Hệ thống tự động cấp Key VIP mất bao lâu và nhận qua đâu?',
    qEn: 'How fast is the automated VIP key delivery?',
    aVi: 'Hệ thống tự động 100% qua cổng PayOS VietQR. Ngay khi ngân hàng xác nhận giao dịch thành công (thường từ 1 - 3 giây), màn hình sẽ lập tức hiển thị Key VIP kèm nút Sao Chép 1-Click. Bạn cũng có thể dùng chức năng Tra Cứu Đơn Hàng để nhận lại Key.',
    aEn: 'Our system delivers keys instantly in 1 - 3 seconds upon bank confirmation via PayOS VietQR. You can copy the key directly on screen or check your order using the Order Lookup tool.'
  },
  {
    id: 'faq-2',
    qVi: 'Bản Mod Liên Quân / Game MOD có an toàn và Chống Khóa Nick (Anti-Ban) không?',
    qEn: 'Are the MOD files safe and Anti-Ban protected?',
    aVi: 'Các bản Mod được nghiên cứu mã hóa riêng, tích hợp cơ chế Chống Khóa Nick (Anti-Ban) cao cấp, giúp anh em trải nghiệm mượt mà, không văng game. Tuy nhiên, khuyến khích chơi mức độ vừa phải để giữ trải nghiệm tốt nhất.',
    aEn: 'All MOD builds feature custom encryption and Anti-Ban protection for smooth, crash-free gameplay.'
  },
  {
    id: 'faq-3',
    qVi: 'Cách cài đặt file IPA trên iPhone (iOS) không cần máy tính?',
    qEn: 'How to install IPA files on iOS without a computer?',
    aVi: 'Đối với iOS, bạn có thể sử dụng các công cụ cài trực tiếp như TrollStore, ESign, Scarlet hoặc Sign trực tiếp qua file IPA. Hệ thống có sẵn liên kết hướng dẫn chi tiết khi lấy Key hoặc mua Key VIP.',
    aEn: 'On iOS, you can install IPA files directly using TrollStore, ESign, Scarlet, or Web Signer.'
  },
  {
    id: 'faq-4',
    qVi: 'Tôi phải làm gì nếu cần hỗ trợ kỹ thuật hoặc bảo hành Key?',
    qEn: 'How do I get technical support or key warranty?',
    aVi: 'Bộ phận Hỗ trợ Kỹ thuật của chúng tôi hoạt động 24/7 qua Messenger, Telegram và Zalo Group. Bấm vào các biểu tượng liên hệ ở mục Kênh Chính Thức để được hỗ trợ tức thì.',
    aEn: 'Our support team is available 24/7 via Messenger, Telegram, and Zalo. Click the contact badges to get instant help.'
  }
];

function extractYoutubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export function FAQSection({ lang, config }: FAQSectionProps) {
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const rawVideoUrl = config?.guideYoutubeUrl || '';
  const youtubeId = extractYoutubeId(rawVideoUrl) || 'dQw4w9WgXcQ'; // Fallback demo video ID if not set

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="section" id="faq">
      <ScrollReveal>
        <div className="section-head">
          <span className="section-badge-glow">{lang === 'vi' ? 'HỎI ĐÁP & HƯỚNG DẪN' : 'FAQ & GUIDES'}</span>
          <h2>{lang === 'vi' ? 'Câu Hỏi Thường Gặp & Video Hướng Dẫn' : 'Frequently Asked Questions & Video Guides'}</h2>
          <p className="section-sub">
            {lang === 'vi'
              ? 'Giải đáp thắc mắc và theo dõi video hướng dẫn chi tiết quy trình mua Key & cài đặt game MOD'
              : 'Common questions and step-by-step video tutorials for key activation and installation'}
          </p>
        </div>
      </ScrollReveal>

      {/* Embedded YouTube Video Tutorial Card */}
      <ScrollReveal delay={100}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto 36px auto',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '20px',
          padding: '16px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '0 8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ▶ YOUTUBE
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                {lang === 'vi' ? '🎬 Video Hướng Dẫn Cài Đặt & Kích Hoạt Key VIP' : '🎬 Step-by-Step Installation & Activation Guide'}
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {lang === 'vi' ? 'HD 1080p • Tự động' : 'HD 1080p • Auto'}
            </span>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 Aspect Ratio
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {isPlayingVideo ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube Video Guide"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            ) : (
              <div
                onClick={() => setIsPlayingVideo(true)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Dark overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%)'
                }} />

                {/* Glowing Play Button */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <span style={{ fontSize: '28px', color: '#ffffff', marginLeft: '4px' }}>▶</span>
                  </div>
                  <span style={{
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '15px',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    {lang === 'vi' ? '⚡ Bấm để xem Video Hướng Dẫn' : '⚡ Click to Watch Video Guide'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <div className="faq-grid">
          {faqData.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className={`faq-card ${isOpen ? 'open' : ''}`}>
                <button className="faq-question-btn" onClick={() => toggleFAQ(item.id)}>
                  <span className="faq-icon-q">❓</span>
                  <span className="faq-question-text">{lang === 'vi' ? item.qVi : item.qEn}</span>
                  <span className="faq-toggle-arrow">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="faq-answer-body animate-fadeIn">
                    <p>{lang === 'vi' ? item.aVi : item.aEn}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
