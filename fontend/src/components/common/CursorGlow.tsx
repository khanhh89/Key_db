import { useEffect, useState } from 'react';

export function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="cursor-glow-follower"
      style={{
        transform: `translate3d(${pos.x - 175}px, ${pos.y - 175}px, 0)`
      }}
    />
  );
}
