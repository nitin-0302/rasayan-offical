import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc, 
  query, 
  orderBy, 
  arrayUnion
} from 'firebase/firestore';
import { 
  MessageSquare, 
  Megaphone, 
  Send, 
  Trash2, 
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertOctagon, 
  X, 
  Users, 
  Shield,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhotoURL: string;
  text: string;
  createdAt: number;
  reported?: boolean;
  reportsCount?: number;
  reports?: any[];
}

interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
}

export default function Community() {
  const { user, login, isAdmin, isCoAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Chat input state
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Reporting State
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate or offensive language');

  // Announcement filter
  const [announcementFilter, setAnnouncementFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [announcementSearch, setAnnouncementSearch] = useState('');

  // Announcement creation state (for Admins & Co-Admins only)
  const [newAnnouncementMsg, setNewAnnouncementMsg] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages in real-time
  useEffect(() => {
    const q = query(collection(db, 'community_chat'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setChatMessages(msgs);
      setLoadingChat(false);
    }, (error) => {
      console.warn("Community chat error:", error);
      setLoadingChat(false);
    });

    return () => unsub();
  }, []);

  // Load announcements in real-time
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const anns = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(anns);
      setLoadingAnnouncements(false);
    }, (error) => {
      console.warn("Announcements error:", error);
      setLoadingAnnouncements(false);
    });

    return () => unsub();
  }, []);

  // Scroll to bottom when messages list updates or chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in first to send a message!");
      return;
    }
    if (!newMessageText.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'community_chat'), {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'Anonymous Chemist',
        userPhotoURL: user.photoURL || '',
        text: newMessageText.trim(),
        createdAt: Date.now(),
        reported: false,
        reportsCount: 0,
        reports: []
      });
      setNewMessageText('');
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const isAuthorized = isAdmin || isCoAdmin;
    if (!isAuthorized) return;

    if (!window.confirm("Are you sure you want to delete this message permanently?")) return;

    try {
      await deleteDoc(doc(db, 'community_chat', msgId));
    } catch (err: any) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message: " + err.message);
    }
  };

  const handleReportMessage = async () => {
    if (!user || !reportingMessage) return;

    try {
      const msgRef = doc(db, 'community_chat', reportingMessage.id);
      await updateDoc(msgRef, {
        reported: true,
        reportsCount: (reportingMessage.reportsCount || 0) + 1,
        reports: arrayUnion({
          userId: user.uid,
          userName: user.displayName || 'Anonymous Chemist',
          userEmail: user.email || '',
          reason: reportReason,
          timestamp: Date.now()
        })
      });
      alert("Thank you. The message has been flagged and submitted to coordinators for urgent moderation review.");
      setReportingMessage(null);
    } catch (err: any) {
      console.error("Error reporting message:", err);
      alert("Failed to submit report: " + err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const isAuthorized = isAdmin || isCoAdmin;
    if (!isAuthorized) {
      alert("Permission denied. Only Admins and Co-Admins can create announcements.");
      return;
    }
    if (!newAnnouncementMsg.trim()) return;

    setPublishingAnnouncement(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        message: newAnnouncementMsg.trim(),
        type: newAnnouncementType,
        createdAt: Date.now()
      });
      setNewAnnouncementMsg('');
      alert("Broadcast sent successfully!");
    } catch (err: any) {
      console.error("Error creating announcement:", err);
      alert("Failed to broadcast announcement: " + err.message);
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin) {
      alert("Permission denied. Only Administrators can permanently delete broadcasts.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this announcement broadcast? This cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err: any) {
      console.error("Error deleting announcement:", err);
      alert("Failed to delete announcement: " + err.message);
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertOctagon className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAnnouncementBg = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-100 bg-green-50/40 text-green-950';
      case 'warning': return 'border-amber-100 bg-amber-50/40 text-amber-950';
      case 'error': return 'border-red-100 bg-red-50/40 text-red-950';
      default: return 'border-blue-100 bg-blue-50/40 text-blue-950';
    }
  };

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesFilter = announcementFilter === 'all' || ann.type === announcementFilter;
    const matchesSearch = ann.message.toLowerCase().includes(announcementSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-20 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Top Aesthetic Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-gray-100 rounded-3xl p-6 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-brand-primary rounded-2xl text-white shadow-md">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-serif font-black tracking-tight text-brand-dark">
                  Community Hub
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-brand-soft text-brand-primary px-3 py-1 rounded-full border border-brand-primary/10">
                  Live
                </span>
              </div>
              <p className="text-sm text-text-muted mt-0.5 max-w-md">
                Chat in real-time with other Chemist participants and stay updated with the latest official broadcasts.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl mt-4 md:mt-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'chat' 
                  ? 'bg-white text-brand-primary shadow-sm' 
                  : 'text-text-muted hover:text-brand-dark'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Community Chat
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'announcements' 
                  ? 'bg-white text-brand-primary shadow-sm' 
                  : 'text-text-muted hover:text-brand-dark'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Announcements
              {announcements.length > 0 && (
                <span className="bg-brand-primary text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'chat' ? (
          /* COMMUNITY CHAT INTERFACE */
          <div className="flex flex-col h-[600px] bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden relative">
            
            {/* Chat header */}
            <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">
                  General Room
                </span>
              </div>
              <span className="text-xs text-text-muted font-medium font-mono">
                {chatMessages.length} Messages
              </span>
            </div>

            {/* Chat Messages Scrolling Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
              {loadingChat ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-2" />
                  <p className="text-xs font-mono">Loading general broadcast room...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted text-center max-w-sm mx-auto p-4">
                  <MessageSquare className="w-12 h-12 text-brand-soft mb-3" />
                  <h4 className="text-sm font-bold text-brand-dark mb-1">Silence of the Labs!</h4>
                  <p className="text-xs leading-relaxed">
                    No messages sent yet. Be the first to start the chemistry conversation!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isOwnMessage = user && msg.userId === user.uid;
                  const isMsgAdmin = msg.userEmail === 'brothernitin99@gmail.com' || msg.userEmail === 'nitin.c@somaiya.edu' || msg.userEmail === 'meetshetye06@gmail.com';
                  const displayTime = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div 
                      key={msg.id || `msg-${idx}`} 
                      className={`flex gap-3 max-w-[85%] ${isOwnMessage ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-brand-soft shrink-0 overflow-hidden border border-gray-150 flex items-center justify-center shadow-inner">
                        {msg.userPhotoURL ? (
                          <img src={msg.userPhotoURL} alt={msg.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="font-serif font-black text-brand-primary text-xs uppercase">
                            {msg.userName.substring(0, 2)}
                          </span>
                        )}
                      </div>

                      {/* Content Bubble Wrapper */}
                      <div className={`space-y-1 ${isOwnMessage ? 'items-end' : ''}`}>
                        {/* Name and Label */}
                        <div className={`flex items-center gap-1.5 text-[10px] text-text-muted font-bold ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <span className="text-brand-dark">{msg.userName}</span>
                          {isMsgAdmin && (
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-amber-200">
                              <Shield className="w-2.5 h-2.5" /> Org
                            </span>
                          )}
                          <span className="text-[8px] font-mono font-medium opacity-65">{displayTime}</span>

                          {/* Always-visible Delete button for Admins and Co-Admins */}
                          {(isAdmin || isCoAdmin) && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 transition-all duration-200 cursor-pointer flex items-center gap-0.5 ${
                                isOwnMessage ? 'mr-1.5' : 'ml-1.5'
                              }`}
                              title="Delete Chat Message"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Delete
                            </button>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="relative group">
                          <div className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            isOwnMessage 
                              ? 'bg-brand-primary text-white rounded-tr-none' 
                              : isMsgAdmin 
                                ? 'bg-amber-50/80 border border-amber-150 text-amber-950 rounded-tl-none'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>

                          {/* Action Hover Triggers */}
                          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-100 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                            isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
                          }`}>
                            {!isOwnMessage && user && (
                              <button 
                                onClick={() => setReportingMessage(msg)}
                                className="p-1 hover:text-red-500 text-gray-400 rounded transition-colors"
                                title="Report Message"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(isAdmin || isCoAdmin) && (
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 hover:text-red-600 text-gray-400 rounded transition-colors"
                                title="Delete Message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input Form */}
            <div className="p-4 bg-white border-t border-gray-100">
              {user ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type your message to the conclave..."
                    maxLength={500}
                    disabled={sending}
                    className="flex-1 bg-gray-50 border border-gray-200 focus:border-brand-primary focus:bg-white outline-none rounded-xl px-4 py-3 text-sm transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessageText.trim()}
                    className="bg-brand-primary hover:bg-brand-dark disabled:bg-gray-200 text-white p-3 rounded-xl flex items-center justify-center shadow-md shadow-brand-primary/10 transition-all cursor-pointer"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-brand-soft/40 border border-brand-primary/10 rounded-2xl text-center sm:text-left">
                  <div>
                    <h5 className="text-sm font-bold text-brand-dark">Join the Chemistry Discussion!</h5>
                    <p className="text-xs text-text-muted mt-0.5">Please sign in to read and publish chat messages.</p>
                  </div>
                  <button
                    onClick={login}
                    className="btn-primary py-2 px-6 text-xs bg-brand-primary text-white font-bold tracking-wider rounded-xl cursor-pointer"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ANNOUNCEMENTS LIST INTERFACE */
          <div className="space-y-6">
            
            {/* Admin & Co-Admin announcement writer card */}
            {(isAdmin || isCoAdmin) && (
              <div className="bg-white border-2 border-brand-primary/25 rounded-[2rem] p-6 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-serif font-black text-brand-dark text-lg">
                      Admin Broadcast Desk
                    </h3>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-widest bg-brand-soft text-brand-primary px-2.5 py-1 rounded-full border border-brand-primary/10">
                    Coordinator Privilege
                  </span>
                </div>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest">
                        Broadcast Type
                      </label>
                      <select
                        value={newAnnouncementType}
                        onChange={(e) => setNewAnnouncementType(e.target.value as any)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary focus:bg-white outline-none rounded-xl px-3 py-2.5 text-xs transition-all font-sans font-bold"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="success">Success (Green)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="error">Critical (Red)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest">
                        Broadcast Message
                      </label>
                      <input
                        type="text"
                        value={newAnnouncementMsg}
                        onChange={(e) => setNewAnnouncementMsg(e.target.value)}
                        placeholder="Type official conclave broadcast message here..."
                        maxLength={500}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary focus:bg-white outline-none rounded-xl px-3 py-2.5 text-xs transition-all font-sans"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={publishingAnnouncement || !newAnnouncementMsg.trim()}
                      className="btn-primary py-2.5 px-6 text-xs bg-brand-primary text-white font-bold tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-brand-primary/10"
                    >
                      {publishingAnnouncement ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Megaphone className="w-4 h-4" />
                      )}
                      Publish Official Announcement
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filters & search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'info', 'success', 'warning', 'error'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setAnnouncementFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                      announcementFilter === type 
                        ? 'bg-brand-dark text-white border-brand-dark' 
                        : 'bg-white text-text-muted border-gray-150 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search announcements..."
                value={announcementSearch}
                onChange={(e) => setAnnouncementSearch(e.target.value)}
                className="w-full sm:w-64 bg-gray-50 border border-gray-200 focus:border-brand-primary focus:bg-white outline-none rounded-xl px-3 py-1.5 text-xs transition-all font-sans"
              />
            </div>

            {/* List */}
            <div className="space-y-4">
              {loadingAnnouncements ? (
                <div className="py-20 text-center text-text-muted">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-2" />
                  <p className="text-xs font-mono">Subscribing to system broadcasts...</p>
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                  <Megaphone className="w-16 h-16 text-brand-soft mx-auto mb-4 opacity-55" />
                  <h4 className="text-lg font-bold text-brand-dark mb-1">Station Static!</h4>
                  <p className="text-text-muted text-xs max-w-sm mx-auto leading-relaxed">
                    No announcements match the selected filters or search query. Check back later for official broadcasts!
                  </p>
                </div>
              ) : (
                filteredAnnouncements.map((ann, idx) => (
                  <motion.div
                    key={ann.id || `ann-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-2 p-6 rounded-[2rem] shadow-sm relative overflow-hidden flex gap-4 ${getAnnouncementBg(ann.type)}`}
                  >
                    <div className="shrink-0 mt-0.5 bg-white p-2.5 h-11 w-11 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
                      {getAnnouncementIcon(ann.type)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted bg-white border border-gray-150 px-2.5 py-0.5 rounded-full">
                          {ann.type} Broadcast
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-text-muted">
                            {new Date(ann.createdAt).toLocaleString()}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-white/50 cursor-pointer"
                              title="Delete Broadcast"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap text-brand-dark">
                        {ann.message}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* REPORT MESSAGE DIALOG MODAL */}
      <AnimatePresence>
        {reportingMessage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-500 w-5 h-5 animate-pulse" />
                  <h3 className="text-lg font-serif font-black text-brand-dark">Report Message</h3>
                </div>
                <button 
                  onClick={() => setReportingMessage(null)}
                  className="p-1 hover:bg-gray-150 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-text-muted leading-relaxed">
                  You are flagging a message posted by <strong className="text-brand-dark">{reportingMessage.userName}</strong>. Flagged messages are dispatched directly to the volunteer coordination desk for urgent content safety auditing.
                </p>

                <div className="bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs text-gray-700 italic max-h-24 overflow-y-auto">
                  "{reportingMessage.text}"
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-white border border-gray-200 outline-none rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:border-brand-primary"
                  >
                    <option value="Inappropriate or offensive language">Inappropriate or offensive language</option>
                    <option value="Harassment, bullying, or hate speech">Harassment, bullying, or hate speech</option>
                    <option value="Spam, promotional advertisements, or links">Spam, promotional advertisements, or links</option>
                    <option value="Cheating, answer sharing, or academic integrity violation">Cheating, answer sharing, or academic integrity violation</option>
                    <option value="Irrelevant discussion or disruption">Irrelevant discussion or disruption</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportingMessage(null)}
                  className="btn-secondary py-2 px-4 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportMessage}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" /> Submit Flag
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
