import { useState, type ImgHTMLAttributes } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerStyle?: React.CSSProperties;
}

export function LazyImage({ src, alt, className = '', containerStyle, style, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  return (
    <div className="lazy-img-container" style={containerStyle}>
      {!isLoaded && !isError && <div className="lazy-img-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsLoaded(true);
          setIsError(true);
        }}
        className={`lazy-img-fade ${isLoaded ? 'loaded' : ''} ${className}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style
        }}
        {...props}
      />
    </div>
  );
}
