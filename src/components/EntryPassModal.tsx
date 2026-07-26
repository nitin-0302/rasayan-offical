import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Download, QrCode, X, Sparkles, Building2, User, Calendar, CheckCircle2, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { EVENTS } from '../constants/events';

interface EntryPassModalProps {
  registration: {
    id?: string;
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
  };
  onClose: () => void;
}

export default function EntryPassModal({ registration, onClose }: EntryPassModalProps) {
  const passRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR code with pass details
  const passData = `Rasayan 2026 Pass | Code: ${registration.uniqueCode} | Participant: ${registration.userName}`;
  
  // High quality QR code URL from QRServer in deep crimson red tint
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(passData)}&color=881337&bgcolor=ffffff&margin=10`;

  const copyCode = () => {
    navigator.clipboard.writeText(registration.uniqueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = async () => {
    if (!passRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 3, // High DPI for crisp QR code & typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Rasayan2026_EntryPass_${registration.uniqueCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Pass export error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!passRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rasayan2026_OfficialPass_${registration.uniqueCode}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const regEvents = registration.eventIds.map(eid => EVENTS.find(e => e.id === eid)).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-100 my-auto"
      >
        {/* Modal Top Control Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              Official Digital Entry Pass
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PASS DISPLAY CANVAS FOR PRINT / EXPORT */}
        <div className="p-4 sm:p-6 overflow-x-auto flex justify-center">
          <div
            ref={passRef}
            className="w-full max-w-[620px] bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900 border-2 border-red-500/50 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl text-left select-none"
            style={{ minWidth: '320px' }}
          >
            {/* Holographic Crimson Watermark & Chemistry Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top Pass Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-red-500/20 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-serif font-black text-white text-xl shadow-lg shadow-red-500/30 ring-1 ring-white/20">
                  R
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-serif font-bold text-white tracking-wide">RASAYAN 2026</h2>
                    <span className="bg-red-500/20 border border-red-400/40 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      OFFICIAL PASS
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-200/80 font-medium">
                    K J Somaiya College of Science and Commerce • Mumbai
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-rose-950/80 border border-red-500/40 px-3 py-1 rounded-full text-red-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>#RSN-{registration.uniqueCode}</span>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-5 relative z-10">
              {/* Participant Details */}
              <div className="sm:col-span-2 space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/90 block mb-0.5">
                    Participant Name
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <User className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{registration.userName}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">College / Institution</span>
                    <p className="font-semibold text-slate-200 truncate flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{registration.college || 'K J Somaiya College'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Date & Venue</span>
                    <p className="font-semibold text-slate-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Dec 16, 2026 • Campus</span>
                    </p>
                  </div>
                </div>

                {/* Registered Events List */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/90 block mb-1">
                    Registered Events ({regEvents.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {regEvents.map((e, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-900/90 border border-red-500/35 text-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md"
                      >
                        {e?.name || 'Event'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-red-400" /> Payment Verified
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {registration.uniqueCode}
                  </span>
                </div>
              </div>

              {/* Unique Verification QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 bg-white/95 border border-red-400/40 rounded-xl shadow-inner text-center">
                <img
                  src={qrCodeImageUrl}
                  alt={`Pass QR Code for ${registration.uniqueCode}`}
                  className="w-32 h-32 object-contain rounded-lg border border-slate-200 shadow-sm"
                  crossOrigin="anonymous"
                />
                <p className="text-[9px] font-bold text-slate-900 uppercase tracking-wider mt-2 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-rose-800 shrink-0" />
                  Scan to Verify
                </p>
                <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                  ID: #{registration.uniqueCode}
                </span>
              </div>
            </div>

            {/* Bottom Pass Footer */}
            <div className="pt-3 border-t border-red-500/20 flex flex-col sm:flex-row justify-between items-center gap-2 relative z-10 text-[10px] text-slate-400">
              <p className="flex items-center gap-1 text-red-300/80">
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                Anti-counterfeit Encrypted • Official Rasayan 2026 Security Seal
              </p>
              <span className="font-mono text-[9px]">
                Valid for entry on Dec 16, 2026
              </span>
            </div>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-red-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Code Copied!' : `Pass Code: ${registration.uniqueCode}`}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              className="text-xs bg-rose-950 text-red-300 border border-red-500/40 hover:bg-rose-900 px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG Image</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center gap-1.5"
            >
              {isDownloading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF Pass</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
