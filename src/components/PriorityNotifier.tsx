import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Sparkles, Clock } from 'lucide-react';

interface PriorityAlert {
  id: string;
  recipientUserId: string;
  text: string;
  senderName: string;
  timestamp: string; // ISO String
}

export default function PriorityNotifier() {
  const { user } = useAuth();
  const [activeAlert, setActiveAlert] = useState<PriorityAlert | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!user) {
      setActiveAlert(null);
      return;
    }

    const q = query(
      collection(db, 'priority_alerts'),
      where('recipientUserId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Find the latest alert that is still within the 30-second window
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriorityAlert[];

      // Sort by timestamp desc to get the newest
      const sortedAlerts = alerts.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (sortedAlerts.length > 0) {
        const newest = sortedAlerts[0];
        const sentTime = new Date(newest.timestamp).getTime();
        const diffMs = Date.now() - sentTime;
        const remaining = Math.max(0, Math.ceil((30000 - diffMs) / 1000));

        // If the alert is still valid (less than 30 seconds old) and different/new
        if (remaining > 0) {
          // Check if we have already dismissed this in local storage to prevent loops on page load
          const dismissedId = localStorage.getItem(`dismissed_priority_${newest.id}`);
          if (dismissedId !== newest.id) {
            setActiveAlert(newest);
            setSecondsLeft(remaining);
          }
        }
      }
    }, (error) => {
      console.warn("PriorityNotifier subscription error / offline:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Live countdown timer
  useEffect(() => {
    if (!activeAlert) return;

    const interval = setInterval(() => {
      const sentTime = new Date(activeAlert.timestamp).getTime();
      const diffMs = Date.now() - sentTime;
      const remaining = Math.max(0, Math.ceil((30000 - diffMs) / 1000));

      if (remaining <= 0) {
        setActiveAlert(null);
        clearInterval(interval);
      } else {
        setSecondsLeft(remaining);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeAlert]);

  const dismissAlert = () => {
    if (activeAlert) {
      localStorage.setItem(`dismissed_priority_${activeAlert.id}`, activeAlert.id);
      setActiveAlert(null);
    }
  };

  return (
    <AnimatePresence>
      {activeAlert && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed top-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-[200] max-w-lg w-full"
        >
          <div className="glass-card p-6 rounded-[2.2rem] border-2 border-amber-500/30 bg-amber-50/95 shadow-2xl relative overflow-hidden backdrop-blur-lg flex flex-col gap-4">
            
            {/* Ambient reaction glow behind */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
            
            {/* Top Indicator */}
            <div className="flex justify-between items-center pb-3 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 animate-bounce" />
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 font-sans">
                  Adviser Priority Dispatch
                </p>
              </div>
              <div className="flex items-center gap-1 bg-amber-200/55 px-2.5 py-1 rounded-full text-amber-950 font-mono text-[10px] font-extrabold animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>{secondsLeft}s left</span>
              </div>
            </div>

            {/* Main Message Content */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-dark leading-relaxed">
                {activeAlert.text}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-amber-700/80 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Sent directly by Rasayan Organizing Advisers
              </div>
            </div>

            {/* Interactive dismiss option */}
            <button 
              onClick={dismissAlert}
              className="w-full text-center py-2.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-900 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-amber-600/10"
            >
              Dismiss Notification
            </button>

            {/* Depletion Progress bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-500" style={{ width: `${(secondsLeft / 30) * 100}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
