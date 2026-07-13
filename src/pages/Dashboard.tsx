import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { useEvents } from '../context/EventContext';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Calendar, Award, Settings, User as UserIcon, Check, Clock, XCircle, Info, Brain, Map, Shield, Trophy, Download, Headphones, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';

const RegistrationSkeleton = () => (
  <div className="glass-card p-5 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] relative overflow-hidden ring-1 ring-gray-100/50 bg-white/60">
    <div className="animate-pulse space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100/50 pb-4">
        <div className="h-5 bg-gray-200 rounded-md w-36"></div>
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
      </div>
      <div className="space-y-2 py-2">
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
      </div>
      <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="h-10 bg-gray-150 rounded-xl w-full sm:w-40"></div>
        <div className="h-8 bg-gray-200 rounded-md w-28"></div>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { events } = useEvents();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', college: '', phone: '' });
  const [quizActive, setQuizActive] = useState(false);
  const [treasureActive, setTreasureActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const fetchRegs = async () => {
        try {
          const q = query(collection(db, 'registrations'), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          setRegistrations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Error fetching registrations in Dashboard: ", error);
        } finally {
          setLoadingRegs(false);
        }
      };
      fetchRegs();

      // Listen for Live Quiz status
      const qQuiz = query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1));
      const unsubQuiz = onSnapshot(qQuiz, (snap) => {
        setQuizActive(!snap.empty);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'quizzes');
      });

      // Listen for Treasure Hunt status
      const qHunt = query(collection(db, 'treasure_hunts'), where('isActive', '==', true), limit(1));
      const unsubTreasure = onSnapshot(qHunt, (snap) => {
        setTreasureActive(!snap.empty);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'treasure_hunts');
      });

      // Listen for User's Community Chat Messages
      const qPosts = query(collection(db, 'community_chat'), where('userId', '==', user.uid));
      const unsubPosts = onSnapshot(qPosts, (snap) => {
        setUserPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingPosts(false);
      }, (error) => {
        console.error("Error listening to user chat messages: ", error);
        setLoadingPosts(false);
      });

      return () => {
        unsubQuiz();
        unsubTreasure();
        unsubPosts();
      };
    } else {
      setLoadingRegs(false);
      setLoadingPosts(false);
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditForm(prev => {
        if (prev.name === profile.name && prev.college === profile.college && prev.phone === profile.phone) {
          return prev;
        }
        return { 
          name: profile.name || '', 
          college: profile.college || '', 
          phone: profile.phone || '' 
        };
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), editForm);
    setEditing(false);
  };

  if (authLoading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center min-h-[60vh] bg-bg-paper">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-brand-primary border-brand-soft"></div>
        <p className="mt-4 text-text-muted text-xs font-serif font-medium italic tracking-wide">Syncing profile data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
        <div className="glass-card p-8 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-xl">
          <div className="bg-brand-soft w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 text-brand-primary">
            <UserIcon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-brand-dark mb-3">Dashboard Locked</h2>
          <p className="text-text-muted mb-8 text-xs sm:text-sm leading-relaxed">
            Please register or sign in with Google to view your active schedules, customized results, and profiles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary inline-flex items-center justify-center py-3 px-6 font-bold text-sm tracking-wide">
              Sign In with Google
            </Link>
            <Link to="/" className="btn-secondary inline-flex items-center justify-center py-3 px-6 font-bold text-sm tracking-wide">
              Welcome Screen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {location.state?.registered && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 sm:p-8 bg-brand-primary text-white rounded-[1.8rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-center gap-4 sm:gap-6 shadow-xl shadow-brand-primary/20 border border-white/20"
          >
            <div className="bg-white/20 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shrink-0">
              <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-bold text-xl sm:text-2xl mb-1">Registration Complete!</p>
              <p className="text-xs sm:text-sm opacity-90">Welcome to Rasayan 2026. Your unique participant key is:</p>
            </div>
            <div className="bg-white text-brand-primary px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] font-mono text-xl sm:text-3xl font-bold tracking-[0.2em] shadow-inner">
              {location.state?.uniqueCode || '-----'}
            </div>
          </motion.div>
        )}

        {/* Live Activites and Event Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {quizActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-[1.8rem] sm:rounded-[2.5rem] shadow-xl shadow-orange-500/10"
            >
              <div className="bg-white rounded-[1.7rem] sm:rounded-[2.4rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 overflow-hidden relative min-h-[140px]">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Brain className="w-28 h-28 sm:w-40 sm:h-40 text-brand-dark" />
                </div>
                <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full sm:w-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-140 to-orange-100/70 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <h3 className="text-lg sm:text-xl font-serif text-brand-dark leading-tight">Live Quiz is Active!</h3>
                    </div>
                    <p className="text-text-muted text-[11px] sm:text-xs mt-1 sm:mt-1.5">Compete against peers and win instant rewards.</p>
                  </div>
                </div>
                <Link 
                  to="/quiz" 
                  className="w-full sm:w-auto btn-primary py-2.5 sm:py-3 px-6 sm:px-8 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md hover:shadow-orange-600/20 text-center transition-all relative z-10 text-xs sm:text-sm whitespace-nowrap"
                >
                  Enter Lab
                </Link>
              </div>
            </motion.div>
          )}

          {treasureActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-0.5 bg-gradient-to-r from-brand-primary via-indigo-600 to-purple-700 rounded-[1.8rem] sm:rounded-[2.5rem] shadow-xl shadow-brand-primary/10"
            >
              <div className="bg-white rounded-[1.7rem] sm:rounded-[2.4rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 overflow-hidden relative min-h-[140px]">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Map className="w-28 h-28 sm:w-40 sm:h-40 text-brand-dark" />
                </div>
                <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full sm:w-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-soft to-indigo-100/70 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <Map className="w-6 h-6 sm:w-8 sm:h-8 text-brand-primary animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping"></span>
                      <h3 className="text-lg sm:text-xl font-serif text-brand-dark leading-tight">Treasure Hunt LIVE!</h3>
                    </div>
                    <p className="text-text-muted text-[11px] sm:text-xs mt-1 sm:mt-1.5 font-medium">Solve cryptographic puzzles & crack the locks.</p>
                  </div>
                </div>
                <Link 
                  to="/treasure-hunt" 
                  className="w-full sm:w-auto btn-primary py-2.5 sm:py-3 px-6 sm:px-8 bg-gradient-to-r from-brand-primary to-indigo-600 text-white shadow-md hover:shadow-brand-primary/20 text-center transition-all relative z-10 text-xs sm:text-sm whitespace-nowrap"
                >
                  Start Hunt
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-1 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 rounded-[1.8rem] sm:rounded-[2.5rem] shadow-lg shadow-amber-200/10"
          >
            <div className="bg-white rounded-[1.7rem] sm:rounded-[2.4rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-amber-950 leading-tight">Admin Console Access</h3>
                  <p className="text-amber-700 text-[11px] sm:text-xs mt-1 italic font-medium">Authorized administrator mode is fully configured.</p>
                </div>
              </div>
              <Link 
                to="/admin" 
                className="w-full sm:w-auto btn-primary py-2.5 sm:py-3 px-6 sm:px-8 bg-amber-600 text-white shadow-md hover:bg-amber-700 hover:shadow-amber-600/20 text-center transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
              >
                Launch Panel
                <Brain className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* User Profile Info Card */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] sticky top-24 bg-white/75 relative shadow-md">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-brand-soft p-3 sm:p-4 rounded-2xl sm:rounded-3xl shrink-0">
                  <UserIcon className="text-brand-primary w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-serif text-brand-dark truncate">{profile?.name}</h2>
                  <p className="text-text-muted text-xs sm:text-sm truncate">{profile?.email}</p>
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-primary pl-1">Name</label>
                    <input
                      className="input-field py-2 px-3 text-sm"
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-primary pl-1">College</label>
                    <input
                      className="input-field py-2 px-3 text-sm"
                      value={editForm.college}
                      onChange={e => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                      placeholder="College"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-primary pl-1">Phone</label>
                    <input
                      className="input-field py-2 px-3 text-sm"
                      value={editForm.phone}
                      onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="btn-primary py-2 px-4 flex-1 text-xs sm:text-sm font-semibold">Save Changes</button>
                    <button type="button" onClick={() => setEditing(false)} className="btn-secondary py-2 px-4 text-xs sm:text-sm font-semibold">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-extrabold text-brand-primary/80 mb-1">Affiliation</p>
                    <p className="text-brand-dark text-sm sm:text-base font-semibold leading-relaxed">{profile?.college || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-extrabold text-brand-primary/80 mb-1">Contact Details</p>
                    <p className="text-brand-dark text-sm sm:text-base font-semibold leading-relaxed">{profile?.phone || 'Not specified'}</p>
                  </div>
                  <div className="flex flex-col gap-3 pt-3 border-t border-gray-100/75">
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-brand-primary hover:text-brand-dark transition-colors py-1">
                      <Settings className="w-4 h-4 shrink-0" />
                      Edit Profile Info
                    </button>
                    <button 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-support-chat', { detail: { mode: 'admin' } }));
                      }}
                      className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-600 hover:text-amber-700 transition-colors py-1"
                    >
                      <Headphones className="w-4 h-4 shrink-0" />
                      Talk to Event Admin
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 p-3 sm:p-4 bg-brand-soft rounded-2xl border border-brand-primary/5">
                <p className="text-[9px] uppercase tracking-widest font-extrabold text-brand-primary/80 mb-1.5 text-center">Current Role</p>
                <div className="flex items-center justify-center gap-2 text-brand-dark text-xs sm:text-sm font-bold italic">
                  <Award className="w-4 h-4 text-brand-primary shrink-0" />
                  Chemistry Enthusiast
                </div>
              </div>
            </div>
          </div>

          {/* Registrations List and Schedules */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl font-serif text-brand-dark">My Registered Events</h2>
            
            {loadingRegs ? (
              <div className="space-y-4 sm:space-y-6">
                <RegistrationSkeleton />
                <RegistrationSkeleton />
              </div>
            ) : registrations.length === 0 ? (
              <div className="glass-card p-10 sm:p-14 rounded-[1.8rem] sm:rounded-[3rem] text-center bg-white/70">
                <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-200 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1.5">No Registered Events Yet</h3>
                <p className="text-text-muted text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">You haven't registered any entries yet. Join hands with other scientists to claim your spots!</p>
                <Link to="/register" className="btn-primary inline-flex py-3 px-8 text-sm">Register Now</Link>
              </div>
            ) : (
              registrations.map((reg) => (
                <div key={reg.id} className="glass-card p-5 sm:p-8 rounded-[1.8rem] sm:rounded-[2.5rem] relative overflow-hidden group bg-white/70 shadow-sm border border-gray-100">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-5 transition-opacity pointer-events-none">
                    <Award className="w-24 h-24 sm:w-32 sm:h-32 text-brand-dark" />
                  </div>
                  <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-brand-dark">Registration Form</h3>
                        <div className="bg-brand-soft text-brand-primary px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold ring-1 ring-brand-primary/10">
                          ID: {reg.uniqueCode || '-----'}
                        </div>
                      </div>

                      {reg.paymentStatus === 'approved' && (
                        <div className="mb-4 p-3.5 bg-green-50 border border-green-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                          <div className="flex items-start gap-2.5">
                            <Trophy className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-green-800">Your seat is fully confirmed!</p>
                              <p className="text-[10px] text-green-600 mt-0.5">Please download and show your entry pass on location.</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const docPdf = new jsPDF('l', 'mm', 'a4') as any;
                              docPdf.setDrawColor(220, 38, 38); 
                              docPdf.setLineWidth(2);
                              docPdf.rect(10, 10, 277, 190);
                              docPdf.setFontSize(40);
                              docPdf.text("RASAYAN 2026", 148, 60, { align: 'center' });
                              docPdf.setFontSize(20);
                              docPdf.text("ENTRY PASS & PARTICIPANT VOUCHER", 148, 80, { align: 'center' });
                              docPdf.setFontSize(14);
                              docPdf.text("This is to certify that", 148, 100, { align: 'center' });
                              docPdf.setFontSize(24);
                              docPdf.text(reg.userName || 'Participant', 148, 115, { align: 'center' });
                              docPdf.setFontSize(14);
                              docPdf.text("has successfully registered for Rasayan 2026", 148, 130, { align: 'center' });
                              docPdf.text("Registration code: #" + reg.uniqueCode, 148, 150, { align: 'center' });
                              docPdf.save(`Rasayan_Pass_${reg.uniqueCode}.pdf`);
                            }}
                            className="w-full sm:w-auto bg-green-600 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" /> Download Pass
                          </button>
                        </div>
                      )}
                      
                      {reg.paymentMethod === 'upi' && reg.paymentStatus === 'pending' && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-amber-700 text-xs font-medium">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                          <p>Transaction pending. Verification will take less than 24 working hours to complete.</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {reg.eventIds.map((eid: string) => {
                          const evt = events.find(e => e.id === eid);
                          return (
                            <span key={eid} className="bg-brand-soft text-brand-primary border border-brand-primary/5 text-[11px] px-3 py-1 rounded-full font-bold">
                              {evt?.name || 'Selected Category'}
                            </span>
                          );
                        })}
                      </div>
                      <div className="p-3.5 bg-gray-50/50 rounded-xl border border-gray-100/50 text-xs text-brand-primary/90 italic leading-relaxed">
                        "{reg.confirmationMessage}"
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between items-end md:items-end gap-2 border-t md:border-t-0 border-gray-100/70 pt-4 md:pt-0 shrink-0 text-right">
                      <div className="text-left md:text-right">
                        <p className="text-[9px] uppercase font-extrabold text-text-muted tracking-widest leading-none mb-1">Total Paid</p>
                        <p className="text-lg sm:text-xl font-bold text-brand-dark">₹{reg.totalAmount || 0}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[9px] uppercase font-extrabold text-text-muted tracking-widest leading-none mb-1">Verification</p>
                        {reg.paymentStatus === 'approved' ? (
                          <div className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full inline-flex items-center gap-1 border border-green-200">
                            <Check className="w-3 h-3" />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider">Approved</span>
                          </div>
                        ) : reg.paymentStatus === 'rejected' ? (
                          <div className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full inline-flex items-center gap-1 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider">Rejected</span>
                          </div>
                        ) : (
                          <div className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full inline-flex items-center gap-1 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider">Pending</span>
                          </div>
                        )}
                      </div>

                      {reg.paymentStatus !== 'approved' && (
                        <div className="hidden md:flex bg-blue-50 text-blue-700 p-2 rounded-lg items-start gap-1.5 text-[9px] max-w-[150px] text-left leading-normal">
                          <Info className="w-3 h-3 shrink-0 mt-0.5 text-blue-500" />
                          <p>Volunteers will evaluate your Transaction UTR soon.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* My Community Hub Activity */}
            <div className="pt-8 border-t border-gray-150 space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif text-brand-dark">My Community Activity</h2>
                  <p className="text-text-muted text-[11px] sm:text-xs mt-1">Check your recent messages in the general room and view official broadcasts.</p>
                </div>
                <Link 
                  to="/community" 
                  className="text-xs font-extrabold text-brand-primary hover:text-brand-dark transition-colors flex items-center gap-1.5 bg-brand-soft/60 hover:bg-brand-soft py-2 px-4 rounded-xl border border-brand-primary/10 select-none"
                >
                  Go to Community Hub →
                </Link>
              </div>

              {loadingPosts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="animate-pulse bg-white border border-gray-100 p-6 rounded-[1.8rem] h-36" />
                  <div className="animate-pulse bg-white border border-gray-100 p-6 rounded-[1.8rem] h-36" />
                </div>
              ) : userPosts.length === 0 ? (
                <div className="glass-card p-10 sm:p-14 rounded-[1.8rem] sm:rounded-[3rem] text-center bg-white/70 shadow-sm border border-gray-105">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-bold text-brand-dark mb-1">No Chat Messages Sent</h3>
                  <p className="text-text-muted text-xs mb-6 max-w-sm mx-auto leading-relaxed">
                    You haven't participated in the live general chat room yet. Join the conversation and connect with other conclave chemists!
                  </p>
                  <Link to="/community" className="btn-primary inline-flex py-3 px-6 text-xs bg-brand-primary text-white font-bold tracking-wider rounded-xl shadow-md">
                    Open Community Hub
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {userPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="glass-card bg-white/70 rounded-2xl p-5 border border-gray-105 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300 min-h-[140px] group"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-brand-soft text-brand-primary border-brand-primary/10 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" /> Chat message
                          </span>
                          <span className="text-[9px] text-text-muted font-mono font-medium">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-text-main line-clamp-3 leading-relaxed mt-1 whitespace-pre-wrap font-medium">
                            "{post.text}"
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end items-center mt-4 pt-4 border-t border-gray-100/50">
                        <Link 
                          to="/community" 
                          className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary hover:text-brand-dark transition-colors"
                        >
                          View In Room →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
