import React, { useState } from 'react';
import { KematanganMRItem, INITIAL_KEMATANGAN_MR, AuditUniverseItem, INITIAL_AUDIT_UNIVERSE } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  BarChart2,
  Plus,
  Trash2,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  RotateCcw,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SyncedOpdItem {
  opdName: string;
  programCount: number;
  programs: string[];
  alreadyExists: boolean;
  existingLevel?: number;
  selected: boolean;
  assignedLevel: number;
}

export const KematanganMRView: React.FC = () => {
  const [data, setData] = useState<KematanganMRItem[]>(() => {
    const saved = localStorage.getItem('ppbr_kematangan_mr');
    return saved ? JSON.parse(saved) : INITIAL_KEMATANGAN_MR;
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KematanganMRItem | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncOpdList, setSyncOpdList] = useState<SyncedOpdItem[]>([]);
  const [syncSearchTerm, setSyncSearchTerm] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [bulkLevel, setBulkLevel] = useState<number>(3);

  const [newItem, setNewItem] = useState<{ unitKerja: string; level: number; keterangan: string }>({
    unitKerja: '',
    level: 3,
    keterangan: 'Terdefinisi (Level 3)'
  });

  const getLevelDetails = (lvl: number) => {
    switch (lvl) {
      case 1:
        return {
          label: 'Level 1: Rintisan (Initial)',
          bobot: 0,
          strategi: 'Fasilitasi penyusunan Risk Register awal',
          badge: 'bg-rose-100 text-rose-800 border-rose-200'
        };
      case 2:
        return {
          label: 'Level 2: Terkelola (Managed)',
          bobot: 40,
          strategi: 'Fasilitasi penerapan MR dan audit ketaatan/kinerja',
          badge: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 3:
        return {
          label: 'Level 3: Terdefinisi (Defined)',
          bobot: 70,
          strategi: 'Fasilitasi internalisasi MR dan audit ketaatan/kinerja berbasis risiko',
          badge: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 4:
        return {
          label: 'Level 4: Terukur (Measured)',
          bobot: 85,
          strategi: 'Audit kinerja berbasis risiko dan evaluasi efektivitas MR',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
        };
      case 5:
        return {
          label: 'Level 5: Optimal (Optimized)',
          bobot: 100,
          strategi: 'Continuous auditing / monitoring dan audit strategis terpadu',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      default:
        return {
          label: 'Level 1',
          bobot: 0,
          strategi: 'Fasilitasi penyusunan Risk Register',
          badge: 'bg-slate-100 text-slate-800 border-slate-200'
        };
    }
  };

  const handleSaveData = (newData: KematanganMRItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_kematangan_mr', JSON.stringify(newData));
  };

  const handleLevelChange = (id: string, newLevel: number) => {
    const details = getLevelDetails(newLevel);
    const updated = data.map(item => {
      if (item.id === id) {
        return {
          ...item,
          kematanganMR: newLevel,
          bobotRegisterRisiko: details.bobot,
          strategiPengawasan: details.strategi,
          keterangan: details.label
        };
      }
      return item;
    });
    handleSaveData(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const details = getLevelDetails(newItem.level);
    const item: KematanganMRItem = {
      id: `kmr-${Date.now()}`,
      no: data.length + 1,
      unitKerja: newItem.unitKerja,
      kematanganMR: newItem.level,
      bobotRegisterRisiko: details.bobot,
      strategiPengawasan: details.strategi,
      keterangan: details.label
    };
    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ unitKerja: '', level: 3, keterangan: 'Terdefinisi (Level 3)' });
    setNotification(`Unit kerja "${item.unitKerja}" berhasil ditambahkan.`);
  };

  const handleOpenEdit = (item: KematanganMRItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const details = getLevelDetails(editingItem.kematanganMR);
    const updatedItem: KematanganMRItem = {
      ...editingItem,
      bobotRegisterRisiko: details.bobot,
      strategiPengawasan: details.strategi,
      keterangan: details.label
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
    setNotification(`Data unit kerja "${updatedItem.unitKerja}" berhasil diperbarui.`);
  };

  const requestDelete = (item: KematanganMRItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Unit Kerja dari Tabel Kematangan MR?',
      message: 'Apakah Anda yakin ingin menghapus data unit kerja ini dari tabel tingkat kematangan MR?',
      detail: `Unit Kerja: "${item.unitKerja}" | Level Kematangan: Level ${item.kematanganMR} (${item.keterangan})`,
      confirmText: 'Ya, Hapus Unit',
      variant: 'danger',
      onConfirm: () => {
        const updated = data.filter(d => d.id !== item.id).map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
        setNotification(`Unit kerja "${item.unitKerja}" telah dihapus.`);
      }
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Kematangan MR?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan semua data (${data.length} unit kerja) pada tabel Tingkat Kematangan Manajemen Risiko?`,
      detail: 'Seluruh penilaian level kematangan dan bobot register risiko OPD akan dibersihkan.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
        setNotification('Semua data tabel Kematangan MR telah dikosongkan.');
      }
    });
  };

  // ==========================================
  // OPD SYNCHRONIZATION FROM MENU 1 (AUDIT UNIVERSE)
  // ==========================================
  const handleOpenSyncModal = () => {
    let auData: AuditUniverseItem[] = [];
    const savedAU = localStorage.getItem('ppbr_audit_universe');
    if (savedAU) {
      try {
        const parsed = JSON.parse(savedAU);
        if (Array.isArray(parsed) && parsed.length > 0) {
          auData = parsed;
        }
      } catch (e) {
        console.error('Failed to parse ppbr_audit_universe', e);
      }
    }
    if (auData.length === 0) {
      auData = INITIAL_AUDIT_UNIVERSE;
    }

    const opdMap = new Map<string, { opdName: string; programs: string[] }>();

    const addOpdToMap = (cleanName: string, au: AuditUniverseItem) => {
      const key = cleanName.toLowerCase();
      const prog = au.programRpjmd || au.programRenstra || `Program Baris #${au.no}`;
      if (!opdMap.has(key)) {
        opdMap.set(key, { opdName: cleanName, programs: [prog] });
      } else {
        const existing = opdMap.get(key)!;
        if (!existing.programs.includes(prog)) {
          existing.programs.push(prog);
        }
      }
    };

    auData.forEach(item => {
      const raw = (item.opdPengampu || '').trim();
      if (!raw || raw === '-' || raw.toLowerCase() === 'n/a') return;

      const lines = raw.split(/\r?\n/);
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Split on semicolon or commas if followed by common OPD prefixes
        if (trimmed.includes(';') || (trimmed.includes(',') && /(?:dinas|badan|inspektorat|rsud|satpol|bappeda|sekretariat|bagian)/i.test(trimmed.split(',')[1] || ''))) {
          const parts = trimmed.split(/[,;]/);
          parts.forEach(p => {
            const cleanP = p.trim();
            if (cleanP) addOpdToMap(cleanP, item);
          });
        } else {
          addOpdToMap(trimmed, item);
        }
      });
    });

    let items: SyncedOpdItem[] = [];
    let noticeMessage: string | null = null;

    if (opdMap.size === 0) {
      noticeMessage = 'Belum ada Perangkat Daerah (OPD) yang terdata pada kolom "OPD/Unit Pengampu" di Menu 1 (Audit Universe). Silakan isi kolom OPD Pengampu pada Menu 1 terlebih dahulu.';
      items = [];
    } else {
      items = Array.from(opdMap.values()).map(item => {
        const norm = item.opdName.trim().toLowerCase();
        const existingMatch = data.find(d => d.unitKerja.trim().toLowerCase() === norm);
        const alreadyExists = !!existingMatch;
        return {
          opdName: item.opdName,
          programCount: item.programs.length,
          programs: item.programs,
          alreadyExists,
          existingLevel: existingMatch?.kematanganMR,
          selected: !alreadyExists, // default select non-existing
          assignedLevel: existingMatch?.kematanganMR || 3
        };
      });

      // If all items already exist, select all by default so user can update if they want
      const anyNew = items.some(i => !i.alreadyExists);
      if (!anyNew) {
        items = items.map(i => ({ ...i, selected: true }));
      }
    }

    // Sort: new items first, then alphabetical
    items.sort((a, b) => {
      if (a.alreadyExists !== b.alreadyExists) {
        return a.alreadyExists ? -1 : 1;
      }
      return a.opdName.localeCompare(b.opdName);
    });

    setSyncOpdList(items);
    setSyncNotice(noticeMessage);
    setSyncSearchTerm('');
    setBulkLevel(3);
    setShowSyncModal(true);
  };

  const handleToggleSyncSelect = (opdName: string) => {
    setSyncOpdList(prev =>
      prev.map(item =>
        item.opdName === opdName ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAllSync = (val: boolean) => {
    setSyncOpdList(prev => prev.map(item => ({ ...item, selected: val })));
  };

  const handleSelectNewOnlySync = () => {
    setSyncOpdList(prev =>
      prev.map(item => ({ ...item, selected: !item.alreadyExists }))
    );
  };

  const handleSyncRowLevelChange = (opdName: string, newLvl: number) => {
    setSyncOpdList(prev =>
      prev.map(item =>
        item.opdName === opdName ? { ...item, assignedLevel: newLvl } : item
      )
    );
  };

  const handleApplyBulkLevel = (lvl: number) => {
    setBulkLevel(lvl);
    setSyncOpdList(prev =>
      prev.map(item => (item.selected ? { ...item, assignedLevel: lvl } : item))
    );
  };

  // Add only new selected OPDs
  const handleApplySyncNewOnly = () => {
    const selectedNew = syncOpdList.filter(item => item.selected && !item.alreadyExists);
    if (selectedNew.length === 0) {
      alert('Tidak ada OPD baru yang dipilih.');
      return;
    }

    const newRows: KematanganMRItem[] = selectedNew.map((item, idx) => {
      const details = getLevelDetails(item.assignedLevel);
      return {
        id: `kmr-sync-${Date.now()}-${idx}`,
        no: data.length + idx + 1,
        unitKerja: item.opdName,
        kematanganMR: item.assignedLevel,
        bobotRegisterRisiko: details.bobot,
        strategiPengawasan: details.strategi,
        keterangan: details.label
      };
    });

    const updated = [...data, ...newRows];
    handleSaveData(updated);
    setShowSyncModal(false);
    setNotification(`Berhasil menambahkan ${newRows.length} unit kerja / OPD baru dari Menu 1.`);
  };

  // Full replace or resync
  const handleApplySyncFull = () => {
    const selected = syncOpdList.filter(item => item.selected);
    if (selected.length === 0) {
      alert('Pilih minimal satu OPD untuk disinkronkan.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Penuh Tabel Kematangan MR?',
      message: `Tabel akan diatur ulang dengan ${selected.length} unit kerja / OPD yang dipilih dari Menu 1. Data lama akan digantikan.`,
      detail: `Total OPD terpilih: ${selected.length} OPD.`,
      confirmText: 'Ya, Sinkronkan Penuh',
      variant: 'warning',
      onConfirm: () => {
        const newRows: KematanganMRItem[] = selected.map((item, idx) => {
          const details = getLevelDetails(item.assignedLevel);
          return {
            id: `kmr-sync-${Date.now()}-${idx}`,
            no: idx + 1,
            unitKerja: item.opdName,
            kematanganMR: item.assignedLevel,
            bobotRegisterRisiko: details.bobot,
            strategiPengawasan: details.strategi,
            keterangan: details.label
          };
        });
        handleSaveData(newRows);
        setShowSyncModal(false);
        setNotification(`Berhasil menyinkronkan seluruh ${newRows.length} OPD dari Menu 1.`);
      }
    });
  };

  const filteredData = data.filter(item =>
    (item.unitKerja || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgLevel = data.length > 0 ? data.reduce((acc, curr) => acc + curr.kematanganMR, 0) / data.length : 0;
  const avgBobot = data.length > 0 ? data.reduce((acc, curr) => acc + curr.bobotRegisterRisiko, 0) / data.length : 0;

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Perangkat Daerah / Unit Kerja', key: 'unitKerja', width: 35 },
      { header: 'Tingkat Kematangan MR (1-5)', key: 'kematanganMR', width: 22 },
      { header: 'Bobot Register Risiko (%)', key: 'bobotRegisterRisiko', width: 22 },
      { header: 'Strategi Pengawasan APIP', key: 'strategiPengawasan', width: 45 }
    ];

    exportToExcel(
      'Lampiran_3_Kematangan_MR_OPD',
      'LAMPIRAN 3: PENETAPAN TINGKAT KEMATANGAN MANAJEMEN RISIKO (MR) PERANGKAT DAERAH',
      `Rata-rata Tingkat Kematangan: Level ${avgLevel.toFixed(2)} | Rata-rata Bobot: ${avgBobot.toFixed(2)}%`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Unit Kerja / OPD', 'Maturitas MR', 'Bobot Register (%)', 'Strategi Pengawasan'];
    const rows = filteredData.map(d => [
      d.no,
      d.unitKerja,
      `Level ${d.kematanganMR}`,
      `${d.bobotRegisterRisiko}%`,
      d.strategiPengawasan
    ]);

    exportToPdf(
      'Lampiran_3_Kematangan_MR_OPD',
      'LAMPIRAN 3: PENETAPAN TINGKAT KEMATANGAN MANAJEMEN RISIKO (MR) PERANGKAT DAERAH',
      headers,
      rows,
      'landscape'
    );
  };

  // Filtered list for sync modal
  const filteredSyncList = syncOpdList.filter(item =>
    item.opdName.toLowerCase().includes(syncSearchTerm.toLowerCase()) ||
    item.programs.some(p => p.toLowerCase().includes(syncSearchTerm.toLowerCase()))
  );

  const totalSelectedSync = syncOpdList.filter(i => i.selected).length;
  const newSelectedSync = syncOpdList.filter(i => i.selected && !i.alreadyExists).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-900/90 text-emerald-100 border border-emerald-700/60 rounded-xl shadow-lg flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-300 hover:text-white p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 3
              </span>
              <span className="text-xs text-blue-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Tingkat Kematangan Manajemen Risiko
            </h1>
            <p className="text-sm text-blue-100/80 mt-1 max-w-3xl">
              Penetapan tingkat maturitas MR seluruh Perangkat Daerah (Level 1 - 5) untuk menentukan bobot keandalan Risk Register dan strategi pengawasan APIP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-blue-800/60 hover:bg-blue-700/80 text-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-blue-700/50"
            >
              <Info className="w-3.5 h-3.5 text-blue-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* SINKRONISASI OPD BUTTON (MENU 1) */}
            <button
              onClick={handleOpenSyncModal}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 border border-cyan-300/40"
              title="Ambil dan sinkronkan daftar OPD dari kolom 'OPD/Unit Pengampu' di Menu 1 (Audit Universe)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span>Sinkronisasi OPD</span>
            </button>

            {/* TAMBAH UNIT KERJA / OPD BUTTON (PRESERVED) */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-400 hover:bg-blue-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Kerja/OPD</span>
            </button>

            {data.length > 0 && (
              <button
                onClick={requestResetData}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Kosongkan Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Unit Dinilai</span>
            <span className="text-lg font-bold text-white">{data.length} OPD</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Rata-rata Maturitas MR</span>
            <span className="text-lg font-bold text-blue-300">Level {avgLevel.toFixed(2)}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Rata-rata Bobot Register</span>
            <span className="text-lg font-bold text-emerald-400">{avgBobot.toFixed(1)}%</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Level Terbanyak</span>
            <span className="text-base font-bold text-amber-300">
              {data.length > 0 ? `Level ${Math.round(avgLevel)}` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Guide Card */}
      {showGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            STANDAR MATURITAS MR & STRATEGI PENGAWASAN
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <strong className="text-rose-700 block mb-1">Level 1 (0%)</strong>
              Belum ada register risiko formal. APIP berperan sebagai konsultan & fasilitator penyusunan.
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <strong className="text-amber-700 block mb-1">Level 2 (40%)</strong>
              Register ada namun belum terintegrasi. Dilakukan audit ketaatan dan pembinaan MR.
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <strong className="text-blue-700 block mb-1">Level 3 (70%)</strong>
              Penerapan MR terdefinisi. Audit kinerja berbasis risiko (PBBR) mulai diterapkan.
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <strong className="text-indigo-700 block mb-1">Level 4 (85%)</strong>
              MR terukur dan teruji efektivitasnya. Audit kinerja fokus pada mitigasi risiko strategis.
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <strong className="text-emerald-700 block mb-1">Level 5 (100%)</strong>
              MR optimal dan membudaya. Pengawasan berbasis continuous auditing / monitoring.
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama unit kerja / OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{filteredData.length}</span> dari{' '}
          <span className="font-semibold text-slate-700">{data.length}</span> OPD terdaftar
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3.5 text-center w-12 font-semibold">No</th>
                <th className="p-3.5 font-semibold min-w-[240px]">Nama Perangkat Daerah / Unit Kerja</th>
                <th className="p-3.5 font-semibold w-44 text-center">Tingkat Kematangan MR</th>
                <th className="p-3.5 font-semibold w-36 text-center">Bobot Register (%)</th>
                <th className="p-3.5 font-semibold min-w-[280px]">Strategi Pengawasan APIP</th>
                <th className="p-3.5 font-semibold w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="text-slate-700 font-bold text-sm">Belum ada data Kematangan Manajemen Risiko.</p>
                      <p className="text-xs text-slate-500">
                        Anda dapat menyinkronkan data OPD dari kolom OPD Pengampu di Menu 1 (Audit Universe) atau menambahkan unit kerja secara manual.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenSyncModal}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sinkronisasi OPD dari Menu 1
                        </button>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Manual
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => {
                  const details = getLevelDetails(item.kematanganMR);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.unitKerja}</td>
                      <td className="p-3 text-center">
                        <select
                          value={item.kematanganMR}
                          onChange={e => handleLevelChange(item.id, Number(e.target.value))}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                        >
                          <option value={1}>Level 1: Rintisan</option>
                          <option value={2}>Level 2: Terkelola</option>
                          <option value={3}>Level 3: Terdefinisi</option>
                          <option value={4}>Level 4: Terukur</option>
                          <option value={5}>Level 5: Optimal</option>
                        </select>
                      </td>
                      <td className="p-3 text-center font-extrabold text-blue-900 bg-blue-50/40">
                        {item.bobotRegisterRisiko}%
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mr-2 ${details.badge}`}>
                          {details.label.split(':')[0]}
                        </span>
                        {item.strategiPengawasan}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit nama unit / level"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDelete(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINKRONISASI OPD MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    Sinkronisasi OPD dari Menu 1 (Audit Universe)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mengambil nama Perangkat Daerah dari kolom <strong>OPD/Unit Pengampu</strong> di Menu 1.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Notice if Menu 1 had empty OPDs */}
            {syncNotice && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold">{syncNotice}</p>
                </div>
              </div>
            )}

            {syncOpdList.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-4 my-auto">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Tidak Ada OPD Ditemukan di Menu 1
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sistem hanya menyinkronkan data Perangkat Daerah yang <strong>benar-benar tercatat</strong> pada kolom <strong>OPD/Unit Pengampu</strong> di <strong>Menu 1 (Audit Universe)</strong> tanpa data referensi tiruan.
                  </p>
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1">
                    <p className="font-bold text-slate-700">Petunjuk Pengisian:</p>
                    <p>1. Buka <strong>Menu 1 (Audit Universe)</strong>.</p>
                    <p>2. Lengkapi nama OPD pada kolom <strong>OPD/Unit Pengampu</strong> untuk baris program yang relevan.</p>
                    <p>3. Buka kembali menu ini dan klik <strong>Sinkronisasi OPD</strong>.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Metrics Bar in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total OPD</span>
                <span className="text-base font-extrabold text-slate-900">{syncOpdList.length} OPD</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">OPD Baru</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {syncOpdList.filter(i => !i.alreadyExists).length} OPD
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-blue-600 block uppercase font-bold tracking-wider">Sudah Tercatat</span>
                <span className="text-base font-extrabold text-blue-700">
                  {syncOpdList.filter(i => i.alreadyExists).length} OPD
                </span>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-cyan-600 block uppercase font-bold tracking-wider">Terpilih</span>
                <span className="text-base font-extrabold text-cyan-800">{totalSelectedSync} OPD</span>
              </div>
            </div>

            {/* Modal Controls Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSelectAllSync(true)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={handleSelectNewOnlySync}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition"
                >
                  Hanya OPD Baru
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllSync(false)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-medium rounded-lg transition"
                >
                  Batal Pilih
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Set Level Terpilih:</span>
                <select
                  value={bulkLevel}
                  onChange={e => handleApplyBulkLevel(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value={1}>Level 1 (0%)</option>
                  <option value={2}>Level 2 (40%)</option>
                  <option value={3}>Level 3 (70%)</option>
                  <option value={4}>Level 4 (85%)</option>
                  <option value={5}>Level 5 (100%)</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="py-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari OPD atau program di hasil sinkronisasi..."
                  value={syncSearchTerm}
                  onChange={e => setSyncSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* List of OPDs */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {filteredSyncList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada OPD yang cocok dengan pencarian.
                </div>
              ) : (
                filteredSyncList.map((item, idx) => {
                  const details = getLevelDetails(item.assignedLevel);
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.selected
                          ? item.alreadyExists
                            ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                            : 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                          : 'bg-white border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSyncSelect(item.opdName)}
                          className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{item.opdName}</span>
                            {item.alreadyExists ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                                Sudah Ada (Level {item.existingLevel})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold border border-emerald-200">
                                Baru
                              </span>
                            )}
                          </div>

                          {item.programs.length > 0 && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={item.programs.join('; ')}>
                              <span className="font-medium text-slate-600">
                                {item.programCount > 0 ? `${item.programCount} Program: ` : ''}
                              </span>
                              {item.programs.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Level Selector per Item */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-[11px] text-slate-500 font-medium">Level:</span>
                        <select
                          value={item.assignedLevel}
                          onChange={e => handleSyncRowLevelChange(item.opdName, Number(e.target.value))}
                          disabled={!item.selected}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                          <option value={1}>Level 1 (0%)</option>
                          <option value={2}>Level 2 (40%)</option>
                          <option value={3}>Level 3 (70%)</option>
                          <option value={4}>Level 4 (85%)</option>
                          <option value={5}>Level 5 (100%)</option>
                        </select>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${details.badge}`}>
                          {details.bobot}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

              </>
            )}

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                {syncOpdList.length === 0 ? 'Tutup' : 'Batal'}
              </button>

              {syncOpdList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {newSelectedSync > 0 && (
                    <button
                      type="button"
                      onClick={handleApplySyncNewOnly}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan {newSelectedSync} OPD Baru</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleApplySyncFull}
                    disabled={totalSelectedSync === 0}
                    className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sinkronisasi {totalSelectedSync} OPD</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal (PRESERVED) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Tambah Unit Kerja / OPD
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Unit Kerja / OPD *</label>
                <input
                  type="text"
                  required
                  value={newItem.unitKerja}
                  onChange={e => setNewItem({ ...newItem, unitKerja: e.target.value })}
                  placeholder="Contoh: Dinas Kesehatan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kematangan MR (Maturitas) *</label>
                <select
                  value={newItem.level}
                  onChange={e => setNewItem({ ...newItem, level: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value={1}>Level 1: Rintisan (Bobot Register 0%)</option>
                  <option value={2}>Level 2: Terkelola (Bobot Register 40%)</option>
                  <option value={3}>Level 3: Terdefinisi (Bobot Register 70%)</option>
                  <option value={4}>Level 4: Terukur (Bobot Register 85%)</option>
                  <option value={5}>Level 5: Optimal (Bobot Register 100%)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (PRESERVED) */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edit Unit Kerja / OPD (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Unit Kerja / OPD *</label>
                <input
                  type="text"
                  required
                  value={editingItem.unitKerja}
                  onChange={e => setEditingItem({ ...editingItem, unitKerja: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kematangan MR *</label>
                <select
                  value={editingItem.kematanganMR}
                  onChange={e => setEditingItem({ ...editingItem, kematanganMR: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value={1}>Level 1: Rintisan (Bobot Register 0%)</option>
                  <option value={2}>Level 2: Terkelola (Bobot Register 40%)</option>
                  <option value={3}>Level 3: Terdefinisi (Bobot Register 70%)</option>
                  <option value={4}>Level 4: Terukur (Bobot Register 85%)</option>
                  <option value={5}>Level 5: Optimal (Bobot Register 100%)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
      />
    </div>
  );
};
