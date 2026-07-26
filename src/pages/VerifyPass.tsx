import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, AlertTriangle, Search, CheckCircle2, QrCode, Building2, User, Phone, Mail, ArrowLeft, RefreshCw, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EVENTS } from '../constants/events';

interface RegistrationRecord {
  id: string;
  uniqueCode: string;
  userName: string;
  userEmail?: string;
  phone?: string;
  college?: string;
  eventIds: string[];
  totalAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  registrationTime?: string;
  transactionId?: string;
}

export default function VerifyPass() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCode = searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(queryCode);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundRecord, setFoundRecord] = useState<RegistrationRecord | null>(null);
  const [searchedCode, setSearchedCode] = useState('');

  const verifyCode = async (codeToVerify: string) => {
    const cleaned = codeToVerify.trim().replace(/^#?RSN-?/i, '');
    if (!cleaned) return;

    setLoading(true);
    setSearched(true);
    setSearchedCode(codeToVerify.trim());
    setFoundRecord(null);

    try {
      // Search by uniqueCode
      const qCode = query(collection(db, 'registrations'), where('uniqueCode', '==', cleaned));
      const snapCode = await getDocs(qCode);

      if (!snapCode.empty) {
        const doc = snapCode.docs[0];
        setFoundRecord({ id: doc.id, ...doc.data() } as RegistrationRecord);
      } else {
        // Fallback search by doc ID
        try {
          const qId = query(collection(db, 'registrations'), where('id', '==', cleaned));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            const doc = snapId.docs[0];
            setFoundRecord({ id: doc.id, ...doc.data() } as RegistrationRecord);
          }
        } catch {
          // Ignore fallback error
        }
      }
    } catch (err) {
      console.error('Verification query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryCode) {
      setInputCode(queryCode);
      verifyCode(queryCode);
    }
  }, [queryCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setSearchParams({ code: inputCode.trim() });
      verifyCode(inputCode.trim());
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Background Ambient Glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl w-full mx-auto relative z-10 space-y-6 text-center">
        {/* Header */}
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-4 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <QrCode className="w-3.5 h-3.5" />
            Official Entry Pass Verification System
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Rasayan 2026 Ticket Authenticator
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
            Scan an official QR code or enter a participant Registration ID to verify pass validity in real-time.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 p-2 sm:p-3 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter Registration ID (e.g. 54321 or RSN-54321)..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Verify Ticket</span>
          </button>
        </form>

        {/* Verification Outcome Results */}
        <AnimatePresence mode="wait">
          {searched && (
            <motion.div
              key={searchedCode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="text-left"
            >
              {loading ? (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    Querying Rasayan 2026 database for ID #{searchedCode}...
                  </p>
                </div>
              ) : foundRecord ? (
                foundRecord.paymentStatus === 'approved' ? (
                  /* STATE 1: AUTHENTIC & VALID PASS */
                  <div className="bg-gradient-to-br from-slate-900 via-emerald-950/60 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Verification Header Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                            Database Status
                          </span>
                          <h2 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                            <span>AUTHENTIC & VALID PASS</span>
                          </h2>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Official ticket confirmed for Rasayan 2026 Chemistry Festival.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl text-emerald-300 font-mono text-xs font-bold">
                        #RSN-{foundRecord.uniqueCode}
                      </div>
                    </div>

                    {/* Participant Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Participant Name
                        </span>
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                          <User className="w-4 h-4 text-emerald-400" />
                          <span>{foundRecord.userName}</span>
                        </p>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Institution
                        </span>
                        <p className="text-sm font-bold text-slate-200 flex items-center gap-1.5 truncate">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span>{foundRecord.college || 'K J Somaiya College'}</span>
                        </p>
                      </div>

                      {foundRecord.userEmail && (
                        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Email Address
                          </span>
                          <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{foundRecord.userEmail}</span>
                          </p>
                        </div>
                      )}

                      {foundRecord.phone && (
                        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Contact Number
                          </span>
                          <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{foundRecord.phone}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Registered Events */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Registered Events
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {foundRecord.eventIds.map((eid, idx) => {
                          const e = EVENTS.find(item => item.id === eid);
                          return (
                            <span
                              key={idx}
                              className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold px-3 py-1 rounded-lg"
                            >
                              {e?.name || eid}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Security Stamp */}
                    <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-emerald-400/80 font-mono">
                      <p className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Verified by K J Somaiya Rasayan 2026 Security Core
                      </p>
                      <span>Timestamp: {foundRecord.registrationTime ? new Date(foundRecord.registrationTime).toLocaleDateString() : 'Dec 2026'}</span>
                    </div>
                  </div>
                ) : (
                  /* STATE 2: PENDING APPROVAL PASS */
                  <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                          Database Status
                        </span>
                        <h2 className="text-xl font-bold text-amber-300">
                          REGISTRATION PENDING APPROVAL
                        </h2>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Registration record exists, but payment status is still marked as pending verification.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-950/40 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200 space-y-2">
                      <p className="font-bold text-amber-300">Participant: {foundRecord.userName} (#{foundRecord.uniqueCode})</p>
                      <p>
                        Entry pass is currently <span className="underline font-bold">inactive</span>. Participant must present payment proof at the Registration Desk for manual approval before entry is granted.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                /* STATE 3: FAKE OR INVALID PASS DETECTED! */
                <div className="bg-gradient-to-br from-red-950 via-slate-950 to-red-950 border-2 border-red-500/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-xl shadow-red-500/30 shrink-0 animate-pulse">
                      <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">
                        Security Alert
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-red-400 tracking-wide">
                        🚨 WARNING: FAKE OR INVALID ENTRY PASS!
                      </h2>
                      <p className="text-xs text-red-200 font-medium mt-1">
                        The queried Registration ID <span className="font-mono bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded border border-red-500/40">#{searchedCode}</span> does NOT exist in the official Rasayan 2026 database.
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-950/80 border border-red-500/40 p-4 rounded-xl space-y-2 text-xs text-red-200">
                    <p className="font-bold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      Possible Counterfeit / Unregistered Ticket
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>This entry pass may have been tampered with or modified.</li>
                      <li>No matching registration record was found for ID #{searchedCode}.</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-red-500/30 flex items-center justify-between text-[11px] text-red-300 font-mono">
                    <span>SECURITY INSTRUCTION:</span>
                    <span className="font-bold text-red-400">Do NOT grant event entry</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
