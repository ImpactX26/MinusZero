import React, { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { casesCol, auditLogsCol } from '../firebase/collections';
import { AuditLog, CaseStatus } from '../types';
import { 
  FolderKanban, Search, X, 
  Clock, ShieldAlert, MessageSquare
} from 'lucide-react';

export const Cases: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const q = query(casesCol(), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData: any[] = [];
      snapshot.forEach((doc) => {
        casesData.push({ ...doc.data(), id: doc.id });
      });
      setCases(casesData);
      
      // Update selected case if it's currently open
      if (selectedCase) {
        const updated = casesData.find(c => c.id === selectedCase.id);
        if (updated) setSelectedCase(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedCase]);

  useEffect(() => {
    if (!selectedCase) return;
    const q = query(auditLogsCol(), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AuditLog;
        if (data.objectId === selectedCase.id) {
          logs.push({ ...data, id: doc.id });
        }
      });
      setAuditLogs(logs);
    });
    return () => unsubscribe();
  }, [selectedCase]);

  const filteredCases = cases.filter(c => 
    c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateStatus = async (status: CaseStatus) => {
    if (!selectedCase) return;
    try {
      await updateDoc(doc(casesCol(), selectedCase.id), { status, updatedAt: new Date().toISOString() });
      await addDoc(auditLogsCol(), {
        actor: 'INVESTIGATOR',
        action: 'STATUS_CHANGED',
        objectType: 'CASE',
        objectId: selectedCase.id,
        details: { newStatus: status },
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async () => {
    if (!selectedCase || !newNote.trim()) return;
    try {
      await addDoc(auditLogsCol(), {
        actor: 'INVESTIGATOR',
        action: 'NOTE_ADDED',
        objectType: 'CASE',
        objectId: selectedCase.id,
        details: { note: newNote.trim() },
        createdAt: new Date().toISOString()
      });
      setNewNote('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-7.5rem)] min-h-[680px] gap-4">
      {/* ─── CASE DIRECTORY LIST ────────────────────────────────────────────── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selectedCase ? 'hidden lg:flex lg:w-96 shrink-0' : 'w-full'}`}>
        <div className="glass-card p-4 flex flex-col h-full border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                <FolderKanban className="h-4 w-4" />
              </div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">Case Queue</h1>
            </div>
            <span className="badge text-[10px] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
              {filteredCases.length} Active
            </span>
          </div>

          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Filter by case number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 text-xs py-1.5"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {filteredCases.map(c => {
              const isSelected = selectedCase?.id === c.id;
              const isCritical = c.riskLevel === 'CRITICAL';

              return (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCase(c)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-[var(--accent)] bg-[#EEF2FF] dark:bg-[#5B6FEA]/10 shadow-xs' 
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{c.caseNumber}</span>
                    <span className={`badge text-[9px] font-mono ${
                      c.status === 'NEW' ? 'bg-[#FEF2F2] text-[#C43D4B] border border-[#FEE2E2]' :
                      c.status === 'IN_REVIEW' ? 'bg-[#FEFCE8] text-[#B7791F] border border-[#FEF08A]' :
                      'bg-[#F0FDF4] text-[#16866A] border border-[#BBF7D0]'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2 font-mono text-[11px]">
                    <span className="text-[var(--accent)] font-semibold">{c.customerId}</span>
                    <span className="text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]">
                    <span className={`badge text-[9px] font-mono ${isCritical ? 'bg-[#FEF2F2] text-[#C43D4B] border border-[#FEE2E2]' : 'bg-[#FFF7ED] text-[#C65D1E] border border-[#FFEDD5]'}`}>
                      {c.riskLevel} • {c.riskScore}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[130px]">
                      {c.recommendation.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredCases.length === 0 && (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                No investigation cases found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CASE DETAILS PANEL ─────────────────────────────────────────────── */}
      {selectedCase ? (
        <div className="flex-1 flex flex-col glass-card border-[var(--border-subtle)] p-5 overflow-hidden animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSelectedCase(null)} className="lg:hidden p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-[var(--text-primary)] font-mono">{selectedCase.caseNumber}</h2>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {new Date(selectedCase.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Status:</span>
              <select 
                value={selectedCase.status} 
                onChange={(e) => handleUpdateStatus(e.target.value as CaseStatus)}
                className="text-xs bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2.5 py-1 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--accent)]"
              >
                <option value="NEW">NEW</option>
                <option value="IN_REVIEW">IN REVIEW</option>
                <option value="ACTIONED">ACTIONED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <button onClick={() => setSelectedCase(null)} className="hidden lg:flex p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded text-[var(--text-muted)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 flex flex-col lg:flex-row gap-5">
            {/* Left 2-Column Information Area */}
            <div className="w-full lg:w-2/3 space-y-4">
              {/* Summary Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[10px] uppercase font-medium text-[var(--text-muted)]">Risk Level</div>
                  <div className="font-bold text-xs text-[#C43D4B] mt-1 font-mono">{selectedCase.riskLevel} ({selectedCase.riskScore})</div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[10px] uppercase font-medium text-[var(--text-muted)]">Customer Target</div>
                  <div className="font-mono text-xs font-bold text-[var(--accent)] mt-1">{selectedCase.customerId}</div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[10px] uppercase font-medium text-[var(--text-muted)]">Triggering Txn</div>
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">{selectedCase.transactionId}</div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[10px] uppercase font-medium text-[var(--text-muted)]">Recommended Action</div>
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] mt-1 truncate">{selectedCase.recommendation.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* Investigation Narrative */}
              <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Synthesized Investigation Summary</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedCase.investigationSummary || selectedCase.verdict || "No summary narrative on record."}
                </p>
              </div>

              {/* Triggered Reason Codes */}
              {selectedCase.reasonCodes && selectedCase.reasonCodes.length > 0 && (
                <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5">
                  <div className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                    Triggered Reason Codes
                  </div>
                  <div className="space-y-1.5">
                    {selectedCase.reasonCodes.map((rc: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">
                        <span className="font-medium text-[var(--text-primary)]">{rc.title}</span>
                        <span className="font-mono text-[#C43D4B] font-bold text-[11px]">+{rc.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Notes & Audit Trail */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              {/* Analyst Note Input */}
              <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] mb-2">
                  <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Append Case Note</span>
                </div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter analyst observations..."
                  className="input-field text-xs h-20 resize-none mb-2"
                />
                <div className="flex justify-end">
                  <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary text-xs py-1 px-3">
                    Save to Ledger
                  </button>
                </div>
              </div>

              {/* Audit History Timeline */}
              <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] mb-3">
                  <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Audit History Timeline</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 relative before:absolute before:inset-0 before:ml-[7px] before:w-0.5 before:bg-[var(--border-subtle)] pr-1">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-3 pl-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--accent)] shrink-0 mt-0.5 z-10" />
                      <div className="bg-[var(--bg-surface-subtle)] p-2 rounded border border-[var(--border-subtle)] flex-1 text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-[var(--text-primary)] text-[11px]">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {log.details.note ? (
                            <span className="italic">"{String(log.details.note)}"</span>
                          ) : log.details.newStatus ? (
                            <span>Status changed to <strong>{String(log.details.newStatus)}</strong></span>
                          ) : log.details.action ? (
                            <span>Determination applied: <strong>{String(log.details.action)}</strong></span>
                          ) : (
                            <span className="font-mono text-[10px]">{JSON.stringify(log.details)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] text-[11px]">
                      No audit events logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center glass-card border-[var(--border-subtle)] p-12 text-center text-[var(--text-muted)]">
          <FolderKanban className="h-8 w-8 opacity-30 mb-2" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Select a Case</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
            Pick any open fraud case from the queue to view evidence summaries, reason code weights, and the audit timeline.
          </p>
        </div>
      )}
    </div>
  );
};
export default Cases;
