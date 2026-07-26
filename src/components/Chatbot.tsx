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

  // Fetch Support & AI Chat History (Cache in background as soon as user is logged in)
  useEffect(() => {
    if (!user) return;

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
    });

    return () => unsubscribe();
  }, [user]);

  // Mark admin messages as read when opening admin mode
  useEffect(() => {
    if (user && isOpen && mode === 'admin' && adminMessages.length > 0) {
      adminMessages.forEach(msg => {
        if (msg.sender === 'admin' && !msg.isRead) {
          updateDoc(doc(db, 'support_messages', msg.id), { isRead: true }).catch(err => {
            console.error("Error marking message as read:", err);
          });
        }
      });
    }
  }, [user, isOpen, mode, adminMessages]);

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

  // Prevent background body scrolling on mobile when chatbot is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const currentMessage = message.trim();
    setMessage('');
    setLoading(true);

    if (mode === 'ai') {
      // Optimistically add user message locally for instant responsiveness
      const optimisticUserMsg = {
        id: 'opt_user_' + Date.now(),
        text: currentMessage,
        sender: 'user',
        timestamp: new Date(),
        isAiChat: true
      };
      setAiMessages(prev => [...prev.filter(m => m.id !== 'welcome'), optimisticUserMsg]);

      // 1. Add user message to Firestore AI Chat History if logged in (non-blocking for speed)
      if (user) {
        addDoc(collection(db, 'support_messages'), {
          userId: user.uid,
          userName: profile?.name || user.displayName || 'User',
          userEmail: user.email,
          text: currentMessage,
          sender: 'user',
          timestamp: serverTimestamp(),
          isRead: true, // Don't block admin queue
          isAiChat: true
        }).catch(error => {
          console.error("Error saving user message to AI logs:", error);
        });
      }

      // 2. Build history for multi-turn context
      const history = aiMessages
        .filter(m => m.id !== 'welcome' && m.text)
        .slice(-6)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        }));

      // 3. Fetch response from Gemini
      try {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: currentMessage, history }),
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponseText = data.text || "I'm sorry, I couldn't get a response. Please try again.";
        
        // Optimistically add AI response locally for instant display
        const optimisticAiMsg = {
          id: 'opt_ai_' + Date.now(),
          text: aiResponseText,
          sender: 'ai',
          timestamp: new Date(),
          isAiChat: true
        };
        setAiMessages(prev => [...prev, optimisticAiMsg]);

        // 4. Add AI response to Firestore if logged in
        if (user) {
          addDoc(collection(db, 'support_messages'), {
            userId: user.uid,
            userName: 'AI Assistant',
            userEmail: 'ai-bot@rasayan2026.com',
            text: aiResponseText,
            sender: 'ai',
            timestamp: serverTimestamp(),
            isRead: true,
            isAiChat: true
          }).catch(error => {
            console.error("Error saving AI response:", error);
          });
        }
      } catch (error: any) {
        console.error("AI Error:", error);
        const errMsg = `Error: ${error.message || "Failed to connect"}. Try switching to 'Admin Chat'.`;
        
        // Optimistically add error message
        const optimisticErrorMsg = {
          id: 'opt_err_' + Date.now(),
          text: errMsg,
          sender: 'ai',
          timestamp: new Date(),
          isAiChat: true
        };
        setAiMessages(prev => [...prev, optimisticErrorMsg]);

        if (user) {
          addDoc(collection(db, 'support_messages'), {
            userId: user.uid,
            userName: 'AI Assistant',
            userEmail: 'ai-bot@rasayan2026.com',
            text: errMsg,
            sender: 'ai',
            timestamp: serverTimestamp(),
            isRead: true,
            isAiChat: true
          }).catch(err => {
            console.error("Error saving AI error response:", err);
          });
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Admin Support Mode requires login
      if (!user) {
        const notLoggedInMsg = {
          id: 'opt_admin_guest_' + Date.now(),
          text: "Please sign in or register to send direct support messages to our event coordinators.",
          sender: 'admin',
          timestamp: new Date(),
          isAiChat: false
        };
        setAdminMessages(prev => [...prev, notLoggedInMsg]);
        setLoading(false);
        return;
      }

      // Admin Support Mode (optimistic update)
      const optimisticUserMsg = {
        id: 'opt_admin_user_' + Date.now(),
        text: currentMessage,
        sender: 'user',
        timestamp: new Date(),
        isAiChat: false
      };
      setAdminMessages(prev => [...prev, optimisticUserMsg]);

      // Admin Support Mode (non-blocking)
      addDoc(collection(db, 'support_messages'), {
        userId: user.uid,
        userName: profile?.name || user.displayName || 'User',
        userEmail: user.email,
        text: currentMessage,
        sender: 'user',
        timestamp: serverTimestamp(),
        isRead: false
      }).catch(error => {
        console.error("Error sending message:", error);
      }).finally(() => {
        setLoading(false);
      });
    }
  };

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full h-[100dvh] sm:h-[550px] sm:w-96 bg-white rounded-none sm:rounded-[2rem] shadow-2xl border-none sm:border sm:border-brand-primary/10 flex flex-col overflow-hidden"
          >
            {/* Header with Mode Toggle */}
            <div className="bg-brand-dark p-6 text-white relative overflow-hidden flex-shrink-0">
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
               <div className="flex bg-black/20 backdrop-blur-md p-1 rounded-2xl mt-4 z-10 relative border border-white/10">
                  <button 
                    onClick={() => setMode('ai')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      mode === 'ai' 
                        ? 'bg-white/20 text-white shadow-sm border border-white/30 backdrop-blur-md' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    AI Assistant
                  </button>
                  <button 
                    onClick={() => setMode('admin')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative ${
                      mode === 'admin' 
                        ? 'bg-white/20 text-white shadow-sm border border-white/30 backdrop-blur-md' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-red-300" />
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
                (mode === 'ai' ? aiMessages : adminMessages).map((msg, idx) => (
                  <div 
                    key={msg.id || `chat-msg-${idx}`} 
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
            <form onSubmit={handleSendMessage} className="p-4 pb-6 sm:pb-4 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={mode === 'ai' ? "Ask the AI..." : "Message Admin..."}
                  className="w-full bg-brand-soft border-none rounded-2xl py-3 pl-4 pr-12 text-base sm:text-sm focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
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

      <div className={`fixed bottom-6 right-6 z-50 ${isOpen ? 'hidden sm:block' : 'block'}`}>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="btn-primary !p-4 !rounded-full shadow-2xl relative group transition-all flex items-center justify-center border border-white/30"
          title="Open AI Assistant & Support"
        >
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
}
