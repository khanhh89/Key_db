import type { Language } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';

interface TestimonialsSectionProps {
  lang: Language;
}

interface TestimonialItem {
  id: string;
  name: string;
  avatar: string;
  role: string;
  commentVi: string;
  commentEn: string;
  rating: number;
  badge: string;
}

const testimonials: TestimonialItem[] = [
  {
    id: 'testi-1',
    name: 'Nguyễn Văn Minh',
    avatar: '👨‍💻',
    role: 'Khách hàng VIP 1 Năm',
    commentVi: 'Key nhả siêu nhanh qua PayOS VietQR chỉ mất 2s. Bản Mod Liên Quân đánh cực mượt, không giật lag hay văng game bao giờ!',
    commentEn: 'Key received in 2s via PayOS VietQR. AOV Mod runs super smooth with zero crashes!',
    rating: 5,
    badge: '✅ Đã xác minh mua Key'
  },
  {
    id: 'testi-2',
    name: 'Trần Hoàng Đạt',
    avatar: '🎮',
    role: 'Gamer Delta Roblox',
    commentVi: 'Lần đầu mua Key bản quyền ở đây, hỗ trợ nhiệt tình qua Messenger 24/7. Hướng dẫn cài đặt ESign iOS rất chi tiết!',
    commentEn: 'Great customer support 24/7 on Messenger. Step-by-step guide for iOS installation!',
    rating: 5,
    badge: '✅ Đã xác minh mua Key'
  },
  {
    id: 'testi-3',
    name: 'Lê Thanh Nam',
    avatar: '⚡',
    role: 'Khách hàng VIP 30 Ngày',
    commentVi: 'Hệ thống tự động tuyệt vời, nạp tiền 12h đêm vẫn nhận Key tức thì. Khuyên anh em nên chọn gói 30 Ngày rất hời!',
    commentEn: 'Instant automated delivery even at midnight. Highly recommend the 30-Day VIP package!',
    rating: 5,
    badge: '✅ Đã xác minh mua Key'
  }
];

export function TestimonialsSection({ lang }: TestimonialsSectionProps) {
  return (
    <section className="section" id="reviews">
      <ScrollReveal>
        <div className="section-head">
          <span className="section-badge-glow">{lang === 'vi' ? 'ĐÁNH GIÁ THỰC TẾ' : 'CUSTOMER REVIEWS'}</span>
          <h2>{lang === 'vi' ? 'Phản Hồi Từ Khách Hàng VIP' : 'What Our VIP Buyers Say'}</h2>
          <p className="section-sub">
            {lang === 'vi'
              ? 'Hơn 100,000+ lượt khách hàng đã tin tưởng và sử dụng Key bản quyền tự động'
              : 'Over 100,000+ satisfied customers using our automated VIP keys'}
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <div className="testimonials-grid">
          {testimonials.map((item) => (
            <div key={item.id} className="testimonial-card hover-lift">
              <div className="testi-header">
                <div className="testi-avatar">{item.avatar}</div>
                <div>
                  <h4 className="testi-name">{item.name}</h4>
                  <span className="testi-role">{item.role}</span>
                </div>
                <span className="testi-badge">{item.badge}</span>
              </div>

              <div className="testi-stars">
                {'⭐'.repeat(item.rating)}
              </div>

              <p className="testi-comment">
                "{lang === 'vi' ? item.commentVi : item.commentEn}"
              </p>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
