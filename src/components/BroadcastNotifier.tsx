import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';

export default function BroadcastNotifier() {
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        
        // Only show if it's new (not the one we just closed or already saw)
        const storedLastId = localStorage.getItem('last_broadcast_id');
        if (data.id !== storedLastId) {
          setLatestAnnouncement(data);
          setIsVisible(true);
          setTimeLeft(5); // Start the 5-second lock
        }
      }
    }, (error) => {
      console.warn("BroadcastNotifier snapshot subscription warning / offline:", error);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(5); // Reset to 5 seconds when visible
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  const closeAnnouncement = () => {
    if (timeLeft > 0) return; // Prevent early close
    setIsVisible(false);
    if (latestAnnouncement) {
      localStorage.setItem('last_broadcast_id', latestAnnouncement.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertOctagon className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getProgressBarColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && latestAnnouncement && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-8 left-4 right-4 md:left-auto md:right-8 z-[100] max-w-sm w-full"
        >
          <div className={`p-6 rounded-[2rem] border-2 shadow-2xl ${getColors(latestAnnouncement.type)} flex gap-4 pr-12 relative overflow-hidden backdrop-blur-md`}>
            <div className="shrink-0 mt-1">
              {getIcon(latestAnnouncement.type)}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3" /> System Broadcast
              </p>
              <p className="text-sm font-medium text-brand-dark leading-relaxed">
                {latestAnnouncement.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[8px] font-bold text-text-muted uppercase">
                  {new Date(latestAnnouncement.createdAt).toLocaleTimeString()}
                </p>
                {timeLeft > 0 && (
                  <span className="text-[8px] font-extrabold bg-black/5 px-1.5 py-0.5 rounded text-gray-500 animate-pulse">
                    🔒 LOCK: {timeLeft}s
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={closeAnnouncement}
              disabled={timeLeft > 0}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors flex items-center justify-center ${
                timeLeft > 0 
                  ? 'bg-black/5 text-gray-500 cursor-not-allowed text-[10px] font-mono font-bold w-6 h-6' 
                  : 'hover:bg-black/5 text-text-muted cursor-pointer'
              }`}
            >
              {timeLeft > 0 ? (
                <span>{timeLeft}</span>
              ) : (
                <X className="w-4 h-4 text-text-muted" />
              )}
            </button>
            {/* Countdown Progress Bar */}
            {timeLeft > 0 && (
              <div 
                className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear ${getProgressBarColor(latestAnnouncement.type)}`} 
                style={{ width: `${(timeLeft / 5) * 100}%` }} 
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
