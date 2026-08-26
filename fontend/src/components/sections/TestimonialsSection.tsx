import { useEffect, useState } from 'react';
import type { Language, FeedbackItem } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';
import { fetchPublicApprovedFeedbacks } from '../../services/feedbackApi';

interface TestimonialsSectionProps {
  lang: Language;
}

export function TestimonialsSection({ lang }: TestimonialsSectionProps) {
  const [approvedFeedbacks, setApprovedFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadApprovedFeedbacks();
  }, []);

  const loadApprovedFeedbacks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPublicApprovedFeedbacks();
      if (data) {
        setApprovedFeedbacks(data);
      }
    } catch (err) {
      console.warn('Could not load approved public feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBadgeLabel = (cat: string) => {
    switch (cat) {
      case 'BUG_REPORT': return '🐛 Báo Lỗi';
      case 'FEATURE_REQUEST': return '💡 Đề Xuất';
      case 'COMPLAINT': return '⚠️ Phản Ánh';
      default: return '💬 Góp Ý';
    }
  };

  const getRandomAvatar = (id: number) => {
    const avatars = ['👨‍💻', '🎮', '⚡', '👑', '🚀', '🎯', '💎', '🌟'];
    return avatars[id % avatars.length];
  };

  return (
    <section className="section" id="reviews">
      <ScrollReveal>
        <div className="section-head">
          <span className="section-badge-glow">{lang === 'vi' ? 'ĐÁNH GIÁ THỰC TẾ' : 'CUSTOMER REVIEWS'}</span>
          <h2>{lang === 'vi' ? 'Phản Hồi Từ Khách Hàng VIP' : 'What Our VIP Buyers Say'}</h2>
          <p className="section-sub">
            {lang === 'vi'
              ? 'Ý kiến thực tế từ khách hàng đã gửi phản hồi và được Ban Quản Trị phê duyệt'
              : 'Real feedback submitted by customers and approved by Admin'}
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            ⚡ Đang tải phản hồi từ khách hàng...
          </div>
        ) : approvedFeedbacks.length > 0 ? (
          <div className="testimonials-grid">
            {approvedFeedbacks.map((fb) => (
              <div key={fb.id} className="testimonial-card hover-lift">
                <div className="testi-header">
                  <div className="testi-avatar">{getRandomAvatar(fb.id)}</div>
                  <div>
                    <h4 className="testi-name">{fb.contactInfo || `Khách hàng VIP #${fb.id}`}</h4>
                    <span className="testi-role">{getCategoryBadgeLabel(fb.category)}</span>
                  </div>
                  <span className="testi-badge">🌟 Đã duyệt trang chủ</span>
                </div>

                {fb.rating && (
                  <div className="testi-stars">
                    {'⭐'.repeat(fb.rating)}
                  </div>
                )}

                <div style={{ margin: '8px 0', fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>
                  {fb.title}
                </div>

                <p className="testi-comment">
                  "{fb.content}"
                </p>

                {fb.adminReply && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderLeft: '3px solid #38bdf8',
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}>
                    <strong style={{ color: '#38bdf8' }}>💬 BQT Trả Lời:</strong> {fb.adminReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            maxWidth: '560px',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💌</div>
            <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              {lang === 'vi' ? 'Chưa có phản hồi nào được duyệt' : 'No approved feedback yet'}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              {lang === 'vi'
                ? 'Hãy gửi góp ý hoặc báo lỗi của bạn qua nút Góp Ý để được Ban Quản Trị phê duyệt hiển thị tại đây!'
                : 'Send your feedback via the Feedback button to get approved by Admin and featured here!'}
            </p>
          </div>
        )}
      </ScrollReveal>
    </section>
  );
}
