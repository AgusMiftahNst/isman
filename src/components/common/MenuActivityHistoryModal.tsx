import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Clock,
  User,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  MenuActivityLogItem,
  fetchMenuActivities,
  recordMenuActivity,
  getOperatorColor
} from './MenuActivityLogger';
import { getDeviceOperatorName } from './DeviceRegistrationModal';

interface MenuActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuKey: string;
  menuTitle: string;
  year: string;
  onOpenDetailedVersionDiff?: () => void; // Optional: To open Google Sheets style diff modal (Audit Universe & Mandatory)
}

export const MenuActivityHistoryModal: React.FC<MenuActivityHistoryModalProps> = ({
  isOpen,
  onClose,
  menuKey,
  menuTitle,
  year,
  onOpenDetailedVersionDiff
}) => {
  const [activities, setActivities] = useState<MenuActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Note Form
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Load activities on mount & listen to real-time changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const list = await fetchMenuActivities(menuKey, year);
        if (isMounted) {
          setActivities(list);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Load activities error:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Listen to real-time updates from Firestore for this menu
    const docId = `${menuKey}_${year}`;
    const unsub = onSnapshot(doc(db, 'menu_activities', docId), (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.activities)) {
        if (isMounted) {
          // Merge with any existing versions
          fetchMenuActivities(menuKey, year).then(fullList => {
            if (isMounted) setActivities(fullList);
          });
        }
      }
    }, (err) => {
      console.warn('Real-time activity listener warning:', err);
    });

    // Listen to local event dispatch
    const handleLocalEvent = (e: any) => {
      if (e.detail?.menuKey === menuKey) {
        fetchMenuActivities(menuKey, year).then(fullList => {
          if (isMounted) setActivities(fullList);
        });
      }
    };
    window.addEventListener('menu_activity_recorded', handleLocalEvent);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener('menu_activity_recorded', handleLocalEvent);
    };
  }, [isOpen, menuKey, year]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const list = await fetchMenuActivities(menuKey, year);
      setActivities(list);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleAddManualNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const currentOp = getDeviceOperatorName() || 'Operator';
      await recordMenuActivity({
        menuKey,
        menuTitle,
        year,
        action: 'Catatan Tim',
        detail: noteText.trim(),
        operatorName: currentOp
      });
      setNoteText('');
      setShowAddNote(false);
      const list = await fetchMenuActivities(menuKey, year);
      setActivities(list);
    } catch (err) {
      console.warn('Add note error:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Distinct operators for filter dropdown
  const uniqueOperators = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => {
      if (a.operatorName && a.operatorName.trim()) {
        set.add(a.operatorName.trim());
      }
    });
    return Array.from(set).sort();
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchOperator = selectedOperatorFilter === 'ALL' || a.operatorName === selectedOperatorFilter;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchOperator;
      const matchSearch =
        (a.operatorName || '').toLowerCase().includes(q) ||
        (a.action || '').toLowerCase().includes(q) ||
        (a.detail || '').toLowerCase().includes(q) ||
        (a.formattedTime || '').toLowerCase().includes(q);
      return matchOperator && matchSearch;
    });
  }, [activities, selectedOperatorFilter, searchTerm]);

  // Helper for action badges
  const getActionBadgeClass = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('tambah') || act.includes('baru')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (act.includes('hapus')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (act.includes('pulih') || act.includes('restore')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (act.includes('sinkron')) {
      return 'bg-teal-100 text-teal-800 border-teal-200';
    }
    if (act.includes('catatan')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Riwayat Aktivitas: {menuTitle}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-400/20 text-indigo-300 border border-indigo-400/30 rounded-md text-[10px] font-extrabold uppercase">
                  Tahun {year}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Melihat siapa yang sudah mengerjakan apa pada menu ini • Riwayat tersimpan rapi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Segarkan data riwayat"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Tutup jendela riwayat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Summary Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600">
              Total Aktivitas Tercatat: <strong className="text-slate-900 font-bold">{activities.length}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-600">
              Kontributor: <strong className="text-slate-900 font-bold">{uniqueOperators.length} orang</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDetailedVersionDiff && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetailedVersionDiff();
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                title="Buka perbandingan versi spreadsheet dengan sorotan warna per sel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Buka Versi Spreadsheet (Sorot Perubahan)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddNote(!showAddNote)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showAddNote ? 'Tutup Input Catatan' : 'Tambah Catatan Pekerjaan'}</span>
            </button>
          </div>
        </div>

        {/* Optional Add Manual Note Form */}
        {showAddNote && (
          <form onSubmit={handleAddManualNote} className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Contoh: Selesai mereviu LKPD dan menyesuaikan alokasi mandays bersama tim..."
              className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmittingNote || !noteText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simpan Catatan</span>
            </button>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aktivitas atau nama orang..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">Filter Orang:</span>
            <select
              value={selectedOperatorFilter}
              onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer hover:bg-white transition"
            >
              <option value="ALL">Semua Kontributor ({activities.length})</option>
              {uniqueOperators.map(op => {
                const count = activities.filter(a => a.operatorName === op).length;
                return (
                  <option key={op} value={op}>
                    {op} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Activity Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-100/60">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Memuat rekaman aktivitas...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Belum Ada Catatan Aktivitas</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm || selectedOperatorFilter !== 'ALL'
                  ? 'Tidak ada aktivitas yang cocok dengan kata kunci atau filter yang dipilih.'
                  : 'Setiap kali seseorang menambah, mengedit, atau menghapus data di menu ini, rekamannya akan otomatis muncul di sini.'}
              </p>
            </div>
          ) : (
            filteredActivities.map((act, idx) => {
              const color = getOperatorColor(act.operatorName);
              const isFirst = idx === 0;

              return (
                <div
                  key={act.id}
                  className={`p-4 bg-white rounded-xl border transition flex items-start gap-3.5 shadow-2xs hover:shadow-xs ${
                    isFirst ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
                  }`}
                >
                  {/* Avatar Initials with color */}
                  <div
                    className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs text-white shadow-2xs ${color.bg}`}
                    title={act.operatorName}
                  >
                    {act.operatorName.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-xs tracking-tight">
                          {act.operatorName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getActionBadgeClass(
                            act.action
                          )}`}
                        >
                          {act.action}
                        </span>
                        {isFirst && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase tracking-widest">
                            Terbaru
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{act.formattedTime}</span>
                      </div>
                    </div>

                    {/* Detailed Activity Description */}
                    <p className="text-xs text-slate-700 font-medium leading-relaxed mt-0.5">
                      {act.detail}
                    </p>

                    {/* Optional extra metadata */}
                    {act.itemCount !== undefined && act.itemCount > 0 && (
                      <div className="mt-2 text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span>Total data saat itu: {act.itemCount} baris</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-slate-500 italic">
            *Setiap aktivitas disimpan langsung di Cloud Firestore sehingga seluruh rekan tim dapat melihat siapa yang mengerjakan apa.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
