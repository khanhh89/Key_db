import type { Language, SystemConfig } from '../../types';

interface FooterProps {
  lang: Language;
  config: SystemConfig;
}

export function Footer({ lang, config }: FooterProps) {
  const domainText = config.domain ? config.domain.toLowerCase() : '';

  return (
    <footer id="footer">
      {lang === 'vi'
        ? `Bản quyền © 2026${domainText ? ' ' + domainText : ''}. Đã đăng ký bản quyền.`
        : `Copyright © 2026${domainText ? ' ' + domainText : ''}. All rights reserved.`}
    </footer>
  );
}
