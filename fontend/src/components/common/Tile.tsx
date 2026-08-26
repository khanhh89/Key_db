interface TileProps {
  cls: string;
  icon: string;
  title: string;
  text: string;
  url: string;
}

export function Tile({ cls, icon, title, text, url }: TileProps) {
  const isImageIcon = (str: string) => {
    if (!str) return false;
    const clean = str.trim();
    return (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('/') ||
      clean.startsWith('data:image/') ||
      /\.(png|jpg|jpeg|gif|svg|webp)($|\?)/i.test(clean)
    );
  };

  const renderIcon = () => {
    if (isImageIcon(icon)) {
      return (
        <img
          src={icon.trim()}
          alt={title}
          style={{
            width: '46px',
            height: '46px',
            objectFit: 'contain',
            borderRadius: '10px',
            display: 'block',
            flexShrink: 0
          }}
        />
      );
    }
    return icon;
  };

  return (
    <a href={url} target="_blank" rel="noreferrer" className={`tile ${cls} hover-lift`}>
      <i style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderIcon()}
      </i>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
      <strong>↗</strong>
    </a>
  );
}
