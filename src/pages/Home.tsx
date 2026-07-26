import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowRight, TreePine, Droplets, Flame, Wind, Space } from 'lucide-react';
import { AtomicVector, BeakerVector, LabStructureVector, DNAVector } from '../components/ChemistryVectors';

const DEFAULT_VIDEO_URL = 'https://drive.google.com/file/d/1QePHrtCffJD4oREs6rvtPvS9-J2BYJe_/view?usp=sharing';

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getGoogleDriveId = (url: string) => {
  if (!url) return null;
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
  return null;
};

const PanchtatvaCards = [
  { name: 'Earth (Prithvi)', icon: TreePine, desc: 'Stability and grounding in our chemical origins.', color: 'text-brand-primary' },
  { name: 'Water (Jal)', icon: Droplets, desc: 'The universal solvent that sustains life.', color: 'text-blue-600' },
  { name: 'Fire (Agni)', icon: Flame, desc: 'Energy, reaction, and transformation.', color: 'text-brand-primary' },
  { name: 'Air (Vayu)', icon: Wind, desc: 'Invigorating spirit and environmental balance.', color: 'text-slate-500' },
  { name: 'Space (Akash)', icon: Space, desc: 'The vast canvas of cosmic elements.', color: 'text-purple-600' },
];

export default function Home() {
  const videoUrl = DEFAULT_VIDEO_URL;
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Autoplay was prevented or failed:", err);
        });
      }
    }
  }, [videoUrl]);

  return (
    <div className="pt-16 min-h-screen">
      
      {/* Hero Section */}
      <section className="relative aspect-[16/9] min-h-[420px] sm:min-h-[500px] md:min-h-0 w-full py-12 sm:py-20 md:py-0 flex items-center justify-center overflow-hidden bg-black">
        {/* Working Loopable Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            {getYouTubeId(videoUrl) ? (
              <iframe
                key={getYouTubeId(videoUrl)}
                src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(videoUrl)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeId(videoUrl)}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&disablekb=1&playsinline=1&origin=${window.location.origin}`}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-35 mix-blend-screen pointer-events-none"
                style={{
                  width: 'max(100vw, 177.78vh)',
                  height: 'max(56.25vw, 100vh)',
                  transform: 'translate(-50%, -50%) scale(1.15)',
                }}
                allow="autoplay; encrypted-media"
                frameBorder="0"
                title="Banner background video"
              />
            ) : (
              <video
                ref={videoRef}
                key={videoUrl}
                src={getGoogleDriveId(videoUrl) ? `/api/video-proxy?id=${getGoogleDriveId(videoUrl)}` : videoUrl}
                autoPlay={true}
                loop={true}
                muted={true}
                playsInline={true}
                preload="auto"
                className="w-full h-full object-cover absolute inset-0 opacity-85"
                onError={() => {
                  console.warn("Banner background video failed to play or load. Falling back to static vectors.");
                }}
              />
            )}
          </div>
          {/* Subtle vignette/gradient overlay to maintain premium aesthetics and text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70" />
        </div>

        {/* Chem Vectors Floating Foreground */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-10">
          <div className="absolute top-10 left-10 w-48 h-48 text-brand-primary animate-pulse">
            <AtomicVector />
          </div>
          <div className="absolute bottom-10 right-10 w-64 h-64 text-brand-secondary animate-pulse delay-700">
            <LabStructureVector />
          </div>
          <div className="absolute top-1/2 -left-12 w-40 h-40 text-brand-soft opacity-30">
            <BeakerVector />
          </div>
          <div className="absolute top-1/4 right-20 w-32 h-32 text-white opacity-20">
            <DNAVector />
          </div>
        </div>
        
        <div className="relative z-10 max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-brand-secondary font-mono tracking-[0.3em] uppercase mb-4">Department of Chemistry Presents</p>
            <h1 className="text-4xl sm:text-6xl md:text-8xl text-white font-serif font-black mb-6 leading-tight">
              Rasayan <span className="text-brand-primary">Panchtatva</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
              Celebrating the five natural elements and their vital role in chemical harmony and sustainable future.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/events" className="btn-primary text-lg px-8 py-4">
                Explore Events
              </Link>
              <Link to="/register" className="btn-secondary text-lg px-8 py-4 bg-transparent text-white border-white hover:bg-white hover:text-brand-dark">
                Register Now
              </Link>
            </div>
            <p className="mt-8 text-brand-secondary font-medium">16th December, 2026 | K J Somaiya College</p>
          </motion.div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="glass-card-tinted p-8 md:p-10">
              <h2 className="text-4xl font-serif text-brand-dark mb-6 tracking-tight">About The Theme</h2>
              <p className="text-lg text-text-muted leading-relaxed mb-6">
                <strong>Panchtatva</strong> celebrates Earth, Water, Fire, Air, and Space. These elements remind us that life is a delicate interplay of forces and that understanding and respecting nature is essential for a sustainable future.
              </p>
              <p className="text-lg text-text-muted leading-relaxed">
                Today, these lessons resonate with <strong>Green Chemistry</strong> principles, emphasizing safer materials, renewable resources, and designs that minimize environmental harm.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PanchtatvaCards.slice(0, 4).map((item, idx) => (
                <div key={`pt-card-${item.name}-${idx}`} className="glass-card-tinted p-6 hover:scale-[1.02] transition-transform">
                  <item.icon className={`w-10 h-10 ${item.color} mb-4`} />
                  <h3 className="text-xl font-bold text-brand-dark mb-2">{item.name}</h3>
                  <p className="text-sm text-text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-serif text-brand-dark mb-16">Fest Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card-tinted p-10 hover:scale-[1.02]">
              <div className="w-16 h-16 bg-red-500/15 rounded-2xl border border-red-500/20 flex items-center justify-center mb-6 mx-auto">
                <FlaskConical className="text-brand-primary w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">13+ Events</h3>
              <p className="text-text-muted leading-relaxed">From memory challenges to shark tank pitches, we have something for everyone.</p>
            </div>
            <div className="glass-card-tinted p-10 hover:scale-[1.02]">
              <div className="w-16 h-16 bg-violet-500/15 rounded-2xl border border-violet-500/20 flex items-center justify-center mb-6 mx-auto">
                <ArrowRight className="text-violet-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">Inter-Collegiate</h3>
              <p className="text-text-muted leading-relaxed">Connect with minds across colleges and demonstrate your scientific prowess.</p>
            </div>
            <div className="glass-card-tinted p-10 hover:scale-[1.02]">
              <div className="w-16 h-16 bg-sky-500/15 rounded-2xl border border-sky-500/20 flex items-center justify-center mb-6 mx-auto">
                <ArrowRight className="text-sky-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">Expert Mentors</h3>
              <p className="text-text-muted leading-relaxed">Gain insights from seasoned educators and industry professionals.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
