import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { X, Upload, Link as LinkIcon, FileText, CheckCircle2, AlertCircle, Image as ImageIcon, Video, Sparkles, Loader2 } from 'lucide-react';
import { Event } from '../constants/events';

interface OnlineSubmissionModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OnlineSubmissionModal({ event, isOpen, onClose, onSuccess }: OnlineSubmissionModalProps) {
  const { user, profile } = useAuth();
  
  const [submissionType, setSubmissionType] = useState<'file' | 'link'>('file');
  const [caption, setCaption] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userCollege, setUserCollege] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing submission if available
  useEffect(() => {
    if (!isOpen || !user) return;

    setFetchingExisting(true);
    setStatusMsg(null);

    // Auto-fill profile defaults
    setUserName(profile?.name || user.displayName || '');
    setUserEmail(profile?.email || user.email || '');
    setUserPhone(profile?.phone || '');
    setUserCollege(profile?.college || '');

    const subDocId = `sub_${user.uid}_${event.id}`;
    getDoc(doc(db, 'online_submissions', subDocId))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExistingSubmission(data);
          setSubmissionType(data.submissionType || 'file');
          setCaption(data.caption || '');
          setExternalLink(data.externalLink || '');
          if (data.fileData) {
            setFileData(data.fileData);
            setFileName(data.fileName || 'Uploaded File');
            setFileSize(data.fileSize || '');
            setFileType(data.fileType || '');
          }
        } else {
          setExistingSubmission(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching existing submission:", err);
      })
      .finally(() => {
        setFetchingExisting(false);
      });
  }, [isOpen, user, event.id, profile]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({
        type: 'error',
        text: 'File size exceeds 10MB limit. For larger video files or high-res assets, please choose "Google Drive / External Link" submission option.'
      });
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setFileType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileData(reader.result as string);
      setStatusMsg(null);
    };
    reader.onerror = () => {
      setStatusMsg({ type: 'error', text: 'Failed to read file. Please try again.' });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatusMsg({ type: 'error', text: 'You must be signed in to submit data.' });
      return;
    }

    if (!userName.trim() || !userEmail.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in your name and email.' });
      return;
    }

    if (submissionType === 'file' && !fileData) {
      setStatusMsg({ type: 'error', text: 'Please select a file to upload or switch to External Link submission.' });
      return;
    }

    if (submissionType === 'link' && !externalLink.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid URL link (e.g. Google Drive, YouTube, Instagram Reel).' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const subDocId = `sub_${user.uid}_${event.id}`;
      const payload = {
        id: subDocId,
        userId: user.uid,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        userCollege: userCollege.trim(),
        eventId: event.id,
        eventName: event.name,
        eventCategory: event.category || 'Online Competition',
        submissionType,
        caption: caption.trim(),
        externalLink: submissionType === 'link' ? externalLink.trim() : (externalLink.trim() || null),
        fileData: submissionType === 'file' ? fileData : (fileData || null),
        fileName: submissionType === 'file' ? fileName : (fileName || null),
        fileSize: submissionType === 'file' ? fileSize : (fileSize || null),
        fileType: submissionType === 'file' ? fileType : (fileType || null),
        submittedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        status: 'received'
      };

      await setDoc(doc(db, 'online_submissions', subDocId), payload);

      setStatusMsg({
        type: 'success',
        text: `Submission uploaded successfully for ${event.name}! Submission Ref: #${subDocId.toUpperCase().slice(-8)}`
      });

      setExistingSubmission(payload);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error saving submission:", err);
      handleFirestoreError(err, OperationType.WRITE, 'online_submissions');
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to submit data. Please check your internet connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 border-b border-gray-100 pb-4 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-soft text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
            <Sparkles className="w-3 h-3" /> Online Event Submission Portal
          </div>
          <h2 className="text-2xl font-serif font-bold text-brand-dark">{event.name}</h2>
          <p className="text-xs text-text-muted mt-1">
            Upload your artwork, photos, reels, memes, or project data for this competition.
          </p>
        </div>

        {fetchingExisting ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Checking existing submission data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Alert Banner */}
            {statusMsg && (
              <div
                className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {existingSubmission && !statusMsg && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Previous Submission Recorded</p>
                    <p className="text-[10px] text-emerald-700">
                      Submitted on: {new Date(existingSubmission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-200/60 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Status: {existingSubmission.status}
                </span>
              </div>
            )}

            {/* Submission Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                Choose Upload Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSubmissionType('file')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                    submissionType === 'file'
                      ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                      : 'bg-gray-50 text-text-muted border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File / Image
                </button>

                <button
                  type="button"
                  onClick={() => setSubmissionType('link')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                    submissionType === 'link'
                      ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                      : 'bg-gray-50 text-text-muted border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Google Drive / Reel Link
                </button>
              </div>
            </div>

            {/* File Upload Box */}
            {submissionType === 'file' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                  Select File (Image / PDF / Artwork / Reel Clip)
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-brand-primary rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-brand-soft/10 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*,.pdf,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-primary shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                      {fileType?.startsWith('image') ? (
                        <ImageIcon className="w-6 h-6" />
                      ) : fileType?.startsWith('video') ? (
                        <Video className="w-6 h-6" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-dark">
                        {fileName ? fileName : 'Click or Drag & Drop file here to upload'}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {fileSize ? `File Size: ${fileSize}` : 'Supports PNG, JPG, WEBP, PDF, MP4 (Max 10MB)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Preview if Image */}
                {fileData && fileType?.startsWith('image') && (
                  <div className="mt-3 p-2 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                    <p className="text-[10px] font-bold uppercase text-text-muted mb-1 px-1">File Preview:</p>
                    <img
                      src={fileData}
                      alt="Submission Preview"
                      className="max-h-48 w-full object-contain rounded-xl bg-white"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* External Link Box */
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                  Submission URL / Link <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... or Instagram Reel link"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="input-field pl-10 text-xs font-mono"
                    required={submissionType === 'link'}
                  />
                </div>
                <p className="text-[10px] text-text-muted leading-tight">
                  For videos, Instagram Reels, or large Google Drive files, ensure link sharing permissions are set to <strong>"Anyone with link can view"</strong>.
                </p>
              </div>
            )}

            {/* Description / Concept Note */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                Concept & Description / Caption
              </label>
              <textarea
                rows={3}
                placeholder="Explain the concept behind your artwork, photo, reel, or meme and how it connects to Panchatatva or Green Chemistry..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-field text-xs resize-none"
              />
            </div>

            {/* Participant Contact Info (Autofilled / Editable) */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-primary" /> Participant Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase">Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="input-field text-xs py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase">Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="input-field text-xs py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase">College / Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. Somaiya College"
                    value={userCollege}
                    onChange={(e) => setUserCollege(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-3 px-6 text-xs font-bold w-1/3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-3 px-6 text-xs font-bold w-2/3 flex items-center justify-center gap-2 disabled:bg-gray-300 cursor-pointer shadow-lg shadow-brand-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading Data...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {existingSubmission ? 'Update Submission' : 'Submit Entry Now'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
