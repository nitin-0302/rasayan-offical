import React, { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const prevPos = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - prevPos.current.x;

      const tiltAngle = Math.max(-35, Math.min(35, dx * 0.8));
      const rotation = 12 + tiltAngle;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      if (iconRef.current) {
        iconRef.current.style.transform = `translate3d(${x - 16}px, ${y - 2.67}px, 0) rotate(${rotation}deg)`;
      }
      if (containerRef.current) {
        containerRef.current.style.opacity = '1';
      }

      prevPos.current = { x, y };
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-40 overflow-hidden transition-opacity duration-300 opacity-0">
      {/* Outer ambient red chemical glow */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{
          transform: 'translate3d(-200px, -200px, 0) translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.08) 40%, rgba(239, 68, 68, 0) 70%)',
          filter: 'blur(20px)',
          willChange: 'transform',
        }}
      />

      {/* Floating Chemistry Test Tube Icon */}
      <div
        ref={iconRef}
        className="fixed top-0 left-0 pointer-events-none flex items-center justify-center"
        style={{
          transform: 'translate3d(-200px, -200px, 0) rotate(12deg)',
          transformOrigin: '16px 2.67px',
          willChange: 'transform',
        }}
      >
        <div className="relative filter drop-shadow-[0_4px_12px_rgba(220,38,38,0.45)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-red-600"
          >
            <path
              d="M9 2H15M10 2V17.5C10 18.8807 11.1193 20 12.5 20C13.8807 20 15 18.8807 15 17.5V2"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.5 10C11 11 14 9.5 14.5 10.5V17.5C14.5 18.3284 13.8284 19 13 19H12C11.1716 19 10.5 18.3284 10.5 17.5V10Z"
              fill="url(#testTubeLiquidGradient)"
              opacity="0.9"
            />
            <line x1="13" y1="6" x2="15" y2="6" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <line x1="12.5" y1="9" x2="15" y2="9" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <line x1="13" y1="12" x2="15" y2="12" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <circle cx="12" cy="13" r="0.8" fill="#ffffff" />
            <circle cx="13.2" cy="16" r="1" fill="#ffffff" />
            <defs>
              <linearGradient id="testTubeLiquidGradient" x1="12.5" y1="10" x2="12.5" y2="19" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f87171" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute -top-1 left-2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>
    </div>
  );
}

