import React from 'react';
import { useEvents } from '../context/EventContext';
import { motion } from 'motion/react';
import { MapPin, Monitor, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { AtomicVector, BeakerVector } from '../components/ChemistryVectors';
import { Link } from 'react-router-dom';

export default function Events() {
  const { events } = useEvents();
  const [filter, setFilter] = React.useState<'all' | 'offline' | 'online'>('all');

  const filteredEvents = events.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden">
      {/* Decorative Tinted Glows & Vectors */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 -left-20 w-80 h-80 text-brand-primary/10 -rotate-12 pointer-events-none">
        <BeakerVector />
      </div>
      <div className="absolute bottom-20 -right-20 w-96 h-96 text-brand-primary/10 rotate-12 pointer-events-none">
        <AtomicVector />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <header className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 badge-tinted-red mb-4">
            <Sparkles className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Panchtatva 2026 Competitions</span>
          </div>
          <h1 className="text-5xl font-serif text-brand-dark mb-4 tracking-tight">Scientific Arena</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Explore our meticulously crafted events centered around the five elements of nature. Test your skill, memory, and strategy.
          </p>
          
          {/* macOS Tinted Filter Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl glass-card-tinted mt-8 gap-2">
            {(['all', 'offline', 'online'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filter === t 
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-400/40' 
                    : 'text-gray-600 hover:text-red-700 hover:bg-red-500/10'
                }`}
              >
                {t === 'all' ? 'All Arena Events' : t === 'offline' ? 'On-Campus (Offline)' : 'Online Contests'}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              key={event.id}
              className="glass-card-tinted flex flex-col overflow-hidden group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="p-7 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    event.type === 'offline' ? 'badge-tinted-amber' : 'badge-tinted-emerald'
                  }`}>
                    {event.type === 'offline' ? <MapPin className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    {event.type}
                  </span>
                  <span className="badge-tinted-red text-[10px]">
                    {event.category}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-brand-dark mb-3 group-hover:text-red-600 transition-colors">{event.name}</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-6 line-clamp-3">{event.description}</p>
                
                <div className="space-y-2.5 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <h4 className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-red-600" /> Key Rules
                  </h4>
                  <ul className="text-xs text-gray-700 space-y-1 pl-4 list-disc font-medium">
                    {event.rules.map((rule, i) => (
                      <li key={`${event.id}-rule-${i}`}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-red-500/10 via-rose-500/5 to-white/40 backdrop-blur-xl border-t border-red-500/15 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Prizes / Winners</p>
                  <p className="text-sm font-bold text-brand-dark">{event.winners}</p>
                </div>
                <Link 
                  to={`/register?event=${event.id}`} 
                  className="btn-mac-tinted-red !py-1.5 !px-3 text-xs flex items-center gap-1 font-semibold group-hover:bg-red-600 group-hover:text-white transition-all"
                >
                  Register
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

