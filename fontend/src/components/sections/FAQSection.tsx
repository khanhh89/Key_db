import { useState } from 'react';
import type { Language } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';

interface FAQSectionProps {
  lang: Language;
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

export function FAQSection({ lang }: FAQSectionProps) {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="section" id="faq">
      <ScrollReveal>
        <div className="section-head">
          <span className="section-badge-glow">{lang === 'vi' ? 'HỎI ĐÁP & HƯỚNG DẪN' : 'FAQ & GUIDES'}</span>
          <h2>{lang === 'vi' ? 'Câu Hỏi Thường Gặp' : 'Frequently Asked Questions'}</h2>
          <p className="section-sub">
            {lang === 'vi'
              ? 'Giải đáp thắc mắc về quy trình mua Key, cài đặt game Mod và chính sách bảo hành'
              : 'Common questions about VIP keys, installation, and support'}
          </p>
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
