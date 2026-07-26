import React, { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  color: string;
}

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [rotation, setRotation] = useState(15);
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevPos = useRef({ x: -200, y: -200 });
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevPos.current.x;
      const dy = e.clientY - prevPos.current.y;
      
      // Calculate cursor movement velocity for dynamic tilting of the test tube
      const speed = Math.sqrt(dx * dx + dy * dy);
      const tiltAngle = Math.max(-35, Math.min(35, dx * 0.8));
      
      setPos({ x: e.clientX, y: e.clientY });
      setRotation(12 + tiltAngle);
      if (!isVisible) setIsVisible(true);

      // Spawn glowing bubbles / chemical reaction particles on movement
      if (speed > 2) {
        const colors = ['#ef4444', '#f87171', '#f43f5e', '#fb7185', '#fbbf24', '#38bdf8'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newParticle: Particle = {
          id: Date.now() + Math.random(),
          x: e.clientX + (Math.random() * 6 - 3), // directly out of the test tube rim
          y: e.clientY + (Math.random() * 4 - 2),
          size: Math.random() * 5 + 3,
          opacity: 0.9,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random() * 1.5, // float upwards like chemical gas/bubbles
          color: randomColor,
        };

        setParticles(prev => [...prev.slice(-18), newParticle]);
      }

      prevPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isVisible]);

  // Particle physics loop for floating chemical bubbles
  useEffect(() => {
    if (particles.length === 0) return;

    const updateParticles = () => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: p.opacity - 0.03,
            size: Math.max(0, p.size - 0.05),
          }))
          .filter(p => p.opacity > 0 && p.size > 0)
      );

      animFrameId.current = requestAnimationFrame(updateParticles);
    };

    animFrameId.current = requestAnimationFrame(updateParticles);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [particles]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Outer ambient red/rose chemical glow */}
      <div
        className="fixed top-0 left-0 w-80 h-80 rounded-full pointer-events-none transition-transform duration-100 ease-out"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.12) 40%, rgba(239, 68, 68, 0) 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Chemical Gas / Bubbles floating upward */}
      {particles.map((p, pIdx) => (
        <div
          key={`cg-particle-${p.id}-${pIdx}`}
          className="fixed top-0 left-0 rounded-full pointer-events-none shadow-sm"
          style={{
            transform: `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}

      {/* Floating Glowing Chemistry Test Tube Icon attached directly to cursor */}
      <div
        className="fixed top-0 left-0 pointer-events-none transition-transform duration-75 ease-out flex items-center justify-center"
        style={{
          transform: `translate3d(${pos.x - 16}px, ${pos.y - 2.67}px, 0) rotate(${rotation}deg)`,
          transformOrigin: '16px 2.67px',
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
            {/* Test Tube Outer Glass */}
            <path
              d="M9 2H15M10 2V17.5C10 18.8807 11.1193 20 12.5 20C13.8807 20 15 18.8807 15 17.5V2"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Liquid Level inside tube */}
            <path
              d="M10.5 10C11 11 14 9.5 14.5 10.5V17.5C14.5 18.3284 13.8284 19 13 19H12C11.1716 19 10.5 18.3284 10.5 17.5V10Z"
              fill="url(#testTubeLiquidGradient)"
              opacity="0.9"
            />
            {/* Measurement Graduations */}
            <line x1="13" y1="6" x2="15" y2="6" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <line x1="12.5" y1="9" x2="15" y2="9" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <line x1="13" y1="12" x2="15" y2="12" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            
            {/* Bubbles in tube */}
            <circle cx="12" cy="13" r="0.8" fill="#ffffff" />
            <circle cx="13.2" cy="16" r="1" fill="#ffffff" />
            
            {/* SVG Gradients */}
            <defs>
              <linearGradient id="testTubeLiquidGradient" x1="12.5" y1="10" x2="12.5" y2="19" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f87171" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
            </defs>
          </svg>

          {/* Sparkle Glow Dot at Test Tube Lip */}
          <div className="absolute -top-1 left-2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
        </div>
      </div>
    </div>
  );
}
