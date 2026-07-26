import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, orderBy, query, doc, updateDoc, onSnapshot, setDoc, writeBatch, deleteDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useEvents } from '../context/EventContext';
import { motion } from 'motion/react';
import { Shield, Users, Filter, Download, FileText, Table as TableIcon, CheckCircle, XCircle, Clock, CreditCard, Brain, Trash2, Plus, Save, Play, Square, Map, Key, Trophy, MessageSquare, Send, Sparkles, Flag, AlertTriangle, QrCode, FileSpreadsheet, ExternalLink, RefreshCw, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';

import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function Admin() {
  const { isAdmin, isCoAdmin, loading: authLoading, googleToken, login } = useAuth();
  const { events, updateEvent, addEvent, deleteEvent } = useEvents();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'registrations' | 'quiz' | 'treasure' | 'events' | 'announcements' | 'support' | 'chat' | 'gsheets'>('registrations');

  // Google Sheets integration state
  const [sheetIdInput, setSheetIdInput] = useState<string>(() => localStorage.getItem('rasayan_gsheet_id') || '');
  const [activeSheetId, setActiveSheetId] = useState<string | null>(() => localStorage.getItem('rasayan_gsheet_id') || null);
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('rasayan_gsheet_id');
    return saved ? `https://docs.google.com/spreadsheets/d/${saved}/edit` : null;
  });
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetStatusMsg, setSheetStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateNewGoogleSheet = async () => {
    setIsCreatingSheet(true);
    setSheetStatusMsg(null);
    try {
      let token = googleToken;
      if (!token) {
        token = await login(true);
      }
      if (!token) {
        throw new Error("Google authentication is required to create a Google Sheet. Please sign in with Google.");
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/gsheets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accessToken: token })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create Google Sheet.");
      }

      localStorage.setItem('rasayan_gsheet_id', data.spreadsheetId);
      localStorage.setItem('rasayan_gsheet_token', token);
      setActiveSheetId(data.spreadsheetId);
      setActiveSheetUrl(data.spreadsheetUrl);
      setSheetIdInput(data.spreadsheetId);

      // Immediately sync current registrations to newly created sheet
      if (registrations.length > 0) {
        const syncRes = await fetch(`${apiBase}/api/gsheets/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            accessToken: token,
            spreadsheetId: data.spreadsheetId,
            registrations: registrations.map(r => ({
              uniqueCode: r.uniqueCode,
              userName: r.userName,
              userEmail: r.userEmail,
              phone: r.phone,
              college: r.college,
              eventNames: Array.isArray(r.eventNames) ? r.eventNames : (Array.isArray(r.eventIds) ? r.eventIds : [r.events || 'N/A']),
              totalAmount: r.totalAmount,
              paymentMethod: r.paymentMethod,
              transactionId: r.transactionId,
              paymentStatus: r.paymentStatus,
              registrationTime: r.registrationTime
            }))
          })
        });
        const syncData = await syncRes.json();
        if (syncRes.ok && syncData.success) {
          setSheetStatusMsg({
            type: 'success',
            text: `Created "Rasayan 2026 - Participant Registrations" sheet and transferred ${syncData.updatedCount} participant records!`
          });
        } else {
          setSheetStatusMsg({
            type: 'success',
            text: `Google Sheet created successfully! ID: ${data.spreadsheetId}`
          });
        }
      } else {
        setSheetStatusMsg({
          type: 'success',
          text: `Google Sheet created successfully! Ready to accept new registrations.`
        });
      }
    } catch (err: any) {
      console.error("Create Google Sheet error:", err);
      setSheetStatusMsg({
        type: 'error',
        text: err.message || "Could not create Google Sheet. Please ensure popups and Drive permissions are allowed."
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSyncAllRegistrationsToSheet = async () => {
    setIsSyncingSheet(true);
    setSheetStatusMsg(null);
    try {
      const targetId = activeSheetId || sheetIdInput.trim();
      if (!targetId) {
        throw new Error("Please enter or create a Google Sheet ID first.");
      }

      let token = googleToken || localStorage.getItem('rasayan_gsheet_token');
      if (!token) {
        token = await login(true);
      }
      if (!token) {
        throw new Error("Google Sign-In required to authenticate with Google Sheets.");
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/gsheets/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken: token,
          spreadsheetId: targetId,
          registrations: registrations.map(r => ({
            uniqueCode: r.uniqueCode,
            userName: r.userName,
            userEmail: r.userEmail,
            phone: r.phone,
            college: r.college,
            eventNames: Array.isArray(r.eventNames) ? r.eventNames : (Array.isArray(r.eventIds) ? r.eventIds : [r.events || 'N/A']),
            totalAmount: r.totalAmount,
            paymentMethod: r.paymentMethod,
            transactionId: r.transactionId,
            paymentStatus: r.paymentStatus,
            registrationTime: r.registrationTime
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sync records to Google Sheets.");
      }

      localStorage.setItem('rasayan_gsheet_id', targetId);
      localStorage.setItem('rasayan_gsheet_token', token);
      setActiveSheetId(targetId);
      setActiveSheetUrl(data.spreadsheetUrl);

      setSheetStatusMsg({
        type: 'success',
        text: `Transferred ${data.updatedCount} participant records directly to Google Sheet!`
      });
    } catch (err: any) {
      console.error("Sync Google Sheet error:", err);
      setSheetStatusMsg({
        type: 'error',
        text: err.message || "Failed to sync to Google Sheets."
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleConnectExistingSheet = (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    localStorage.setItem('rasayan_gsheet_id', cleanId);
    setActiveSheetId(cleanId);
    setActiveSheetUrl(`https://docs.google.com/spreadsheets/d/${cleanId}/edit`);
    setSheetStatusMsg({
      type: 'success',
      text: `Connected to Google Sheet ID: ${cleanId}. Click "Sync Now" to transfer records.`
    });
  };

  // Events editing state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEventForm, setEditingEventForm] = useState<any>(null);
  const [eventSaveSuccess, setEventSaveSuccess] = useState<string | null>(null);
  const [eventSaveError, setEventSaveError] = useState<string | null>(null);

  const startEditingEvent = (evt: any) => {
    setSelectedEventId(evt.id);
    setEditingEventForm({
      name: evt.name || '',
      category: evt.category || '',
      description: evt.description || '',
      price: evt.price || 0,
      winners: evt.winners || '',
      deadline: evt.deadline || '',
      date: evt.date || '',
      type: evt.type || 'offline',
      isTeam: evt.isTeam || false,
      minTeamSize: evt.minTeamSize || 1,
      maxTeamSize: evt.maxTeamSize || 1,
      headName: evt.headName || '',
      headPhone: evt.headPhone || '',
      rules: evt.rules ? [...evt.rules] : []
    });
    setEventSaveSuccess(null);
    setEventSaveError(null);
  };

  const handleCreateNewEvent = async () => {
    if (isReadOnly) return;
    const newId = `custom-evt-${Date.now()}`;
    const newEvt = {
      id: newId,
      name: 'New Custom Competition',
      category: 'Panchtatva Special',
      description: 'Exciting new chemistry challenge! Add full description and rules here.',
      price: 50,
      type: 'offline' as const,
      isTeam: false,
      minTeamSize: 1,
      maxTeamSize: 1,
      winners: '₹1,000 + Certificate',
      date: 'December 16, 2026',
      rules: ['Follow all fest guidelines.', 'Decisions of judges will be final.'],
      headName: 'Faculty Coordinator',
      headPhone: '+91 9876543210'
    };
    try {
      await addEvent(newEvt);
      startEditingEvent(newEvt);
      setEventSaveSuccess("New competition created successfully! Edit details below.");
    } catch (err: any) {
      console.error(err);
      setEventSaveError("Failed to create new event.");
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (isReadOnly) return;
    if (!window.confirm(`ARE YOU SURE? Permanently delete competition "${eventName}"? This action CANNOT be undone.`)) return;
    try {
      await deleteEvent(eventId);
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
        setEditingEventForm(null);
      }
      setEventSaveSuccess(`Event "${eventName}" deleted successfully.`);
      setTimeout(() => setEventSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setEventSaveError("Failed to delete event.");
    }
  };

  const saveEventChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !editingEventForm) return;
    try {
      await updateEvent(selectedEventId, {
        name: editingEventForm.name,
        category: editingEventForm.category,
        description: editingEventForm.description,
        price: Number(editingEventForm.price),
        winners: editingEventForm.winners,
        deadline: editingEventForm.deadline || '',
        date: editingEventForm.date || '',
        type: editingEventForm.type,
        isTeam: editingEventForm.isTeam,
        minTeamSize: Number(editingEventForm.minTeamSize || 1),
        maxTeamSize: Number(editingEventForm.maxTeamSize || 1),
        headName: editingEventForm.headName || '',
        headPhone: editingEventForm.headPhone || '',
        rules: editingEventForm.rules
      });
      setEventSaveSuccess("Event updated successfully!");
      setTimeout(() => setEventSaveSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setEventSaveError("Failed to update event details on Firestore.");
    }
  };

  const handleRuleChange = (index: number, value: string) => {
    const updatedRules = [...editingEventForm.rules];
    updatedRules[index] = value;
    setEditingEventForm({ ...editingEventForm, rules: updatedRules });
  };

  const handleAddRule = () => {
    setEditingEventForm({ ...editingEventForm, rules: [...editingEventForm.rules, ''] });
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = editingEventForm.rules.filter((_: any, i: number) => i !== index);
    setEditingEventForm({ ...editingEventForm, rules: updatedRules });
  };

  const isAtLeastCoAdmin = isAdmin || isCoAdmin;
  const isReadOnly = isCoAdmin && !isAdmin;

  // Support Chat State
  const [allSupportMessages, setAllSupportMessages] = useState<any[]>([]);
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Direct Priority Message to Participant State
  const [showDirectDialog, setShowDirectDialog] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [selectedDirectParticipant, setSelectedDirectParticipant] = useState<any | null>(null);
  const [directMsgText, setDirectMsgText] = useState('');
  const [sendAsPriority, setSendAsPriority] = useState(true);

  // Quiz State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizConfig, setQuizConfig] = useState<any>(null);
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
  const [quizMetadata, setQuizMetadata] = useState({ title: '', description: '' });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Treasure Hunt State
  const [hunts, setHunts] = useState<any[]>([]);
  const [selectedHuntId, setSelectedHuntId] = useState<string | null>(null);
  const [treasureConfig, setTreasureConfig] = useState<any>(null);
  const [treasureProgress, setTreasureProgress] = useState<any[]>([]);
  const [newClue, setNewClue] = useState({ clue: '', code: '' });
  const [treasureMetadata, setTreasureMetadata] = useState({ title: '', description: '', penaltyTime: 300 });
  const [editingClueIndex, setEditingClueIndex] = useState<number | null>(null);

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const sendAnnouncement = async () => {
    if (!announcementMsg.trim()) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        message: announcementMsg.trim(),
        type: announcementType,
        createdAt: Date.now()
      });
      setAnnouncementMsg('');
      alert("Broadcast sent!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Delete this broadcast history?")) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const handleDismissReports = async (postId: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to dismiss all reports for this message? This marks it as safe.")) return;
    try {
      await updateDoc(doc(db, 'community_chat', postId), {
        reported: false,
        reportsCount: 0,
        reports: []
      });
      alert("Message reports dismissed successfully.");
    } catch (err: any) {
      console.error("Dismiss reports error:", err);
      alert("Failed to dismiss reports: " + err.message);
    }
  };

  const handleDeleteRasagramPost = async (postId: string) => {
    if (isReadOnly) {
      alert("Permission denied. Read-only administrator mode.");
      return;
    }
    if (!window.confirm("CRITICAL: Are you sure you want to permanently delete this message from Community Chat? This action is IRREVERSIBLE.")) return;
    try {
      await deleteDoc(doc(db, 'community_chat', postId));
      alert("Message deleted successfully.");
    } catch (err: any) {
      console.error("Delete Chat Message error:", err);
      alert("Failed to delete message: " + err.message);
    }
  };

  // Registration Editing
  const [editingReg, setEditingReg] = useState<any>(null);
  const [fullscreenBoard, setFullscreenBoard] = useState<'none' | 'quiz' | 'treasure'>('none');
  const [reportedPosts, setReportedPosts] = useState<any[]>([]);

  useEffect(() => {
    if (isAtLeastCoAdmin) {
      // Basic registrations (Always needed for the dashboard stats)
      const q = query(collection(db, 'registrations'), orderBy('registrationTime', 'desc'));
      const unsubRegs = onSnapshot(q, (snap) => {
        setRegistrations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (err) => {
        console.error("Registrations Error:", err);
        setLoading(false);
      });

      const qAnnounce = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubAnnounce = onSnapshot(qAnnounce, (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listen for reported posts
      const qReported = query(collection(db, 'community_chat'), where('reported', '==', true));
      const unsubReported = onSnapshot(qReported, (snap) => {
        setReportedPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("Reported Messages Error:", err);
      });

      return () => {
        unsubRegs();
        unsubAnnounce();
        unsubReported();
      };
    }
  }, [isAtLeastCoAdmin]);

  // Tab specific listeners for performance
  useEffect(() => {
    if (!isAtLeastCoAdmin) return;

    let unsubAnnouncements = () => {};
    let unsubQuizzes = () => {};
    let unsubHunts = () => {};
    let unsubRes = () => {};
    let unsubTreasureProgress = () => {};

    if (activeTab === 'announcements') {
      unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp));
      });
    }

    if (activeTab === 'quiz' || fullscreenBoard === 'quiz') {
      unsubQuizzes = onSnapshot(collection(db, 'quizzes'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setQuizzes(list);
        setSelectedQuizId(prev => {
          if (prev) return prev;
          if (list.length > 0) {
            const active = list.find(q => q.isActive);
            return active?.id || list[0].id;
          }
          return null;
        });
      });

      unsubRes = onSnapshot(collection(db, 'quiz_responses'), (snap) => {
        setQuizResponses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    if (activeTab === 'treasure' || fullscreenBoard === 'treasure') {
      unsubHunts = onSnapshot(collection(db, 'treasure_hunts'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setHunts(list);
        setSelectedHuntId(prev => {
          if (prev) return prev;
          if (list.length > 0) {
            const active = list.find(h => h.isActive);
            return active?.id || list[0].id;
          }
          return null;
        });
      });

      unsubTreasureProgress = onSnapshot(collection(db, 'treasure_hunt_progress'), (snap) => {
        setTreasureProgress(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    let unsubSupport = () => {};
    if (activeTab === 'support' || activeTab === 'registrations') {
      unsubSupport = onSnapshot(
        query(collection(db, 'support_messages'), orderBy('timestamp', 'asc')),
        (snap) => {
          setAllSupportMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      );
    }

    return () => {
      unsubAnnouncements();
      unsubQuizzes();
      unsubHunts();
      unsubRes();
      unsubTreasureProgress();
      unsubSupport();
    };
  }, [isAtLeastCoAdmin, activeTab, fullscreenBoard]);

  useEffect(() => {
    if (selectedQuizId) {
      return onSnapshot(doc(db, 'quizzes', selectedQuizId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setQuizConfig(data);
          setQuizMetadata({ title: data.title || '', description: data.description || '' });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `quizzes/${selectedQuizId}`);
      });
    }
  }, [selectedQuizId]);

  useEffect(() => {
    if (selectedHuntId) {
      return onSnapshot(doc(db, 'treasure_hunts', selectedHuntId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setTreasureConfig(data);
          setTreasureMetadata({ 
            title: data.title || '', 
            description: data.description || '',
            penaltyTime: data.penaltyTime || 300
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `treasure_hunts/${selectedHuntId}`);
      });
    }
  }, [selectedHuntId]);

  if (authLoading || loading) {
    return (
      <div className="pt-32 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!isAtLeastCoAdmin) {
    return (
      <div className="pt-32 text-center text-red-500 font-bold">
        Access Denied. Admins Only.
      </div>
    );
  }

  // Quiz Management Actions
  const createNewQuiz = async () => {
    const newQuiz = {
      title: 'New Quiz Event',
      description: 'Ready to test your skills?',
      questions: [],
      isActive: false,
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = doc(collection(db, 'quizzes'));
      await setDoc(docRef, newQuiz);
      setSelectedQuizId(docRef.id);
      alert("New quiz created!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'quizzes');
    }
  };

  const deleteQuiz = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    if (!window.confirm("Are you sure you want to delete this WHOLE quiz? All questions and metadata will be PERMANENTLY lost. (Responses will remain)")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuizId));
      setSelectedQuizId(null);
      alert("Quiz deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `quizzes/${selectedQuizId}`);
    }
  };

  const openLobbyAndReset = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    if (!window.confirm("This will clear ALL previous scores/responses for this quiz, create a brand-new live session, and open the player lobby. Ready?")) return;
    try {
      // Get previous response docs for this specific quiz
      const snap = await getDocs(query(collection(db, 'quiz_responses'), where('quizId', '==', selectedQuizId)));
      const batch = writeBatch(db);

      // 1. Delete previous responses
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });

      // 2. Deactivate all other quizzes
      quizzes.forEach(q => {
        if (q.id !== selectedQuizId && q.isActive) {
          batch.update(doc(db, 'quizzes', q.id), { isActive: false, status: 'inactive' });
        }
      });
      
      // 3. Set this quiz to active, lobby state, and generate a new sessionId
      const newSessionId = Date.now().toString();
      batch.update(doc(db, 'quizzes', selectedQuizId), { 
        isActive: true, 
        status: 'lobby', 
        sessionId: newSessionId 
      });

      // Commit atomically in a single batch (avoids empty-batch runtime exceptions)
      await batch.commit();
      alert("New Live Lobby activated! Players can now join.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const startQuizAnswers = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      await updateDoc(quizRef, { status: 'playing' });
      alert("Quiz has been started! Countdown activated for players.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const activateQuizWithoutReset = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    try {
      const batch = writeBatch(db);
      // Deactivate all other quizzes
      quizzes.forEach(q => {
        if (q.id !== selectedQuizId && q.isActive) {
          batch.update(doc(db, 'quizzes', q.id), { isActive: false, status: 'inactive' });
        }
      });
      // Set this quiz as active, keeping existing status/session or setting to 'lobby' if not set
      batch.update(doc(db, 'quizzes', selectedQuizId), { 
        isActive: true,
        status: quizConfig?.status || 'lobby',
        sessionId: quizConfig?.sessionId || Date.now().toString()
      });
      await batch.commit();
      alert("Quiz activated successfully!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const deactivateQuiz = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      await updateDoc(quizRef, { isActive: false, status: 'inactive' });
      alert("Quiz deactivated.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const saveQuizMetadata = async () => {
    if (!selectedQuizId) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      await setDoc(quizRef, { ...quizConfig, ...quizMetadata }, { merge: true });
      alert("Quiz details updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const addQuestion = async () => {
    if (!selectedQuizId) return;
    if (!newQuestion.text || newQuestion.options.some(o => !o)) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      let updatedQuestions;
      if (editingQuestionIndex !== null) {
        updatedQuestions = [...(quizConfig?.questions || [])];
        updatedQuestions[editingQuestionIndex] = newQuestion;
        setEditingQuestionIndex(null);
      } else {
        updatedQuestions = [...(quizConfig?.questions || []), newQuestion];
      }
      await updateDoc(quizRef, { questions: updatedQuestions });
      setNewQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const startEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
    setNewQuestion(quizConfig.questions[index]);
  };

  const deleteQuestion = async (index: number) => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    if (!window.confirm("ARE YOU SURE? Delete this question?")) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      const updatedQuestions = quizConfig.questions.filter((_: any, i: number) => i !== index);
      await updateDoc(quizRef, { questions: updatedQuestions });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const clearResponses = async () => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? This will clear ALL results for ALL quizzes FOREVER! Proceed?")) return;
    try {
      const snap = await getDocs(collection(db, 'quiz_responses'));
      if (snap.empty) {
        alert("No quiz responses found to clear.");
        return;
      }
      
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      
      alert("All quiz responses cleared!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'quiz_responses');
    }
  };

  // Treasure Hunt Actions
  const createNewHunt = async () => {
    const newHunt = {
      title: 'New Treasure Hunt',
      description: 'The search begins!',
      clues: [],
      isActive: false,
      penaltyTime: 300,
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = doc(collection(db, 'treasure_hunts'));
      await setDoc(docRef, newHunt);
      setSelectedHuntId(docRef.id);
      alert("New treasure hunt created!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'treasure_hunts');
    }
  };

  const deleteHunt = async () => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    if (!window.confirm("Are you sure you want to delete this WHOLE treasure hunt? All clues and metadata will be PERMANENTLY lost.")) return;
    try {
      await deleteDoc(doc(db, 'treasure_hunts', selectedHuntId));
      setSelectedHuntId(null);
      alert("Treasure hunt deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const openTreasureLobby = async () => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    if (!window.confirm("This will clear ALL previous treasure hunt progress, and open the player lobby. Ready?")) return;
    try {
      // 1. Get and delete previous progress docs for this hunt
      const snap = await getDocs(collection(db, 'treasure_hunt_progress'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        if (d.data().huntId === selectedHuntId) {
          batch.delete(d.ref);
        }
      });

      // 2. Deactivate all other hunts
      hunts.forEach(h => {
        if (h.id !== selectedHuntId && h.isActive) {
          batch.update(doc(db, 'treasure_hunts', h.id), { isActive: false, status: 'inactive' });
        }
      });

      // 3. Mark active and status = 'lobby'
      batch.update(doc(db, 'treasure_hunts', selectedHuntId), { 
        isActive: true, 
        status: 'lobby' 
      });

      await batch.commit();
      alert("New Treasure Hunt Lobby opened! Teams can now register and join.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const startTreasureHunt = async () => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    try {
      const huntRef = doc(db, 'treasure_hunts', selectedHuntId);
      await updateDoc(huntRef, { status: 'playing', isActive: true });
      alert("Treasure hunt started! The game clock is now running for players.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const deactivateTreasure = async () => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    try {
      const huntRef = doc(db, 'treasure_hunts', selectedHuntId);
      await updateDoc(huntRef, { isActive: false, status: 'inactive' });
      alert("Treasure hunt deactivated.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const saveTreasureMetadata = async () => {
    if (!selectedHuntId) return;
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      await setDoc(treasureRef, { ...treasureConfig, ...treasureMetadata }, { merge: true });
      alert("Treasure Hunt details updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const addClue = async () => {
    if (!selectedHuntId) return;
    if (!newClue.clue || !newClue.code) return;
    if (newClue.code.length !== 5) {
      alert("Code must be 5 digits");
      return;
    }
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      let updatedClues;
      if (editingClueIndex !== null) {
        updatedClues = [...(treasureConfig?.clues || [])];
        updatedClues[editingClueIndex] = newClue;
        setEditingClueIndex(null);
      } else {
        updatedClues = [...(treasureConfig?.clues || []), newClue];
      }
      await updateDoc(treasureRef, { clues: updatedClues });
      setNewClue({ clue: '', code: '' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const startEditClue = (index: number) => {
    setEditingClueIndex(index);
    setNewClue(treasureConfig.clues[index]);
  };

  const deleteClue = async (index: number) => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    if (!window.confirm("ARE YOU SURE? Delete this clue?")) return;
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      const updatedClues = treasureConfig.clues.filter((_: any, i: number) => i !== index);
      await updateDoc(treasureRef, { clues: updatedClues });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const clearTreasureProgress = async () => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? This will clear ALL progress for ALL participants FOREVER! Proceed?")) return;
    try {
      const snap = await getDocs(collection(db, 'treasure_hunt_progress'));
      if (snap.empty) {
        alert("No treasure hunt progress found to clear.");
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();

      alert("All treasure hunt progress cleared!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'treasure_hunt_progress');
    }
  };

  const deleteResponse = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this participant's result FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'quiz_responses', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `quiz_responses/${id}`);
    }
  };

  const deleteProgress = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this participant's treasure hunt progress FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'treasure_hunt_progress', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `treasure_hunt_progress/${id}`);
    }
  };

  const handleUpdateRegDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    try {
      await updateDoc(doc(db, 'registrations', editingReg.id), {
        userName: editingReg.userName,
        userEmail: editingReg.userEmail,
        phone: editingReg.phone,
        college: editingReg.college,
        transactionId: editingReg.transactionId,
        uniqueCode: editingReg.uniqueCode
      });
      setEditingReg(null);
      alert("Registration updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${editingReg.id}`);
    }
  };

  const filtered = registrations.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchesEvent = !filter || r.eventIds?.includes(filter);
    const matchesSearch = !searchTerm || 
      (r.userName || '').toLowerCase().includes(s) || 
      (r.userEmail || '').toLowerCase().includes(s) ||
      (r.college || '').toLowerCase().includes(s) ||
      (r.phone || '').includes(searchTerm) ||
      (r.transactionId || '').toLowerCase().includes(s) ||
      (r.uniqueCode || '').toLowerCase().includes(s);
    return matchesEvent && matchesSearch;
  });

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (isReadOnly) return;
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete the registration for ${name}? This cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'registrations', id));
      alert("Registration deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const clearAllRegistrations = async () => {
    if (isReadOnly) return;
    if (!window.confirm("CRITICAL: This will delete ALL participant registrations. This action CANNOT be undone. Proceed?")) return;
    if (!window.confirm("FINAL WARNING: Are you absolutely sure?")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      registrations.forEach((reg) => {
        batch.delete(doc(db, 'registrations', reg.id));
      });
      await batch.commit();
      alert("All registration data cleared successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'registrations');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (regId: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { paymentStatus: status });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  };

  const toggleAttended = async (regId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { attended: !currentStatus });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  };

  const sendSupportReply = async () => {
    if (!selectedUserChat || !replyText.trim()) return;
    try {
      await addDoc(collection(db, 'support_messages'), {
        userId: selectedUserChat,
        text: replyText.trim(),
        sender: 'admin',
        timestamp: serverTimestamp(),
        isRead: true // Admin reading/writing is always read
      });
      setReplyText('');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'support_messages');
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectParticipant || !directMsgText.trim()) return;

    try {
      const targetUserId = selectedDirectParticipant.userId;
      const targetUserName = selectedDirectParticipant.userName || 'Participant';

      // 1. Send inside regular support messages of user so they have it in history
      await addDoc(collection(db, 'support_messages'), {
        userId: targetUserId,
        userName: targetUserName,
        text: directMsgText.trim(),
        sender: 'admin',
        timestamp: serverTimestamp(),
        isRead: true
      });

      // 2. If priority is checked, write to the priority alerts collection
      if (sendAsPriority) {
        await addDoc(collection(db, 'priority_alerts'), {
          recipientUserId: targetUserId,
          text: directMsgText.trim(),
          senderName: 'Adviser Office',
          timestamp: new Date().toISOString()
        });
      }

      alert(`Alert successfully dispatched to ${targetUserName}!`);
      setDirectMsgText('');
      setParticipantSearchQuery('');
      setSelectedDirectParticipant(null);
      setShowDirectDialog(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send: " + err.message);
    }
  };

  const deleteSupportChat = async (userId: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this entire chat history?")) return;
    try {
      const chatMsgs = allSupportMessages.filter(m => m.userId === userId);
      const batch = writeBatch(db);
      chatMsgs.forEach(m => {
        batch.delete(doc(db, 'support_messages', m.id));
      });
      await batch.commit();
      setSelectedUserChat(null);
      alert("Chat history deleted.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'support_messages');
    }
  };

  const totalRevenue = registrations
    .filter(r => r.paymentStatus === 'approved')
    .reduce((acc, r) => acc + (r.totalAmount || 0), 0);

  const pendingCount = registrations.filter(r => r.paymentStatus === 'pending' || !r.paymentStatus).length;

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name", "Email", "Phone", "ID", "College", "Events", "Time"].join(",") + "\n"
      + filtered.map(r => [
          r.userName, 
          r.userEmail, 
          r.phone, 
          r.uniqueCode || '-',
          r.college, 
          r.eventIds.map((eid: string) => events.find(e => e.id === eid)?.name).join(" | "), 
          r.registrationTime
        ].join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "rasayan_registrations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const data = filtered.map(r => ({
      Name: r.userName,
      Email: r.userEmail,
      Phone: r.phone,
      RegID: r.uniqueCode || '-',
      College: r.college,
      Events: r.eventIds.map((eid: string) => events.find(e => e.id === eid)?.name).join(", "),
      RegisteredAt: new Date(r.registrationTime).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
    XLSX.writeFile(workbook, "rasayan_registrations.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("Rasayan 2026 Registration Report", 14, 15);
    
    const tableData = filtered.map(r => [
      r.userName,
      r.userEmail,
      r.uniqueCode || '-',
      r.college,
      r.eventIds.map((eid: string) => events.find(e => e.id === eid)?.name).join("\n"),
      new Date(r.registrationTime).toLocaleDateString()
    ]);

    doc.autoTable({
      head: [['Name', 'Email', 'ID', 'College', 'Events', 'Date']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] } // Red theme
    });

    doc.save("rasayan_registrations.pdf");
  };

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Quick Check-in Simulation */}
        <div className="mb-8 glass-card p-6 rounded-[2rem] border-l-8 border-brand-primary flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-serif text-brand-dark mb-1">On-Desk Check-in</h3>
            <p className="text-xs text-text-muted">Enter Participant ID (e.g. 12345) to quickly mark attendance.</p>
          </div>
          <div className="flex-1 w-full flex gap-2">
            <input 
              type="text" 
              placeholder="Enter ID #..." 
              id="checkin_input"
              className="input-field text-center font-mono tracking-widest text-lg"
              maxLength={5}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  const reg = registrations.find(r => r.uniqueCode === val);
                  if (reg) {
                    await toggleAttended(reg.id, !!reg.attended);
                    alert(`Status updated for ${reg.userName}`);
                    (e.target as HTMLInputElement).value = '';
                  } else {
                    alert("ID not found!");
                  }
                }
              }}
            />
            <button 
              onClick={async () => {
                const el = document.getElementById('checkin_input') as HTMLInputElement;
                const reg = registrations.find(r => r.uniqueCode === el.value);
                if (reg) {
                  await toggleAttended(reg.id, !!reg.attended);
                  alert(`Status updated for ${reg.userName}`);
                  el.value = '';
                } else {
                  alert("ID not found!");
                }
              }}
              className="btn-primary whitespace-nowrap"
            >
              Check-in
            </button>
          </div>
        </div>

        {/* Header and Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-serif text-brand-dark flex items-center gap-3">
              <Shield className="text-red-600" />
              Admin Command Center
              {isReadOnly && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-amber-200 ml-4">Limited Access Mode</span>}
            </h1>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('registrations')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'registrations' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Registrations
              </button>
              <button 
                onClick={() => setActiveTab('quiz')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'quiz' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Live Quiz Control
              </button>
              <button 
                onClick={() => setActiveTab('treasure')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'treasure' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Treasure Hunt
              </button>
              <button 
                onClick={() => setActiveTab('announcements')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'announcements' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Announcements
              </button>
              <button 
                onClick={() => setActiveTab('events')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'events' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Event Prices & Details
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'support' ? 'border-amber-500 text-amber-600' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Support Chat
                {allSupportMessages.filter(m => !m.isRead && m.sender === 'user').length > 0 && (
                  <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                    {allSupportMessages.filter(m => !m.isRead && m.sender === 'user').length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'chat' ? 'border-red-500 text-red-600' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Chat Reports
                {reportedPosts.length > 0 && (
                  <span className="bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                    {reportedPosts.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('gsheets')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'gsheets' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Google Sheets
                {activeSheetId && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sheet Active" />
                )}
              </button>
            </div>
          </div>

          {activeTab === 'registrations' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest text-right">Transfer & Export Reports</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setActiveTab('gsheets')} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-200 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Google Sheets Sync
                </button>
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm">
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button onClick={exportExcel} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm !border-green-600 !text-green-600 hover:bg-green-50">
                  <TableIcon className="w-4 h-4" />
                  Excel
                </button>
                <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm !border-red-600 !text-red-600 hover:bg-red-50">
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <div className="w-px h-10 bg-gray-200 mx-2 hidden md:block" />
                {!isReadOnly && (
                  <button 
                    onClick={clearAllRegistrations}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    CLEAR ALL DATA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'registrations' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                <div className="bg-brand-soft p-3 rounded-2xl"><Users className="text-brand-primary" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{registrations.length}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Total Participants</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4 border-l-4 border-green-500">
                <div className="bg-green-100 p-3 rounded-2xl"><CreditCard className="text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">₹{totalRevenue}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Confirmed Revenue</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4 border-l-4 border-amber-500">
                <div className="bg-amber-100 p-3 rounded-2xl"><Clock className="text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{pendingCount}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Pending Verification</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 md:p-6 rounded-[2rem] mb-10 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="input-field"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-primary shrink-0" />
                <select 
                  value={filter} 
                  onChange={e => setFilter(e.target.value)}
                  className="flex-1 md:w-auto px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-brand-primary transition-all text-sm font-medium"
                >
                  <option value="">All Events</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Participant & ID</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">College</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Events & Revenue</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Payment Status</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Attendance</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((reg, idx) => (
                      <tr key={reg.id || `admin-reg-${idx}`} className="hover:bg-brand-soft/20 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                            {reg.userName} 
                            <span className="ml-2 px-1.5 py-0.5 bg-brand-soft text-[10px] text-brand-primary rounded border border-brand-primary/10">#{reg.uniqueCode || 'N/A'}</span>
                          </div>
                          <div className="text-xs text-text-muted">{reg.userEmail}</div>
                          <div className="text-xs text-text-muted">{reg.phone}</div>
                          <div className="mt-1">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${reg.paymentMethod === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {reg.paymentMethod === 'cash' ? 'CASH AT DESK' : 'UPI ONLINE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-text-main">{reg.college}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {reg.eventIds.map((eid: string, eIdx: number) => {
                              const event = events.find(e => e.id === eid);
                              const members = reg.teamDetails?.[eid];
                              return (
                                <div key={`${reg.id}-${eid}-${eIdx}`} className="group/item relative">
                                  <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-brand-primary border border-brand-primary/10 shadow-sm cursor-help">
                                    {event?.name}
                                    {members && <span className="ml-1 text-amber-600">({members.length})</span>}
                                  </span>
                                  {members && (
                                    <div className="absolute bottom-full left-0 mb-2 invisible group-hover/item:visible bg-brand-dark text-white text-[10px] p-2 rounded-lg shadow-xl z-10 w-40">
                                      <p className="font-bold border-b border-white/20 mb-1 pb-1 uppercase tracking-wider">Team Members</p>
                                      {members.map((m: string, i: number) => (
                                        <div key={`tm-${reg.id || 'reg'}-${eid}-${i}`} className="truncate">• {m || 'Unnamed'}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-[10px] font-bold text-brand-dark">Total Fee: ₹{reg.totalAmount || 0}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {reg.paymentStatus === 'approved' ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Approved
                                </span>
                              ) : reg.paymentStatus === 'rejected' ? (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Rejected
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </div>
                            {reg.transactionId && (
                              <div className="text-[9px] font-mono text-text-muted bg-gray-50 p-1 rounded border border-gray-100">
                                 TXN: {reg.transactionId}
                              </div>
                            )}
                  <div className="flex gap-1 mt-2 flex-wrap">
                               {reg.paymentMethod === 'cash' && reg.paymentStatus !== 'approved' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'approved')}
                                  className="p-1.5 bg-brand-primary text-white hover:bg-brand-dark rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Confirm Cash Paid"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Mark Paid
                                </button>
                              )}
                              {reg.paymentStatus !== 'approved' && reg.paymentMethod === 'upi' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'approved')}
                                  className="p-1.5 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Approve Online Payment"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                              )}
                              {reg.paymentStatus !== 'pending' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'pending')}
                                  className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-colors"
                                  title="Reset to Pending"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => updatePaymentStatus(reg.id, 'rejected')}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                title="Reject / Cancel"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-6 bg-gray-200 mx-1" />
                              <button 
                                onClick={() => setEditingReg(reg)}
                                className="p-1.5 bg-brand-soft text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-colors"
                                title="Edit Details"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`/#/verify?code=${reg.uniqueCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                title="Verify Pass QR"
                              >
                                <QrCode className="w-3.5 h-3.5" /> Pass
                              </a>
                              {!isReadOnly && (
                                <button 
                                  onClick={() => handleDeleteRegistration(reg.id, reg.userName)}
                                  className="p-1.5 bg-red-100 text-red-700 hover:bg-red-700 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Delete Registration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <button 
                            onClick={() => toggleAttended(reg.id, !!reg.attended)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${reg.attended ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-brand-soft hover:text-brand-primary'}`}
                          >
                            {reg.attended ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                            {reg.attended ? 'Present' : 'Mark Present'}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-mono text-text-muted">
                            {new Date(reg.registrationTime).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'quiz' ? (
          <div className="space-y-12">
            {/* Quiz Library Selector */}
            <div className="glass-card p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2 ml-2">Select Quiz to Manage</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedQuizId || ''} 
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-brand-primary font-serif"
                  >
                    <option value="">-- Choose a Quiz --</option>
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.isActive ? '🟢 ' : '⚪️ '} {q.title || 'Untitled Quiz'} ({q.isActive ? 'ACTIVE' : 'DRAFT'})
                      </option>
                    ))}
                  </select>
                    <button onClick={createNewQuiz} className="btn-primary px-6 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  {selectedQuizId && (
                    <>
                      <button 
                        onClick={async () => {
                          const name = prompt("Enter Quiz Name:", quizMetadata.title);
                          if (name) {
                            setQuizMetadata({...quizMetadata, title: name});
                            const quizRef = doc(db, 'quizzes', selectedQuizId);
                            await setDoc(quizRef, { ...quizConfig, title: name }, { merge: true });
                            alert("Quiz renamed!");
                          }
                        }}
                        className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                      >
                        <Plus className="w-3 h-3 rotate-45" /> Rename
                      </button>
                              <button 
                                onClick={() => deleteQuiz()} 
                                className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                                disabled={isReadOnly}
                              >
                                <Trash2 className="w-4 h-4" /> Delete Entire Quiz Event
                              </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quiz Control Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div className={`glass-card p-8 rounded-[2rem] border-2 transition-all ${quizConfig?.isActive ? (quizConfig?.status === 'playing' ? 'border-green-500 bg-green-50/10' : 'border-amber-500 bg-amber-50/10') : 'border-red-500 bg-red-50/10'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <Brain className={quizConfig?.isActive ? (quizConfig?.status === 'playing' ? 'text-green-600' : 'text-amber-600') : 'text-red-600'} />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${quizConfig?.isActive ? (quizConfig?.status === 'playing' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700') : 'bg-red-100 text-red-700'}`}>
                      {quizConfig?.isActive ? `Active: ${quizConfig?.status?.toUpperCase() || 'LOBBY'}` : 'Status: Off'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif text-brand-dark mb-2">Quiz Control</h3>
                  {quizConfig?.isActive && (
                    <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-4">
                      Session ID: {quizConfig?.sessionId || 'default'}
                    </p>
                  )}
                  <p className="text-[10px] text-text-muted mb-6 uppercase font-bold tracking-widest">Master switch for live participants</p>
                  
                  <div className="space-y-3">
                    {!quizConfig?.isActive && (
                      <button 
                        onClick={activateQuizWithoutReset}
                        className="w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-brand-primary hover:bg-brand-dark text-white text-xs shadow-md font-bold cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        Activate Quiz
                      </button>
                    )}

                    <button 
                      onClick={openLobbyAndReset}
                      className="w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-md font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Open Lobby & Reset
                    </button>

                    {quizConfig?.isActive && quizConfig?.status !== 'playing' && (
                      <button 
                        onClick={startQuizAnswers}
                        className="w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-700 text-white text-xs shadow-lg font-bold animate-pulse cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        Start Live Quiz
                      </button>
                    )}

                    {quizConfig?.isActive && (
                      <button 
                        onClick={deactivateQuiz}
                        className="w-full py-2.5 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Deactivate Quiz
                      </button>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-[2rem] bg-brand-soft/20 border border-brand-primary/10">
                  <h4 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-widest">Quiz Info</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Display Title</label>
                      <input 
                        type="text" 
                        value={quizMetadata.title}
                        onChange={(e) => setQuizMetadata({...quizMetadata, title: e.target.value})}
                        placeholder="e.g. Chemical Chaos Quiz"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Description</label>
                      <textarea 
                        value={quizMetadata.description}
                        onChange={(e) => setQuizMetadata({...quizMetadata, description: e.target.value})}
                        placeholder="A short tagline for the quiz..."
                        className="input-field text-xs py-2 min-h-[60px]"
                      />
                    </div>
                    <button 
                      onClick={saveQuizMetadata}
                      className="w-full bg-brand-dark text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-3 h-3" /> Save Details
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2rem] md:col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif text-brand-dark">Live Leaderboard</h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setFullscreenBoard('quiz')}
                      className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Fullscreen Live Board
                    </button>
                    <button 
                      onClick={clearResponses} 
                      className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                      disabled={isReadOnly}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear All Responses
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {quizResponses.filter(res => res.quizId === selectedQuizId && res.sessionId === quizConfig?.sessionId).length > 0 ? (
                    quizResponses
                      .filter(res => res.quizId === selectedQuizId && res.sessionId === quizConfig?.sessionId)
                      .sort((a, b) => b.score - a.score)
                      .map((res, i) => (
                        <div key={res.id || res.userId || `admin-qres-${i}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                              {i + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-brand-dark">{res.quizName || res.userName || 'Anonymous Participant'}</p>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${res.status === 'joined' ? 'bg-amber-100 text-amber-800' : res.status === 'playing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                  {res.status === 'joined' ? 'Lobby' : res.status === 'playing' ? 'Playing' : 'Completed'}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted">
                                {res.status === 'joined' ? 'Waiting in Lobby' : res.status === 'playing' ? `Answering Question ${(res.answers?.length || 0) + 1}...` : `Finished at ${new Date(res.submittedAt).toLocaleTimeString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-brand-primary">{res.score}</p>
                              <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{res.correctCount || 0}/{res.totalQuestions || 0} Correct</p>
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => deleteResponse(res.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-10 text-text-muted italic">No responses received yet. Once the quiz starts, results will appear here in real-time.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Question Management */}
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8 flex items-center gap-2">
                <Plus className="text-brand-primary" />
                Manage Questions
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form to Add Question */}
                <div className="space-y-6">
                  <div className="p-6 bg-brand-soft/30 rounded-3xl border border-brand-primary/10">
                    <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-4">
                      {editingQuestionIndex !== null ? 'Editing Question' : 'Add New Question'}
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Question Text</label>
                        <textarea 
                          value={newQuestion.text}
                          onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                          placeholder="What is the chemical symbol for Gold?"
                          className="input-field min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {newQuestion.options.map((opt, i) => (
                          <div key={`new-qopt-${i}`} className="space-y-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 flex items-center gap-2">
                              Option {i + 1}
                              <input 
                                type="radio" 
                                name="correct"
                                checked={newQuestion.correctAnswer === i}
                                onChange={() => setNewQuestion({...newQuestion, correctAnswer: i})}
                              />
                            </label>
                            <input 
                              type="text" 
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...newQuestion.options];
                                newOpts[i] = e.target.value;
                                setNewQuestion({...newQuestion, options: newOpts});
                              }}
                              placeholder={`Option ${i + 1}`}
                              className="input-field py-2 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Time Limit (Sec)</label>
                          <input 
                            type="number" 
                            value={newQuestion.timeLimit}
                            onChange={(e) => setNewQuestion({...newQuestion, timeLimit: parseInt(e.target.value)})}
                            className="input-field"
                          />
                        </div>
                        <div className="flex-1 flex items-end">
                          <label className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all cursor-pointer w-full bg-white ${newQuestion.isDoublePoints ? 'border-amber-500 bg-amber-50' : 'border-gray-100'}`}>
                            <input 
                              type="checkbox" 
                              checked={newQuestion.isDoublePoints}
                              onChange={(e) => setNewQuestion({...newQuestion, isDoublePoints: e.target.checked})}
                              className="w-5 h-5 accent-amber-500"
                            />
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${newQuestion.isDoublePoints ? 'text-amber-700' : 'text-text-muted'}`}>Double Points</span>
                              {newQuestion.isDoublePoints && <span className="text-[8px] text-amber-600 font-bold uppercase">x2 Multiplier</span>}
                            </div>
                          </label>
                        </div>
                        <div className="flex items-end gap-2">
                          {editingQuestionIndex !== null && (
                            <button 
                              onClick={() => {
                                setEditingQuestionIndex(null);
                                setNewQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
                              }}
                              className="btn-secondary py-3 px-4 text-xs"
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            onClick={addQuestion}
                            className="btn-primary py-3 px-8 flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" /> {editingQuestionIndex !== null ? 'Update' : 'Save'} Question
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Question Bank ({quizConfig?.questions?.length || 0})</p>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {quizConfig?.questions?.map((q: any, i: number) => (
                      <div key={`qbank-${q.id || i}-${i}`} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditQuestion(i)}
                            className="text-brand-primary p-1 bg-brand-soft rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          {!isReadOnly && (
                            <button 
                              onClick={() => deleteQuestion(i)}
                              className="text-red-500 p-1 bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded bg-brand-soft text-brand-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-brand-dark pr-8">{q.text}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {q.options.map((opt: string, oi: number) => (
                                <div key={`qopt-item-${i}-${oi}`} className={`text-[10px] ${q.correctAnswer === oi ? 'text-green-600 font-bold' : 'text-text-muted'}`}>
                                  {oi + 1}. {opt} {q.correctAnswer === oi && '✓'}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-bold text-text-muted bg-gray-100 px-2 py-0.5 rounded tracking-widest">{q.timeLimit}S TIME</span>
                              {q.isDoublePoints && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded tracking-widest">DOUBLE POINTS</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!quizConfig?.questions || quizConfig.questions.length === 0) && (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl text-text-muted italic border-2 border-dashed border-gray-200">
                        Start by adding your first question.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'treasure' ? (
          <div className="space-y-12">
            {/* Hunt Library Selector */}
            <div className="glass-card p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2 ml-2">Select Treasure Hunt to Manage</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedHuntId || ''} 
                    onChange={(e) => setSelectedHuntId(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-brand-primary font-serif"
                  >
                    <option value="">-- Choose a Hunt --</option>
                    {hunts.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.isActive ? '🟢 ' : '⚪️ '} {h.title || 'Untitled Hunt'} ({h.id.slice(0,5)})
                      </option>
                    ))}
                  </select>
                    <button onClick={createNewHunt} className="btn-primary px-6 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  {selectedHuntId && (
                    <>
                      <button 
                        onClick={async () => {
                          const name = prompt("Enter Hunt Name:", treasureMetadata.title);
                          if (name) {
                            setTreasureMetadata({...treasureMetadata, title: name});
                            const huntRef = doc(db, 'treasure_hunts', selectedHuntId);
                            await setDoc(huntRef, { ...treasureConfig, title: name }, { merge: true });
                            alert("Hunt renamed!");
                          }
                        }}
                        className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                      >
                        <Plus className="w-3 h-3 rotate-45" /> Rename
                      </button>
                      <button 
                        onClick={() => deleteHunt()} 
                        className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                        disabled={isReadOnly}
                      >
                        <Trash2 className="w-4 h-4" /> Delete Entire Hunt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Treasure Hunt Control Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div className={`glass-card p-8 rounded-[2rem] border-2 transition-all ${treasureConfig?.isActive ? (treasureConfig?.status === 'playing' ? 'border-green-500 bg-green-50/10' : 'border-amber-500 bg-amber-50/10') : 'border-red-500 bg-red-50/10'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <Map className={treasureConfig?.isActive ? (treasureConfig?.status === 'playing' ? 'text-green-600' : 'text-amber-600') : 'text-red-600'} />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${treasureConfig?.isActive ? (treasureConfig?.status === 'playing' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700') : 'bg-red-100 text-red-700'}`}>
                      {treasureConfig?.isActive ? `Active: ${treasureConfig?.status?.toUpperCase() || 'LOBBY'}` : 'Status: Off'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif text-brand-dark mb-2">Hunt Control</h3>
                  {treasureConfig?.isActive && (
                    <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-4">
                      Active Session Room
                    </p>
                  )}
                  <p className="text-[10px] text-text-muted mb-6 uppercase font-bold tracking-widest">Master switch for the treasure hunt</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={openTreasureLobby}
                      className="w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-md font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Open Lobby & Reset
                    </button>

                    {treasureConfig?.isActive && treasureConfig?.status !== 'playing' && (
                      <button 
                        onClick={startTreasureHunt}
                        className="w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-700 text-white text-xs shadow-lg font-bold animate-pulse cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        Start Treasure Hunt
                      </button>
                    )}

                    {treasureConfig?.isActive && (
                      <button 
                        onClick={deactivateTreasure}
                        className="w-full py-2 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Deactivate Hunt
                      </button>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-[2rem] bg-brand-soft/20 border border-brand-primary/10">
                  <h4 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-widest">Hunt Info</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Display Title</label>
                      <input 
                        type="text" 
                        value={treasureMetadata.title}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, title: e.target.value})}
                        placeholder="e.g. Periodic Path"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Description</label>
                      <textarea 
                        value={treasureMetadata.description}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, description: e.target.value})}
                        placeholder="A short tagline for the hunt..."
                        className="input-field text-xs py-2 min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Penalty Lockout (Seconds)</label>
                      <input 
                        type="number" 
                        value={treasureMetadata.penaltyTime}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, penaltyTime: parseInt(e.target.value)})}
                        placeholder="e.g. 300"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <button 
                      onClick={saveTreasureMetadata}
                      className="w-full bg-brand-dark text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-3 h-3" /> Save Details
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2rem] md:col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif text-brand-dark">Hunter Progress</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFullscreenBoard('treasure')}
                      className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                    >
                      <Map className="w-3.5 h-3.5" /> Fullscreen Live Board
                    </button>
                    {!isReadOnly && (
                      <button onClick={clearTreasureProgress} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Clear All Participant Progress
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {treasureProgress.length > 0 ? (
                    treasureProgress
                      .filter(res => res.huntId === selectedHuntId)
                      .sort((a, b) => b.currentClueIndex - a.currentClueIndex)
                      .map((res, i) => (
                        <div key={res.id || res.userId || `admin-tres-${i}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand-primary">
                              {i+1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-brand-dark">{res.userName || 'Anonymous Hunter'}</p>
                                {res.teamName && (
                                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md text-[9px] font-bold uppercase tracking-tighter">
                                    Team: {res.teamName}
                                  </span>
                                )}
                              </div>
                              {res.isCompleted ? (
                                <p className="text-[10px] text-green-600 font-bold uppercase">Finished!</p>
                              ) : (
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">On Clue #{res.currentClueIndex + 1}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                               {res.isCompleted ? (
                                 <Trophy className="text-amber-500 w-5 h-5 mx-auto" />
                               ) : (
                                 <div className="flex items-center gap-1 text-brand-primary">
                                   <Clock className="w-3 h-3" />
                                   <span className="text-sm font-bold">Active</span>
                                 </div>
                               )}
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => deleteProgress(res.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-10 text-text-muted italic">No participants have started the hunt yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Clue Management */}
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8 flex items-center gap-2">
                <Key className="text-brand-primary" />
                Configure Clues & Pins
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Add Clue Form */}
                <div className="space-y-6">
                  <div className="p-6 bg-brand-soft/30 rounded-3xl border border-brand-primary/10">
                    <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-4">
                      {editingClueIndex !== null ? 'Editing Clue point' : 'Add Story/Clue Point'}
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Clue Text</label>
                        <textarea 
                          value={newClue.clue}
                          onChange={(e) => setNewClue({...newClue, clue: e.target.value})}
                          placeholder="Go to the lab where hydrogen was first discovered..."
                          className="input-field min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-text-muted uppercase ml-1">5-Digit Unlock Pin</label>
                          <span className="text-[9px] text-brand-primary font-bold">{newClue.code.length}/5</span>
                        </div>
                        <input 
                          type="text" 
                          maxLength={5}
                          value={newClue.code}
                          onChange={(e) => setNewClue({...newClue, code: e.target.value.replace(/\D/g, '')})}
                          placeholder="e.g. 12345"
                          className="input-field font-mono tracking-[0.5em] text-center text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        {editingClueIndex !== null && (
                          <button 
                            onClick={() => {
                              setEditingClueIndex(null);
                              setNewClue({ clue: '', code: '' });
                            }}
                            className="btn-secondary flex-1 py-4"
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          onClick={addClue}
                          className="btn-primary flex-[2] py-4 flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" /> {editingClueIndex !== null ? 'Update Point' : 'Add to Chain'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clue Chain List */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">The Treasure Path ({treasureConfig?.clues?.length || 0})</p>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {treasureConfig?.clues?.map((c: any, i: number) => (
                      <div key={`clue-path-${c.id || i}-${i}`} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditClue(i)}
                            className="text-brand-primary p-1 bg-brand-soft rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          {!isReadOnly && (
                            <button 
                              onClick={() => deleteClue(i)}
                              className="text-red-500 p-1 bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded bg-brand-soft text-brand-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-brand-dark pr-8">{c.clue}</p>
                            <div className="flex items-center gap-2">
                              <Key className="w-3 h-3 text-brand-primary" />
                              <span className="text-xs font-mono font-bold text-brand-primary select-all">{c.code}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!treasureConfig?.clues || treasureConfig.clues.length === 0) && (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl text-text-muted italic border-2 border-dashed border-gray-200">
                        Design your treasure path by adding clues.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'support' ? (
          <div className="glass-card p-8 rounded-[2rem] h-[700px] flex gap-8">
            {/* User List Sidebar */}
            <div className="w-80 flex flex-col border-r border-gray-100 pr-8">
              <h3 className="text-xl font-serif text-brand-dark mb-4 flex items-center gap-2">
                <Users className="text-brand-primary" /> Active Chats
              </h3>
              
              <div className="mb-4">
                <button
                  onClick={() => {
                    setSelectedDirectParticipant(null);
                    setParticipantSearchQuery('');
                    setDirectMsgText('');
                    setShowDirectDialog(true);
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all border border-amber-600/15 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-white" /> Message Participant
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {Object.entries(
                  allSupportMessages.reduce((acc: any, curr) => {
                    if (!acc[curr.userId]) acc[curr.userId] = [];
                    acc[curr.userId].push(curr);
                    return acc;
                  }, {})
                ).sort((a: any, b: any) => {
                  const lastA = a[1][a[1].length - 1]?.timestamp?.toMillis() || 0;
                  const lastB = b[1][b[1].length - 1]?.timestamp?.toMillis() || 0;
                  return lastB - lastA;
                }).map(([uid, msgs]: any, idx: number) => {
                  const lastMsg = msgs[msgs.length - 1];
                  const unreadCount = msgs.filter((m: any) => !m.isRead && m.sender === 'user').length;
                  return (
                    <button
                      key={uid || `chat-user-${idx}`}
                      onClick={() => {
                        setSelectedUserChat(uid);
                        // Mark as read
                        msgs.forEach(async (m: any) => {
                          if (!m.isRead && m.sender === 'user') {
                            await updateDoc(doc(db, 'support_messages', m.id), { isRead: true });
                          }
                        });
                      }}
                      className={`w-full p-4 rounded-2xl text-left transition-all relative ${selectedUserChat === uid ? 'bg-brand-primary text-white shadow-xl' : 'bg-gray-50 text-brand-dark hover:bg-brand-soft'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm truncate pr-2">{msgs[0].userName || 'User'}</p>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] truncate opacity-70 ${selectedUserChat === uid ? 'text-white' : 'text-text-muted'}`}>
                        {lastMsg.sender === 'admin' ? 'You: ' : ''}{lastMsg.text}
                      </p>
                    </button>
                  );
                })}
                {Object.keys(allSupportMessages).length === 0 && (
                  <div className="text-center py-10 text-text-muted italic">No support chats yet.</div>
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="flex-1 flex flex-col">
              {selectedUserChat ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-serif text-brand-dark flex items-center gap-2">Chat with {allSupportMessages.find(m => m.userId === selectedUserChat)?.userName || 'User'}</h3>
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">User ID: {selectedUserChat}</p>
                    </div>
                    {!isReadOnly && (
                      <button 
                        onClick={() => deleteSupportChat(selectedUserChat)}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear History
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-3xl mb-4">
                    {allSupportMessages
                      .filter(m => m.userId === selectedUserChat)
                      .map((msg, i) => {
                        const isAiResponse = msg.sender === 'ai';
                        const isUserAiQuery = msg.isAiChat && msg.sender === 'user';
                        return (
                          <div key={`admin-msg-${msg.id || i}-${i}`} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3.5 rounded-2xl text-sm ${
                              msg.sender === 'admin' 
                                ? 'bg-brand-primary text-white rounded-tr-none' 
                                : isAiResponse
                                  ? 'bg-indigo-50 border border-slate-200 text-slate-800 rounded-tl-none prose font-sans'
                                  : isUserAiQuery
                                    ? 'bg-slate-50 border border-slate-250 text-slate-700 rounded-tl-none'
                                    : 'bg-white text-brand-dark shadow-sm rounded-tl-none border border-gray-100'
                            }`}>
                              {isAiResponse && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
                                  <Sparkles className="w-3 h-3 text-indigo-500" /> AI Assistant Response
                                </div>
                              )}
                              {isUserAiQuery && (
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  User Query to AI
                                </div>
                              )}
                              {isAiResponse ? (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                              )}
                              <p className={`text-[8px] mt-1 opacity-60 ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : 'Just now'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendSupportReply()}
                      placeholder="Type your reply here..."
                      className="flex-1 input-field"
                    />
                    <button 
                      onClick={sendSupportReply}
                      className="btn-primary px-8 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-gray-50 rounded-[2.5rem]">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-serif text-lg">Select a chat to view messages</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'events' ? (
          <div className="space-y-8">
            <div className="glass-card p-8 rounded-[2.5rem]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-serif text-brand-dark">Event Pricing & Details Control</h3>
                  <p className="text-xs text-text-muted mt-1">Select any event below to adjust pricing, descriptions, team constraints, or add/delete competitions.</p>
                </div>
                <div className="flex items-center gap-3">
                  {!isReadOnly && (
                    <button
                      onClick={handleCreateNewEvent}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Competition
                    </button>
                  )}
                  <div className="text-xs text-brand-primary font-bold bg-brand-soft px-4 py-2.5 rounded-xl border border-brand-primary/10">
                    {events.length} Live Competitions
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Event Selector List Column */}
                <div className="lg:col-span-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  <div className="flex justify-between items-center pl-1 mb-1">
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">List of Competitions</p>
                    {!isReadOnly && (
                      <button
                        onClick={handleCreateNewEvent}
                        className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                    )}
                  </div>

                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => startEditingEvent(evt)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group relative ${
                        selectedEventId === evt.id
                          ? 'bg-brand-soft border-brand-primary/30 shadow-md text-brand-dark'
                          : 'bg-white border-gray-100 hover:border-brand-primary-light text-text-main'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate pr-2">{evt.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 bg-brand-soft border border-brand-primary/10 text-brand-primary rounded">
                            {evt.category}
                          </span>
                          <span className={`text-[9px] uppercase font-bold ${evt.type === 'offline' ? 'text-amber-600' : 'text-blue-600'}`}>
                            {evt.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0 flex items-center gap-2">
                        <div>
                          <div className="font-serif font-bold text-brand-primary text-sm">₹{evt.price}</div>
                          <div className="text-[9px] text-text-muted">Fee</div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(evt.id, evt.name);
                            }}
                            title="Delete Competition"
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Form Area Column */}
                <div className="lg:col-span-8">
                  {selectedEventId && editingEventForm ? (
                    <form onSubmit={saveEventChanges} className="space-y-6 bg-gray-50/50 p-6 md:p-8 rounded-[2rem] border border-gray-200">
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200 gap-2">
                        <div>
                          <h4 className="font-serif text-lg text-brand-dark">Editing Details for <span className="text-brand-primary font-bold">"{editingEventForm.name}"</span></h4>
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase">{editingEventForm.category}</span>
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(selectedEventId, editingEventForm.name)}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-xl border border-red-200 flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Event
                          </button>
                        )}
                      </div>

                      {eventSaveSuccess && (
                        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl font-bold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          {eventSaveSuccess}
                        </div>
                      )}

                      {eventSaveError && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl font-bold flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          {eventSaveError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Event Name</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.name}
                            onChange={e => setEditingEventForm({ ...editingEventForm, name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Registration Fee (₹ Price)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            className="input-field font-mono font-bold text-brand-primary text-base"
                            disabled={isReadOnly}
                            value={editingEventForm.price}
                            onChange={e => setEditingEventForm({ ...editingEventForm, price: Number(e.target.value) })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Category / Group Name</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.category}
                            onChange={e => setEditingEventForm({ ...editingEventForm, category: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Winners Prize Label</label>
                          <input
                            type="text"
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.winners}
                            onChange={e => setEditingEventForm({ ...editingEventForm, winners: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Timeline (Date or Deadline)</label>
                          <input
                            type="text"
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.type === 'online' ? editingEventForm.deadline : (editingEventForm.date || '')}
                            onChange={e => {
                              if (editingEventForm.type === 'online') {
                                setEditingEventForm({ ...editingEventForm, deadline: e.target.value });
                              } else {
                                setEditingEventForm({ ...editingEventForm, date: e.target.value });
                              }
                            }}
                            placeholder={editingEventForm.type === 'online' ? '15 December 2026' : '16 Dec 2026'}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Event Type Mode</label>
                          <select
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.type}
                            onChange={e => setEditingEventForm({ ...editingEventForm, type: e.target.value })}
                          >
                            <option value="offline">Offline on Campus</option>
                            <option value="online">Online Submission</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-150">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Faculty / Staff Coordinator Name</label>
                          <input
                            type="text"
                            placeholder="Dr. Aryan Sharma"
                            className="input-field"
                            disabled={isReadOnly}
                            value={editingEventForm.headName || ''}
                            onChange={e => setEditingEventForm({ ...editingEventForm, headName: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Coordinator Contact Phone</label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            className="input-field font-mono"
                            disabled={isReadOnly}
                            value={editingEventForm.headPhone || ''}
                            onChange={e => setEditingEventForm({ ...editingEventForm, headPhone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-gray-150">
                        <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Is Team Event ?</label>
                        <div className="flex items-center gap-6 p-4 bg-white rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 text-sm font-medium text-brand-dark cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isReadOnly}
                              checked={editingEventForm.isTeam}
                              onChange={e => setEditingEventForm({ ...editingEventForm, isTeam: e.target.checked })}
                              className="accent-brand-primary w-4 h-4 rounded"
                            />
                            This competition requires a team registration
                          </label>

                          {editingEventForm.isTeam && (
                            <div className="flex items-center gap-4 animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">Min:</span>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center"
                                  disabled={isReadOnly}
                                  value={editingEventForm.minTeamSize || 1}
                                  onChange={e => setEditingEventForm({ ...editingEventForm, minTeamSize: Number(e.target.value) })}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">Max:</span>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center"
                                  disabled={isReadOnly}
                                  value={editingEventForm.maxTeamSize || 1}
                                  onChange={e => setEditingEventForm({ ...editingEventForm, maxTeamSize: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-gray-150">
                        <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Event Description</label>
                        <textarea
                          rows={4}
                          required
                          className="input-field font-sans text-sm resize-y leading-relaxed"
                          disabled={isReadOnly}
                          value={editingEventForm.description}
                          onChange={e => setEditingEventForm({ ...editingEventForm, description: e.target.value })}
                        />
                      </div>

                      {/* Rule List Editing */}
                      <div className="space-y-4 pt-4 border-t border-gray-150">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">Rules & Regulations List</label>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={handleAddRule}
                              className="text-xs bg-brand-primary hover:bg-brand-dark hover:shadow text-white font-bold py-1 px-3 rounded-lg flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Add Rule
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {editingEventForm.rules.map((rule: string, rIdx: number) => (
                            <div key={`evt-rule-${rIdx}`} className="flex gap-2 items-center">
                              <span className="text-xs font-mono font-bold text-text-muted shrink-0 bg-white w-6 h-6 rounded-full flex items-center justify-center border border-gray-200">{rIdx + 1}</span>
                              <input
                                type="text"
                                required
                                className="flex-1 input-field"
                                disabled={isReadOnly}
                                value={rule}
                                onChange={e => handleRuleChange(rIdx, e.target.value)}
                              />
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRule(rIdx)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}

                          {editingEventForm.rules.length === 0 && (
                            <div className="text-center py-4 bg-white rounded-xl text-text-muted text-xs italic border border-dashed border-gray-200">
                              No rules listed yet. Under this mode, any guidelines can be added!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Form Actions */}
                      {!isReadOnly && (
                        <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
                          <button
                            type="submit"
                            className="btn-primary py-3 px-8 flex items-center gap-2 shadow-lg"
                          >
                            <Save className="w-4 h-4" /> Save Pricing & Event Details
                          </button>
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted bg-gray-50 rounded-[2.5rem] py-20 border border-dashed border-gray-200">
                      <Sparkles className="w-16 h-16 mb-4 text-brand-primary opacity-20" />
                      <p className="font-serif text-lg">Click a competition from the left list to edit details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'announcements' ? (
          <div className="space-y-12">
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8">Broadcast System Announcement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Message Type</label>
                    <select 
                      className="input-field"
                      value={announcementType}
                      onChange={e => setAnnouncementType(e.target.value as any)}
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="success">Success (Green)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="error">Critical (Red)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Broadcast Message</label>
                    <textarea 
                      className="input-field min-h-[150px]"
                      value={announcementMsg}
                      onChange={e => setAnnouncementMsg(e.target.value)}
                      placeholder="Type your message to all live users..."
                    />
                  </div>
                  <button onClick={sendAnnouncement} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Send Live Broadcast
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Broadcast History</p>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {announcements.map((ann, idx) => (
                      <div 
                        key={ann.id || `admin-ann-${idx}`} 
                        className={`p-4 rounded-2xl border shadow-sm relative group ${
                          ann.type === 'error' ? 'bg-red-50 border-red-100' : 
                          ann.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                          ann.type === 'success' ? 'bg-green-50 border-green-100' :
                          'bg-white border-gray-100'
                        }`}
                      >
                        <button 
                          onClick={() => !isReadOnly && deleteAnnouncement(ann.id)}
                          className={`absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isReadOnly ? 'hidden' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            ann.type === 'error' ? 'bg-red-500' : 
                            ann.type === 'warning' ? 'bg-amber-500' :
                            ann.type === 'success' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`} />
                          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{ann.type}</p>
                        </div>
                        <p className="text-sm font-medium text-brand-dark">{ann.message}</p>
                        <p className="text-[9px] text-text-muted mt-2 font-mono">{new Date(ann.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {announcements.length === 0 && (
                      <div className="text-center py-10 text-text-muted italic">No broadcasts sent yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <div className="space-y-8 animate-fadeIn">
            <div className="glass-card p-8 rounded-[2.5rem] bg-white/80 border border-gray-105 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-8">
                <div>
                  <h3 className="text-2xl font-serif text-brand-dark flex items-center gap-2">
                    <Flag className="text-red-600 w-6 h-6" />
                    Community Chat Moderation Panel
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Manage, review, and handle flagged chat messages reported by Chemist participants.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-red-700 text-xs font-bold font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{reportedPosts.length} Active Reports</span>
                </div>
              </div>

              {reportedPosts.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-80" />
                  <h4 className="text-lg font-bold text-brand-dark mb-1">Clear Horizon!</h4>
                  <p className="text-text-muted text-xs max-w-sm mx-auto leading-relaxed">
                    No chat messages have been reported by participants. The community is behaving beautifully and safely!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {reportedPosts.map((post, idx) => (
                    <div 
                      key={post.id || `rep-post-${idx}`}
                      className="border border-red-100/60 bg-red-50/10 rounded-[2rem] p-6 flex flex-col gap-4 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Message and Metadata */}
                      <div className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                            <div>
                              <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Posted By</p>
                              <p className="text-sm font-black text-brand-dark font-sans">
                                {post.userName || 'Anonymous'} <span className="text-xs font-medium text-text-muted font-mono">({post.userEmail || 'N/A'})</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-text-muted font-bold uppercase tracking-wider font-sans">Message Date</p>
                              <p className="text-xs text-brand-dark font-medium font-mono">
                                {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Flagged Chat Message</p>
                            <p className="text-sm text-text-main leading-relaxed bg-white border border-gray-100 p-4 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap font-sans font-medium">
                              {post.text || <span className="italic text-gray-400">Empty message.</span>}
                            </p>
                          </div>

                          {/* Flagged reasons list */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-red-600 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Flagged Reports ({post.reports?.length || 0})
                            </p>
                            <div className="bg-red-50/50 border border-red-100/40 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
                              {post.reports && post.reports.length > 0 ? (
                                post.reports.map((rep: any, idx: number) => (
                                  <div key={`rep-item-${post.id || 'p'}-${idx}`} className="text-xs border-b border-red-100/20 last:border-0 pb-1.5 last:pb-0 font-sans">
                                    <div className="flex justify-between font-bold text-red-950 text-[10px]">
                                      <span>{rep.userName || 'Reporter'} ({rep.userEmail || 'N/A'})</span>
                                      <span className="font-mono font-medium text-gray-400">{rep.timestamp ? new Date(rep.timestamp).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <p className="text-red-900 mt-0.5 leading-snug">{rep.reason || 'No specific reason reported.'}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-red-900 italic">No detailed report records attached.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100/50">
                          <button
                            type="button"
                            onClick={() => handleDismissReports(post.id)}
                            className="btn-secondary py-2 px-4 text-xs font-bold text-gray-700 hover:bg-gray-100 border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Dismiss Reports / Keep Message
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRasagramPost(post.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow shadow-red-200 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Message Permanently
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'gsheets' ? (
          <div className="space-y-8 animate-fadeIn">
            <div className="glass-card p-8 rounded-[2.5rem] bg-white border border-emerald-100 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-8">
                <div>
                  <h3 className="text-2xl font-serif text-brand-dark flex items-center gap-2.5">
                    <FileSpreadsheet className="text-emerald-600 w-7 h-7" />
                    Google Sheets Participant Data Hub
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Direct real-time transfer & synchronization of all participant registrations to Google Sheets.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border ${activeSheetId ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${activeSheetId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{activeSheetId ? 'Google Sheet Linked' : 'No Sheet Connected'}</span>
                  </div>
                </div>
              </div>

              {sheetStatusMsg && (
                <div className={`mb-8 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${sheetStatusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {sheetStatusMsg.type === 'success' ? <Check className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                  <span className="flex-1">{sheetStatusMsg.text}</span>
                </div>
              )}

              {/* Status and Primary Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Control 1: One-click Create Rasayan Sheet */}
                <div className="p-6 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 rounded-3xl border border-emerald-200/80 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                        Recommended Setup
                      </span>
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-bold text-brand-dark mb-2">Create New Rasayan Google Sheet</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Automatically creates a pre-formatted <strong>"Rasayan 2026 - Participant Registrations"</strong> spreadsheet in your Google Drive with header columns and instantly transfers all current records!
                    </p>
                  </div>

                  <button
                    onClick={handleCreateNewGoogleSheet}
                    disabled={isCreatingSheet}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCreatingSheet ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Creating Spreadsheet & Transferring Data...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Auto-Create & Transfer to Google Sheet
                      </>
                    )}
                  </button>
                </div>

                {/* Control 2: Sync Existing Sheet */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-md block w-fit mb-3">
                      Link Existing Sheet
                    </span>
                    <h4 className="text-xl font-bold text-brand-dark mb-2">Connect Custom Google Sheet ID</h4>
                    <p className="text-xs text-text-muted leading-relaxed mb-4">
                      Paste an existing Google Spreadsheet ID or URL to route participant transfers to your custom document.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste Spreadsheet ID (e.g. 1BxiMVs0...)"
                        value={sheetIdInput}
                        onChange={(e) => setSheetIdInput(e.target.value)}
                        className="input-field text-xs font-mono"
                      />
                      <button
                        onClick={() => handleConnectExistingSheet(sheetIdInput)}
                        className="btn-secondary py-2.5 px-4 text-xs font-bold shrink-0"
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSyncAllRegistrationsToSheet}
                    disabled={isSyncingSheet || (!activeSheetId && !sheetIdInput.trim())}
                    className="w-full py-4 bg-brand-primary hover:bg-brand-dark disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSyncingSheet ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Transferring Participant Data...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Transfer All {registrations.length} Records Now
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Sheet Card */}
              {activeSheetId && (
                <div className="p-6 bg-emerald-950 text-emerald-50 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 shadow-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Active Linked Google Sheet</p>
                    <p className="text-sm font-mono font-bold text-white break-all">{activeSheetId}</p>
                    <p className="text-xs text-emerald-300/80 mt-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Auto-Sync Active: Incoming registrations are appended to this Google Sheet in real-time.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {activeSheetUrl && (
                      <a
                        href={activeSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Google Sheet ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Table of Data Transferred */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-brand-dark font-serif">
                    Participant Data Sheet Preview ({registrations.length} Rows)
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest">
                    Formatted Columns: A to K
                  </span>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-x-auto bg-gray-50/50 max-h-[400px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                        <th className="p-3 border-b border-slate-800">Pass Code</th>
                        <th className="p-3 border-b border-slate-800">Name</th>
                        <th className="p-3 border-b border-slate-800">Email</th>
                        <th className="p-3 border-b border-slate-800">Phone</th>
                        <th className="p-3 border-b border-slate-800">College</th>
                        <th className="p-3 border-b border-slate-800">Events</th>
                        <th className="p-3 border-b border-slate-800">Fee</th>
                        <th className="p-3 border-b border-slate-800">Method</th>
                        <th className="p-3 border-b border-slate-800">UTR/Txn</th>
                        <th className="p-3 border-b border-slate-800">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {registrations.slice(0, 50).map((r, i) => (
                        <tr key={r.id || `preview-r-${i}`} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-emerald-700">{r.uniqueCode || 'N/A'}</td>
                          <td className="p-3 font-bold text-brand-dark">{r.userName || 'N/A'}</td>
                          <td className="p-3 text-text-muted">{r.userEmail || 'N/A'}</td>
                          <td className="p-3 font-mono">{r.phone || 'N/A'}</td>
                          <td className="p-3 max-w-[150px] truncate">{r.college || 'N/A'}</td>
                          <td className="p-3 max-w-[180px] truncate font-medium">
                            {Array.isArray(r.eventNames) ? r.eventNames.join(', ') : (Array.isArray(r.eventIds) ? r.eventIds.join(', ') : (r.events || 'N/A'))}
                          </td>
                          <td className="p-3 font-bold">₹{r.totalAmount || 0}</td>
                          <td className="p-3 uppercase font-bold text-[10px]">{r.paymentMethod || 'UPI'}</td>
                          <td className="p-3 font-mono text-[10px]">{r.transactionId || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${r.paymentStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {r.paymentStatus || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {registrations.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-text-muted italic">
                            No participant registrations yet in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showDirectDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-serif text-brand-dark flex items-center gap-2">
                  <Sparkles className="text-amber-500 w-6 h-6" /> Direct Message Participant
                </h3>
                <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mt-1">Select and message any registered participant in the database</p>
              </div>
              <button type="button" onClick={() => setShowDirectDialog(false)} className="text-text-muted hover:text-red-500 p-2 rounded-full hover:bg-black/5 transition-all outline-none">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {!selectedDirectParticipant ? (
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1 block">1. Search & Choose a Participant</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="input-field pl-10"
                      placeholder="Search by participant name, email, college or chemist ID..."
                      value={participantSearchQuery}
                      onChange={e => setParticipantSearchQuery(e.target.value)}
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  </div>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto bg-gray-50/40">
                    {registrations
                      .filter(reg => {
                        const s = participantSearchQuery.toLowerCase();
                        return (
                          (reg.userName || '').toLowerCase().includes(s) ||
                          (reg.userEmail || '').toLowerCase().includes(s) ||
                          (reg.uniqueCode || '').toLowerCase().includes(s) ||
                          (reg.college || '').toLowerCase().includes(s)
                        );
                      })
                      .map((reg, idx) => (
                        <div 
                          key={reg.id || `direct-part-${idx}`}
                          onClick={() => setSelectedDirectParticipant(reg)}
                          className="p-4 border-b border-gray-100 hover:bg-brand-soft/20 cursor-pointer flex justify-between items-center transition-colors group"
                        >
                          <div>
                            <p className="font-bold text-sm text-brand-dark group-hover:text-brand-primary transition-colors">{reg.userName}</p>
                            <p className="text-[11px] text-text-muted">{reg.userEmail} • {reg.college || 'No college'}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[10px] font-bold bg-brand-soft text-brand-primary px-2 py-0.5 rounded border border-brand-primary/10">
                              ID: {reg.uniqueCode || 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    {registrations.length === 0 && (
                      <div className="text-center py-8 text-xs text-text-muted italic">No participants found in database.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Participant Details Card */}
                  <div className="p-5 rounded-2xl bg-brand-soft/20 border border-brand-primary/10 relative overflow-hidden flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-brand-soft border border-brand-primary/20 text-brand-primary rounded mb-2 inline-block">
                        Target Participant Selected
                      </span>
                      <h4 className="text-base font-bold text-brand-dark">{selectedDirectParticipant.userName}</h4>
                      <p className="text-xs text-text-muted mt-0.5">{selectedDirectParticipant.userEmail} • Phone: {selectedDirectParticipant.phone || 'N/A'}</p>
                      <p className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-wider">Institution: {selectedDirectParticipant.college || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold bg-brand-soft border border-brand-primary/15 text-brand-primary px-3 py-1 rounded-lg">
                        {selectedDirectParticipant.uniqueCode || 'No Code'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedDirectParticipant(null)}
                        className="text-[10px] font-bold text-amber-700 hover:underline hover:text-brand-primary cursor-pointer mt-1"
                      >
                        Change Participant
                      </button>
                    </div>
                  </div>

                  {/* Messaging Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest block ml-1">2. Custom Message Content</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Type high-priority message..."
                        className="input-field text-sm"
                        value={directMsgText}
                        onChange={e => setDirectMsgText(e.target.value)}
                      />
                    </div>

                    {/* Option switches */}
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          className="accent-amber-500 w-4.5 h-4.5 shrink-0 rounded mt-0.5"
                          checked={sendAsPriority}
                          onChange={e => setSendAsPriority(e.target.checked)}
                        />
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">Treat as high-priority notification screen alert</span>
                          <span className="text-[10px] text-amber-800 leading-snug block mt-0.5">
                            When active, this dispatch alerts the student with an overlay screen notification counting down for exactly 30 seconds on their live application screen.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/50">
              <button 
                type="button" 
                onClick={() => {
                  setDirectMsgText('');
                  setSelectedDirectParticipant(null);
                  setShowDirectDialog(false);
                }}
                className="btn-secondary flex-1 py-3.5"
              >
                Close Dialog
              </button>
              <button 
                type="button" 
                disabled={!selectedDirectParticipant || !directMsgText.trim()}
                onClick={handleSendDirectMessage}
                className="btn-primary flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 border-amber-500 text-white font-bold tracking-wider disabled:bg-gray-200 disabled:text-text-muted disabled:border-transparent transition-all shadow"
              >
                Dispatch Message
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingReg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-serif text-brand-dark">Edit Registration</h3>
              <button onClick={() => setEditingReg(null)} className="text-text-muted hover:text-brand-primary transition-colors"><XCircle /></button>
            </div>
            <form onSubmit={handleUpdateRegDetails} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Participant Name</label>
                  <input 
                    className="input-field"
                    value={editingReg.userName || ''}
                    onChange={e => setEditingReg({...editingReg, userName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Email</label>
                  <input 
                    className="input-field"
                    value={editingReg.userEmail || ''}
                    onChange={e => setEditingReg({...editingReg, userEmail: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Phone</label>
                  <input 
                    className="input-field"
                    value={editingReg.phone || ''}
                    onChange={e => setEditingReg({...editingReg, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">College</label>
                  <input 
                    className="input-field"
                    value={editingReg.college || ''}
                    onChange={e => setEditingReg({...editingReg, college: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Unique Code (Reg ID)</label>
                  <input 
                    className="input-field"
                    value={editingReg.uniqueCode || ''}
                    onChange={e => setEditingReg({...editingReg, uniqueCode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Transaction ID</label>
                  <input 
                    className="input-field"
                    value={editingReg.transactionId || ''}
                    onChange={e => setEditingReg({...editingReg, transactionId: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-primary flex-1 py-4">Save Changes</button>
                <button type="button" onClick={() => setEditingReg(null)} className="btn-secondary flex-1 py-4">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {fullscreenBoard !== 'none' && (
        <div className="fixed inset-0 bg-brand-dark z-[100] flex flex-col p-10">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-serif text-white tracking-widest uppercase">
              {fullscreenBoard === 'quiz' ? 'Live Quiz Leaderboard' : 'Treasure Hunt Progress'}
            </h2>
            <button 
              onClick={() => setFullscreenBoard('none')}
              className="bg-white/10 text-white hover:bg-white/20 p-4 rounded-full transition-all"
            >
              <Square className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
              {fullscreenBoard === 'quiz' ? (
                quizResponses
                  .filter(res => res.quizId === selectedQuizId && res.sessionId === quizConfig?.sessionId)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((res, i) => (
                    <motion.div 
                      key={res.id || res.userId || `fs-qres-${i}`}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center justify-between p-8 rounded-[2.5rem] ${i === 0 ? 'bg-amber-500 scale-105 shadow-2xl shadow-amber-500/20' : 'bg-white border border-gray-100 shadow-xl'}`}
                    >
                      <div className="flex items-center gap-8">
                        <span className={`text-5xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-gray-300'}`}>{i+1}</span>
                        <div>
                          <p className={`text-3xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-black'}`}>{res.quizName || res.userName}</p>
                          <p className={`text-sm tracking-widest uppercase font-bold ${i === 0 ? 'text-brand-dark/60' : 'text-text-muted'}`}>
                            {res.correctCount || 0}/{res.totalQuestions || 0} Solved
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-5xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-brand-primary font-bold'}`}>{res.score}</p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-brand-dark/40' : 'text-text-muted'}`}>Scientific Mastery</p>
                      </div>
                    </motion.div>
                  ))
              ) : (
                treasureProgress
                  .filter(res => res.huntId === selectedHuntId)
                  .sort((a, b) => b.currentClueIndex - a.currentClueIndex)
                  .slice(0, 5)
                  .map((res, i) => (
                    <motion.div 
                      key={res.id || res.userId || `fs-tres-${i}`}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center justify-between p-8 rounded-[2.5rem] ${i === 0 ? 'bg-brand-primary scale-105 shadow-2xl shadow-brand-primary/20 text-white' : 'bg-white border border-gray-100 shadow-xl'}`}
                    >
                      <div className="flex items-center gap-8">
                        <span className={`text-5xl font-serif ${i === 0 ? 'text-white' : 'text-gray-300'}`}>{i+1}</span>
                        <div>
                          <p className={`text-3xl font-serif ${i === 0 ? 'text-white' : 'text-black font-bold'}`}>{res.teamName || res.userName}</p>
                          <p className={`text-sm tracking-widest uppercase font-bold ${i === 0 ? 'text-white/65' : 'text-text-muted'}`}>
                             Currently on Clue #{res.currentClueIndex + 1}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="flex flex-col items-end gap-2">
                           {res.isCompleted ? <Trophy className="text-amber-400 w-12 h-12" /> : <Map className={`${i === 0 ? 'text-white' : 'text-brand-primary'} w-10 h-10 animate-pulse`} />}
                           <p className={`text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-white/50' : 'text-text-muted'}`}>Progress Status</p>
                         </div>
                      </div>
                    </motion.div>
                  ))
              )}
              {(fullscreenBoard === 'quiz' ? quizResponses.filter(res => res.quizId === selectedQuizId && res.sessionId === quizConfig?.sessionId) : treasureProgress).length === 0 && (
                <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-[3rem]">
                   <p className="text-3xl font-serif text-white/20 italic">Waiting for participants to connect...</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Live Action Bar on Fullscreen Projected Screen */}
          <div className="mt-8 flex justify-center gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl max-w-2xl mx-auto shadow-2xl backdrop-blur-md">
            {fullscreenBoard === 'quiz' ? (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  Quiz Status: {quizConfig?.isActive ? (quizConfig?.status === 'playing' ? 'Playing' : 'Lobby Open') : 'Inactive'}
                </span>
                {!quizConfig?.isActive && (
                  <>
                    <button 
                      onClick={activateQuizWithoutReset}
                      className="px-5 py-2 bg-brand-primary hover:bg-brand-dark active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-md transition-all"
                    >
                      <Play className="w-3.5 h-3.5" /> Activate Quiz
                    </button>
                    <button 
                      onClick={openLobbyAndReset}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Open Lobby & Reset
                    </button>
                  </>
                )}
                {quizConfig?.isActive && quizConfig?.status !== 'playing' && (
                  <button 
                    onClick={startQuizAnswers}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg transition-transform animate-pulse"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Quiz
                  </button>
                )}
                {quizConfig?.isActive && (
                  <button 
                    onClick={deactivateQuiz}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" /> Deactivate
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                  Hunt Status: {treasureConfig?.isActive ? (treasureConfig?.status === 'playing' ? 'Playing' : 'Lobby Open') : 'Inactive'}
                </span>
                {!treasureConfig?.isActive && (
                  <button 
                    onClick={openTreasureLobby}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-md transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Open Lobby
                  </button>
                )}
                {treasureConfig?.isActive && treasureConfig?.status !== 'playing' && (
                  <button 
                    onClick={startTreasureHunt}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg transition-transform animate-pulse"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Hunt
                  </button>
                )}
                {treasureConfig?.isActive && (
                  <button 
                    onClick={deactivateTreasure}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" /> Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">RASAYAN 2026 - Live Command Stream</p>
          </div>
        </div>
      )}
    </div>
  );
}
