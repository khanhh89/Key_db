interface TileProps {
  cls: string;
  icon: string;
  title: string;
  text: string;
  url: string;
}

export function Tile({ cls, icon, title, text, url }: TileProps) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`tile ${cls} hover-lift`}>
      <i>{icon}</i>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
      <strong>↗</strong>
    </a>
  );
}
