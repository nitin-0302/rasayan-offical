import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { db } from '../lib/firebase';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Brain, Map, ArrowRight, Lock, Sparkles, Loader2, Upload, CheckCircle2, Palette, Camera, Video, Smile, Info } from 'lucide-react';
import OnlineSubmissionModal from '../components/OnlineSubmissionModal';
import { Event } from '../constants/events';

export default function Games() {
  const { user } = useAuth();
  const { events } = useEvents();
  
  const [quizLive, setQuizLive] = useState<any>(null);
  const [treasureLive, setTreasureLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any>>({});
  const [selectedUploadEvent, setSelectedUploadEvent] = useState<Event | null>(null);
  const [rulesModalEvent, setRulesModalEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const qQuiz = query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1));
    const unsubQuiz = onSnapshot(qQuiz, (snap) => {
      if (!snap.empty) {
        setQuizLive({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setQuizLive(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'quizzes');
    });
    
    const qHunt = query(collection(db, 'treasure_hunts'), where('isActive', '==', true), limit(1));
    const unsubTreasure = onSnapshot(qHunt, (snap) => {
      if (!snap.empty) {
        setTreasureLive({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setTreasureLive(null);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'treasure_hunts');
    });

    // Listen for user's online submissions
    const fetchSubmissions = () => {
      const qSub = query(collection(db, 'online_submissions'), where('userId', '==', user.uid));
      return onSnapshot(qSub, (snap) => {
        const subMap: Record<string, any> = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.eventId) {
            subMap[data.eventId] = data;
          }
        });
        setUserSubmissions(subMap);
      }, (err) => {
        console.error("Error loading user submissions:", err);
      });
    };

    const unsubSub = fetchSubmissions();

    return () => {
      unsubQuiz();
      unsubTreasure();
      unsubSub();
    };
  }, [user]);

  // Filter all online events from event context
  const onlineEvents = events.filter(e => e.type === 'online');

  const getEventIcon = (evt: Event) => {
    const nameLower = evt.name.toLowerCase();
    if (nameLower.includes('doodle')) return <Palette className="w-7 h-7 text-purple-600" />;
    if (nameLower.includes('photo') || nameLower.includes('vision')) return <Camera className="w-7 h-7 text-emerald-600" />;
    if (nameLower.includes('reel') || nameLower.includes('video')) return <Video className="w-7 h-7 text-pink-600" />;
    if (nameLower.includes('meme')) return <Smile className="w-7 h-7 text-amber-600" />;
    return <Upload className="w-7 h-7 text-brand-primary" />;
  };

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-muted font-bold tracking-widest uppercase text-xs">Scanning Live Arena & Online Competitions...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
        <div className="glass-card p-12 rounded-[2.5rem] shadow-xl border border-gray-100">
          <h2 className="text-3xl font-serif text-brand-dark mb-4">Laboratory Access Restricted</h2>
          <p className="text-text-muted mb-8">Please sign in with Google to view live events and submit data for online competitions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary py-3 px-8 font-bold">Sign In with Google</Link>
            <Link to="/" className="btn-secondary py-3 px-8 font-bold">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4 space-y-16">
        
        {/* Page Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-soft text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest border border-brand-primary/10 shadow-sm">
            <Sparkles className="w-4 h-4 text-brand-primary" /> Live Events & Online Submissions Arena
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-brand-dark font-bold">Panchtatva 2026 Live Arena</h1>
          <p className="text-text-muted max-w-2xl mx-auto italic text-sm sm:text-base">
            Participate in real-time chemistry quizzes, treasure hunts, and submit your creative data for all online competitions.
          </p>
        </header>

        {/* SECTION 1: Interactive Live Games */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200/80 pb-3">
            <h2 className="text-2xl font-serif font-bold text-brand-dark flex items-center gap-2">
              <Brain className="w-6 h-6 text-amber-600" /> Interactive Live Games
            </h2>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Real-time Arena</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quiz Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card p-8 sm:p-10 rounded-[3rem] relative overflow-hidden group border-2 transition-all shadow-md ${
                quizLive?.isActive ? 'border-amber-500 bg-gradient-to-br from-amber-50/40 to-white' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Brain className="w-48 h-48 text-brand-dark" />
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  quizLive?.isActive ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Brain className="w-8 h-8" />
                </div>
                {quizLive?.isActive ? (
                  <span className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-emerald-500/20">
                    Live Now
                  </span>
                ) : (
                  <span className="px-4 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <div className="relative z-10 space-y-4">
                <h3 className="text-3xl font-serif text-brand-dark font-bold">{quizLive?.title || "Green Mind Battle (Quiz)"}</h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed min-h-[3rem] line-clamp-2 italic">
                  {quizLive?.description || "Think fast! Test your speed and eco-intellect in rapid-fire chemistry rounds."}
                </p>

                {quizLive?.isActive ? (
                  <Link 
                    to="/quiz" 
                    className="w-full btn-primary py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.01] shadow-lg shadow-amber-200 cursor-pointer font-bold"
                  >
                    Enter Live Quiz Arena <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-500 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-center text-xs border border-gray-200">
                    Round Schedule Pending (Returning Soon)
                  </div>
                )}
              </div>
            </motion.div>

            {/* Treasure Hunt Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card p-8 sm:p-10 rounded-[3rem] relative overflow-hidden group border-2 transition-all shadow-md ${
                treasureLive?.isActive ? 'border-brand-primary bg-gradient-to-br from-brand-soft/30 to-white' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Map className="w-48 h-48 text-brand-dark" />
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  treasureLive?.isActive ? 'bg-brand-soft text-brand-primary shadow-inner' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Map className="w-8 h-8" />
                </div>
                {treasureLive?.isActive ? (
                  <span className="px-4 py-1.5 bg-brand-primary text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-brand-primary/20">
                    Live Now
                  </span>
                ) : (
                  <span className="px-4 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <div className="relative z-10 space-y-4">
                <h3 className="text-3xl font-serif text-brand-dark font-bold">{treasureLive?.title || "Srishti Rahasya (Treasure Hunt)"}</h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed min-h-[3rem] line-clamp-2 italic">
                  {treasureLive?.description || "Follow the elemental chemical trail across campus to uncover hidden treasures."}
                </p>

                {treasureLive?.isActive ? (
                  <Link 
                    to="/treasure-hunt" 
                    className="w-full btn-primary py-4 rounded-2xl bg-brand-primary hover:bg-brand-dark flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.01] shadow-lg shadow-brand-primary/20 cursor-pointer font-bold"
                  >
                    Start Treasure Hunt <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-500 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-center text-xs border border-gray-200">
                    Treasure Hunt Arena Inactive
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: Online Competitions & Data Submission Hub */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200/80 pb-3">
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-dark flex items-center gap-2">
                <Upload className="w-6 h-6 text-emerald-600" /> Live Online Competitions & Submission Arena
              </h2>
              <p className="text-xs text-text-muted">
                Submit files, photos, reels, artwork, and project links directly for all live online competitions.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-widest rounded-full border border-emerald-200">
              {onlineEvents.length} Active Online Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {onlineEvents.map((evt) => {
              const subData = userSubmissions[evt.id];

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-card p-8 rounded-[3rem] border-2 bg-white transition-all shadow-sm hover:shadow-xl relative flex flex-col justify-between space-y-6 ${
                    subData ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-100'
                  }`}
                >
                  <div>
                    {/* Header bar */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                        {getEventIcon(evt)}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {subData ? (
                          <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1 shadow-md shadow-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Data Uploaded
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full animate-pulse shadow-md shadow-amber-200">
                            Submissions Open
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-text-muted font-bold">
                          Fee: ₹{evt.price}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2">{evt.name}</h3>
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-3 mb-4">
                      {evt.description}
                    </p>

                    {/* Deadline Banner */}
                    {evt.deadline && (
                      <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Deadline:</span>
                        <span className="font-mono font-bold text-brand-primary">{evt.deadline}</span>
                      </div>
                    )}

                    {/* If submitted preview */}
                    {subData && (
                      <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1 mb-4">
                        <div className="flex justify-between items-center font-bold">
                          <span className="flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted Data:
                          </span>
                          <span className="text-[9px] uppercase bg-emerald-200/80 px-2 py-0.5 rounded font-mono">
                            {subData.submissionType === 'link' ? 'URL Link' : 'File Upload'}
                          </span>
                        </div>
                        {subData.caption && (
                          <p className="text-[11px] italic text-emerald-800 line-clamp-1">
                            "{subData.caption}"
                          </p>
                        )}
                        <p className="text-[9px] text-emerald-700 font-mono">
                          Upload Date: {new Date(subData.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setRulesModalEvent(evt)}
                      className="btn-secondary py-3 px-4 text-xs font-bold sm:w-1/3 flex items-center justify-center gap-1.5"
                    >
                      <Info className="w-4 h-4 text-brand-primary" /> Rules
                    </button>

                    <button
                      onClick={() => setSelectedUploadEvent(evt)}
                      className={`py-3 px-6 text-xs font-bold rounded-xl sm:w-2/3 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                        subData 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' 
                          : 'bg-brand-primary hover:bg-brand-dark text-white shadow-brand-primary/20'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {subData ? 'Update Data Upload' : 'Upload Submission Data'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Upload Modal */}
      {selectedUploadEvent && (
        <OnlineSubmissionModal
          event={selectedUploadEvent}
          isOpen={!!selectedUploadEvent}
          onClose={() => setSelectedUploadEvent(null)}
          onSuccess={() => setSelectedUploadEvent(null)}
        />
      )}

      {/* Rules Modal */}
      {rulesModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setRulesModalEvent(null)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              ×
            </button>
            <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2">{rulesModalEvent.name} - Official Rules</h3>
            <p className="text-xs text-text-muted mb-4">{rulesModalEvent.description}</p>
            
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-primary">Guidelines:</h4>
              <ul className="space-y-2 text-xs text-text-muted">
                {rulesModalEvent.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-brand-primary">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRulesModalEvent(null)}
                className="btn-secondary py-2.5 px-6 text-xs font-bold w-1/2"
              >
                Close Rules
              </button>
              <button
                onClick={() => {
                  const target = rulesModalEvent;
                  setRulesModalEvent(null);
                  setSelectedUploadEvent(target);
                }}
                className="btn-primary py-2.5 px-6 text-xs font-bold w-1/2 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
