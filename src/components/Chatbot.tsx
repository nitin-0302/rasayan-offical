import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Shield, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

export default function Chatbot() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'ai' | 'admin'>('ai');
  const [message, setMessage] = useState('');
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([
    { 
      id: 'welcome', 
      text: "Hello! I am your Rasayan 2026 Assistant. Welcome to the annual Chemistry Festival of K J Somaiya College of Science and Commerce! 🧪 This year's theme is **'Panchtatva'**. I can help you with event information, registration queries, and general fest details. How can I assist you today? (If you'd like to speak with a human, you can switch to **'Admin Chat'** mode!)", 
      sender: 'ai', 
      timestamp: new Date() 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for custom open event
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      if (e.detail?.mode) {
        setMode(e.detail.mode);
      }
    };
    window.addEventListener('open-support-chat', handleOpen);
    return () => window.removeEventListener('open-support-chat', handleOpen);
  }, []);

  // Fetch Support & AI Chat History
  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, 'support_messages'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAtTime: data.timestamp ? (data.timestamp.toMillis ? data.timestamp.toMillis() : new Date(data.timestamp).getTime()) : Date.now()
        };
      }) as any[];
      
      // Sort in-memory to bypass any composite index requirements in Firestore!
      msgs.sort((a, b) => a.createdAtTime - b.createdAtTime);
      
      const fetchedAi = msgs.filter(m => m.isAiChat === true);
      const fetchedAdmin = msgs.filter(m => !m.isAiChat);

      if (fetchedAi.length > 0) {
        setAiMessages(fetchedAi);
      } else {
        setAiMessages([
          { 
            id: 'welcome', 
            text: "Hello! I am your Rasayan 2026 Assistant. Welcome to the annual Chemistry Festival of K J Somaiya College of Science and Commerce! 🧪 This year's theme is **'Panchtatva'**. I can help you with event information, registration queries, and general fest details. How can I assist you today? (If you'd like to speak with a human, you can switch to **'Admin Chat'** mode!)", 
            sender: 'ai', 
            timestamp: new Date() 
          }
        ]);
      }
      setAdminMessages(fetchedAdmin);
      
      // Mark as read when open in admin mode
      if (mode === 'admin') {
        fetchedAdmin.forEach(msg => {
          if (msg.sender === 'admin' && !msg.isRead) {
            updateDoc(doc(db, 'support_messages', msg.id), { isRead: true });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [user, isOpen, mode]);

  // Handle Unread Count (Admin messages only)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'support_messages'),
      where('userId', '==', user.uid),
      where('sender', '==', 'admin'),
      where('isRead', '==', false)
    );
    return onSnapshot(q, (snap) => setUnreadCount(snap.size));
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [adminMessages, aiMessages, isOpen, mode]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const currentMessage = message.trim();
    setMessage('');
    setLoading(true);

    if (mode === 'ai') {
      // 1. Add user message to Firestore AI Chat History
      try {
        await addDoc(collection(db, 'support_messages'), {
          userId: user.uid,
          userName: profile?.name || user.displayName || 'User',
          userEmail: user.email,
          text: currentMessage,
          sender: 'user',
          timestamp: serverTimestamp(),
          isRead: true, // Don't block admin queue
          isAiChat: true
        });
      } catch (error) {
        console.error("Error saving user message to AI logs:", error);
      }

      // 2. Fetch response from Gemini
      try {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: currentMessage }),
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponseText = data.text || "I'm sorry, I couldn't get a response. Please try again.";
        
        // 3. Add AI response to Firestore
        await addDoc(collection(db, 'support_messages'), {
          userId: user.uid,
          userName: 'AI Assistant',
          userEmail: 'ai-bot@rasayan2026.com',
          text: aiResponseText,
          sender: 'ai',
          timestamp: serverTimestamp(),
          isRead: true,
          isAiChat: true
        });
      } catch (error: any) {
        console.error("AI Error:", error);
        await addDoc(collection(db, 'support_messages'), {
          userId: user.uid,
          userName: 'AI Assistant',
          userEmail: 'ai-bot@rasayan2026.com',
          text: `Error: ${error.message || "Failed to connect"}. Try switching to 'Admin Help'.`,
          sender: 'ai',
          timestamp: serverTimestamp(),
          isRead: true,
          isAiChat: true
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Admin Support Mode
      try {
        await addDoc(collection(db, 'support_messages'), {
          userId: user.uid,
          userName: profile?.name || user.displayName || 'User',
          userEmail: user.email,
          text: currentMessage,
          sender: 'user',
          timestamp: serverTimestamp(),
          isRead: false
        });
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 sm:w-96 bg-white rounded-[2rem] shadow-2xl border border-brand-primary/10 flex flex-col h-[550px] overflow-hidden"
          >
            {/* Header with Mode Toggle */}
            <div className="bg-brand-dark p-6 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="flex justify-between items-center z-10 relative">
                <div>
                  <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-brand-primary" />
                    Help & Support
                  </h3>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Rasayan 2026</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
               </div>

               {/* Mode Switcher */}
               <div className="flex bg-white/10 p-1 rounded-xl mt-4 z-10 relative">
                  <button 
                    onClick={() => setMode('ai')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'ai' ? 'bg-brand-primary text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Assistant
                  </button>
                  <button 
                    onClick={() => setMode('admin')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative ${mode === 'admin' ? 'bg-brand-primary text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Help
                    {unreadCount > 0 && mode !== 'admin' && (
                      <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border border-brand-dark" />
                    )}
                  </button>
               </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-soft/30"
            >
              {(mode === 'ai' ? aiMessages : adminMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center">
                    {mode === 'ai' ? <Sparkles className="w-8 h-8 text-brand-primary" /> : <Shield className="w-8 h-8 text-brand-primary" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700">{mode === 'ai' ? 'How can AI help?' : 'Need a human?'}</h4>
                    <p className="text-xs text-text-muted mt-1">
                      {mode === 'ai' 
                        ? 'Ask me anything about Rasayan 2026, events, or the venue!' 
                        : 'Send a message and our team will get back to you.'}
                    </p>
                  </div>
                </div>
              ) : (
                (mode === 'ai' ? aiMessages : adminMessages).map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-brand-primary text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 prose font-sans'
                    }`}>
                      {msg.sender === 'ai' ? (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <span className="text-[9px] text-text-muted mt-1 px-1">
                      {msg.timestamp?.toDate 
                        ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : msg.timestamp instanceof Date 
                          ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Sending...'}
                    </span>
                  </div>
                ))
              )}
              {loading && mode === 'ai' && (
                <div className="flex flex-col items-start animate-pulse">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                    <span className="text-xs text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={mode === 'ai' ? "Ask the AI..." : "Message Admin..."}
                  className="w-full bg-brand-soft border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="absolute right-2 p-2 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {mode === 'ai' && (
                <p className="text-[8px] text-center text-gray-400 mt-2">
                  AI may provide inaccurate info. For critical issues, use Admin Help.
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-primary text-white p-4 rounded-full shadow-lg relative group transition-all"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
