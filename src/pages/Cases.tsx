import React, { useState, useEffect } from 'react';
import { query, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { casesCol, auditLogsCol } from '../firebase/collections';
import { AuditLog, CaseStatus } from '../types';
import { 
  FolderKanban, Search, X, AlertTriangle, 
  Clock, ShieldAlert, Activity, User, MessageSquare
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
    <div className="flex h-[calc(100vh-8rem)]">
      {/* CASE LIST */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedCase ? 'hidden lg:flex lg:w-1/3 border-r border-[var(--border-subtle)] pr-4' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Case Management</h1>
          </div>
          <span className="badge bg-[var(--accent-light)] text-[var(--accent)]">
            {filteredCases.length} Active
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by case number or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {filteredCases.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCase(c)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedCase?.id === c.id ? 'border-[var(--accent)] bg-[var(--accent-light)]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{c.caseNumber}</span>
                <span className={`badge text-[10px] ${
                  c.status === 'NEW' ? 'bg-rose-500/10 text-rose-600' :
                  c.status === 'IN_REVIEW' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {c.status}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-3">
                <div className="flex items-center gap-1"><User className="h-3 w-3"/> {c.customerId}</div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3"/> {new Date(c.createdAt).toLocaleDateString()}</div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge text-[10px] ${c.riskLevel === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'}`}>
                    {c.riskLevel}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">
                    Score: {c.riskScore}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--accent)] font-semibold">
                  {c.recommendation.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
          {filteredCases.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              No cases found.
            </div>
          )}
        </div>
      </div>

      {/* CASE DETAILS MODAL/PANEL */}
      {selectedCase && (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-root)] lg:pl-4 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCase(null)} className="lg:hidden p-1 bg-[var(--bg-surface-subtle)] rounded-md border border-[var(--border-subtle)]">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-mono">{selectedCase.caseNumber}</h2>
              <span className="badge bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px]">
                {new Date(selectedCase.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={selectedCase.status} 
                onChange={(e) => handleUpdateStatus(e.target.value as CaseStatus)}
                className="text-xs bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1 outline-none text-[var(--text-primary)]"
              >
                <option value="NEW">NEW</option>
                <option value="IN_REVIEW">IN REVIEW</option>
                <option value="ACTIONED">ACTIONED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <button onClick={() => setSelectedCase(null)} className="hidden lg:flex p-1.5 hover:bg-[var(--bg-surface-subtle)] rounded-md transition-colors text-[var(--text-muted)]">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 flex flex-col lg:flex-row gap-6">
            
            {/* LEFT DETAILS */}
            <div className="w-full lg:w-2/3 space-y-6">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-3 rounded-lg border-rose-500/30">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Risk Level</div>
                  <div className="font-bold text-rose-500">{selectedCase.riskLevel} ({selectedCase.riskScore})</div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Customer</div>
                  <div className="font-bold text-[var(--text-primary)]">{selectedCase.customerId}</div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Transaction</div>
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">{selectedCase.transactionId}</div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Decision</div>
                  <div className="font-bold text-[var(--text-primary)] text-xs">{selectedCase.recommendation.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* NARRATIVE */}
              <div className="glass-card p-4 rounded-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Investigation Summary
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {selectedCase.investigationSummary || selectedCase.verdict || "No summary provided."}
                </p>
              </div>

              {/* REASON CODES */}
              {selectedCase.reasonCodes && selectedCase.reasonCodes.length > 0 && (
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Triggered Reason Codes
                  </h3>
                  <div className="space-y-2">
                    {selectedCase.reasonCodes.map((rc: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">
                        <span className="font-medium text-[var(--text-primary)]">{rc.title}</span>
                        <span className="font-mono text-rose-500 font-bold">+{rc.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AGENT FINDINGS & EVIDENCE (If stored in case) */}
              {selectedCase.agentFindings && selectedCase.agentFindings.length > 0 && (
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Agent Findings
                  </h3>
                  <div className="space-y-3">
                    {selectedCase.agentFindings.map((f: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-subtle)]">
                        <div className="font-bold text-xs text-[var(--text-primary)] mb-1 uppercase">{f.agent}</div>
                        <div className="text-xs text-[var(--text-secondary)] mb-2">{f.summary}</div>
                        {f.evidenceItems && f.evidenceItems.length > 0 && (
                          <div className="pl-3 border-l-2 border-[var(--accent)] space-y-1">
                            {f.evidenceItems.map((ev: any, evIdx: number) => (
                              <div key={evIdx} className="text-[11px] text-[var(--text-secondary)]">
                                <span className="font-semibold">{ev.title}:</span> {ev.description}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT AUDIT LOG & NOTES */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              {/* NOTES INPUT */}
              <div className="glass-card p-3 rounded-lg shrink-0">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Add Note
                </h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter analyst notes..."
                  className="w-full h-20 p-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded resize-none focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
                />
                <div className="flex justify-end mt-2">
                  <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary py-1.5 px-4 text-xs">
                    Save Note
                  </button>
                </div>
              </div>

              {/* AUDIT TIMELINE */}
              <div className="glass-card p-3 rounded-lg flex-1 min-h-0 flex flex-col">
                <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Audit History
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:w-0.5 before:bg-[var(--border-subtle)] pr-1">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--accent)] shrink-0 mt-0.5 z-10" />
                      <div className="bg-[var(--bg-surface-subtle)] p-2.5 rounded-lg border border-[var(--border-subtle)] flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {log.details.note ? (
                            <span className="italic">"{String(log.details.note)}"</span>
                          ) : log.details.newStatus ? (
                            <span>Changed status to <strong>{String(log.details.newStatus)}</strong></span>
                          ) : log.details.action ? (
                            <span>Determined action: <strong>{String(log.details.action)}</strong></span>
                          ) : (
                            <span className="font-mono text-[9px]">{JSON.stringify(log.details)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
