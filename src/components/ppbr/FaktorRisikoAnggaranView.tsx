import React, { useState, useMemo } from 'react';
import {
  FaktorRisikoAnggaranItem,
  AuditUniverseItem,
  INITIAL_AUDIT_UNIVERSE,
  INITIAL_FAKTOR_ANGGARAN
} from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Coins,
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
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const calculateSkalaStatic = (pct: number): number => {
  if (pct > 15) return 5;
  if (pct >= 10) return 4;
  if (pct >= 5) return 3;
  if (pct >= 2) return 2;
  return 1;
};

// Helper: Membaca data Audit Universe dari Menu 1
const getAuditUniverseData = (): AuditUniverseItem[] => {
  const saved = localStorage.getItem('ppbr_audit_universe');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse ppbr_audit_universe', e);
    }
  }
  return INITIAL_AUDIT_UNIVERSE;
};

// Helper: Mengambil daftar unik program RPJMD dan OPD pengampu langsung dari Menu 1
interface Menu1Program {
  id: string;
  no: number;
  programRpjmd: string;
  opdPengampu: string;
  anggaran: number;
  sasaranRpjmd?: string;
}

const getMenu1ProgramsList = (): Menu1Program[] => {
  const auList = getAuditUniverseData();
  const map = new Map<string, Menu1Program>();

  auList.forEach((item, idx) => {
    const prog = (item.programRpjmd || '').trim();
    if (!prog) return;

    const opd = (item.opdPengampu || '').trim();
    const ang = Number(item.anggaran) || 0;

    if (!map.has(prog)) {
      map.set(prog, {
        id: item.id || `au-${idx}`,
        no: idx + 1,
        programRpjmd: prog,
        opdPengampu: opd,
        anggaran: ang,
        sasaranRpjmd: item.sasaranRpjmd || ''
      });
    } else {
      const existing = map.get(prog)!;
      // Jika existing belum ada OPD tapi item sekarang ada, lengkapi
      if (!existing.opdPengampu && opd) {
        existing.opdPengampu = opd;
      }
      if (existing.anggaran === 0 && ang > 0) {
        existing.anggaran = ang;
      }
    }
  });

  return Array.from(map.values());
};

export const FaktorRisikoAnggaranView: React.FC = () => {
  const [totalAPBD, setTotalAPBD] = useState<number>(() => {
    const saved = localStorage.getItem('ppbr_total_apbd');
    return saved ? Number(saved) : 480500000000; // Rp 480.5 Milyar default
  });

  // Inisialisasi data: Jika belum ada di localStorage, otomatis ambil dari Program RPJMD & OPD di Menu 1
  const [data, setData] = useState<FaktorRisikoAnggaranItem[]>(() => {
    const saved = localStorage.getItem('ppbr_faktor_anggaran');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ppbr_faktor_anggaran', e);
      }
    }

    // Auto-populate dari Program RPJMD dan OPD Menu 1
    const menu1List = getMenu1ProgramsList();
    if (menu1List.length > 0) {
      const defaultAPBD = 480500000000;
      return menu1List.map((item, idx) => {
        const pct = defaultAPBD > 0 ? (item.anggaran / defaultAPBD) * 100 : 0;
        return {
          id: `fra-${idx + 1}-${Date.now()}`,
          no: idx + 1,
          namaProgram: item.programRpjmd,
          namaOPD: item.opdPengampu || '',
          anggaran: item.anggaran || 0,
          persentase: parseFloat(pct.toFixed(2)),
          skala: calculateSkalaStatic(pct)
        };
      });
    }

    return INITIAL_FAKTOR_ANGGARAN;
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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FaktorRisikoAnggaranItem | null>(null);

  // Form Tambah
  const [isManualInput, setIsManualInput] = useState(false);
  const [selectedMenu1Program, setSelectedMenu1Program] = useState('');
  const [newItem, setNewItem] = useState<{ namaProgram: string; namaOPD: string; anggaran: number }>({
    namaProgram: '',
    namaOPD: '',
    anggaran: 0
  });

  // Modal Sinkronisasi State
  const [syncSearch, setSyncSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'NEW' | 'DIFF_OPD'>('ALL');
  const [selectedSyncPrograms, setSelectedSyncPrograms] = useState<string[]>([]);

  const calculateSkala = (pct: number): number => {
    return calculateSkalaStatic(pct);
  };

  const handleSaveData = (newData: FaktorRisikoAnggaranItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_faktor_anggaran', JSON.stringify(newData));
  };

  // Daftar program dari Menu 1 terkini
  const menu1Programs = useMemo(() => {
    return getMenu1ProgramsList();
  }, [showAddModal, showEditModal, showSyncModal]);

  // Saat memilih program RPJMD dari Menu 1 di Modal Tambah:
  const handleSelectProgramFromMenu1 = (progName: string) => {
    setSelectedMenu1Program(progName);
    if (!progName) {
      setNewItem({ namaProgram: '', namaOPD: '', anggaran: 0 });
      return;
    }

    const found = menu1Programs.find(p => p.programRpjmd === progName);
    if (found) {
      setNewItem({
        namaProgram: found.programRpjmd,
        namaOPD: found.opdPengampu || '',
        anggaran: found.anggaran || 0
      });
    }
  };

  const handleOpenAddModal = () => {
    setIsManualInput(false);
    setSelectedMenu1Program('');
    setNewItem({ namaProgram: '', namaOPD: '', anggaran: 0 });
    setShowAddModal(true);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.namaProgram.trim()) return;

    const pct = totalAPBD > 0 ? (Number(newItem.anggaran) / totalAPBD) * 100 : 0;
    const skala = calculateSkala(pct);
    const item: FaktorRisikoAnggaranItem = {
      id: `fra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      namaProgram: newItem.namaProgram.trim(),
      namaOPD: newItem.namaOPD.trim(),
      anggaran: Number(newItem.anggaran) || 0,
      persentase: parseFloat(pct.toFixed(2)),
      skala
    };
    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ namaProgram: '', namaOPD: '', anggaran: 0 });
  };

  const handleOpenEdit = (item: FaktorRisikoAnggaranItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const pct = totalAPBD > 0 ? (Number(editingItem.anggaran) / totalAPBD) * 100 : 0;
    const skala = calculateSkala(pct);
    const updatedItem: FaktorRisikoAnggaranItem = {
      ...editingItem,
      namaProgram: editingItem.namaProgram.trim(),
      namaOPD: editingItem.namaOPD.trim(),
      anggaran: Number(editingItem.anggaran) || 0,
      persentase: parseFloat(pct.toFixed(2)),
      skala
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Helper untuk mengambil OPD terbaru dari Menu 1 saat edit baris
  const handleFetchLatestOpdForEdit = () => {
    if (!editingItem) return;
    const match = menu1Programs.find(
      p => p.programRpjmd.toLowerCase() === editingItem.namaProgram.trim().toLowerCase()
    );
    if (match) {
      setEditingItem({
        ...editingItem,
        namaOPD: match.opdPengampu || '',
        anggaran: editingItem.anggaran || match.anggaran || 0
      });
    }
  };

  const requestResetPenilaian = (item: FaktorRisikoAnggaranItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Penilaian Anggaran?',
      message: 'Apakah Anda yakin ingin menghapus/mereset penilaian anggaran untuk program ini? Nama program dan OPD akan tetap ada di tabel.',
      detail: `Program: "${item.namaProgram}" | OPD: ${item.namaOPD || '(Belum diisi)'} | Anggaran saat ini: Rp ${item.anggaran.toLocaleString('id-ID')} (Skala ${item.skala})`,
      confirmText: 'Ya, Hapus Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d =>
          d.id === item.id ? { ...d, anggaran: 0, persentase: 0, skala: 1 } : d
        );
        handleSaveData(updated);
      }
    });
  };

  const requestResetAllPenilaian = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seluruh Penilaian Anggaran?',
      message: `Apakah Anda yakin ingin menghapus seluruh penilaian anggaran (${data.length} program)?`,
      detail: 'Seluruh nilai pagu anggaran akan direset menjadi Rp 0 dan skala risiko kembali ke 1. Nama program dan OPD tetap aman di tabel.',
      confirmText: 'Ya, Reset Semua Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d => ({ ...d, anggaran: 0, persentase: 0, skala: 1 }));
        handleSaveData(updated);
      }
    });
  };

  const handleRecalculateAll = (newTotal: number) => {
    setTotalAPBD(newTotal);
    localStorage.setItem('ppbr_total_apbd', String(newTotal));
    const updated = data.map(d => {
      const pct = newTotal > 0 ? (d.anggaran / newTotal) * 100 : 0;
      return {
        ...d,
        persentase: parseFloat(pct.toFixed(2)),
        skala: calculateSkala(pct)
      };
    });
    handleSaveData(updated);
  };

  // --- LOGIKA SINKRONISASI DARI MENU 1 ---
  const handleOpenSyncModal = () => {
    const list = getMenu1ProgramsList();
    // Default: pilih semua program dari Menu 1
    setSelectedSyncPrograms(list.map(p => p.programRpjmd));
    setSyncSearch('');
    setSyncFilter('ALL');
    setShowSyncModal(true);
  };

  // Sinkronisasi Penuh (Replace / Muat Ulang Semua Program & OPD dari Menu 1)
  const handleApplyFullSync = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Penuh dari Menu 1?',
      message: 'Seluruh Program RPJMD dan nama OPD pengampu di Menu 4 akan diselaraskan dengan data Menu 1 (Audit Universe).',
      detail: 'Pagu anggaran yang sudah diinput di Menu 4 akan tetap dipertahankan jika di Menu 1 anggarannya 0.',
      confirmText: 'Ya, Sinkronisasikan',
      variant: 'warning',
      onConfirm: () => {
        const menu1List = getMenu1ProgramsList().filter(p => selectedSyncPrograms.includes(p.programRpjmd));

        // Buat map data eksisting untuk mempertahankan anggaran yang sudah diisi
        const existingMap = new Map<string, FaktorRisikoAnggaranItem>();
        data.forEach(d => {
          existingMap.set(d.namaProgram.toLowerCase().trim(), d);
        });

        const synced: FaktorRisikoAnggaranItem[] = menu1List.map((item, idx) => {
          const matchExisting = existingMap.get(item.programRpjmd.toLowerCase().trim());
          // Ambil anggaran dari existing jika > 0, atau ambil dari Menu 1
          const finalAnggaran = matchExisting && matchExisting.anggaran > 0 ? matchExisting.anggaran : (item.anggaran || 0);
          const pct = totalAPBD > 0 ? (finalAnggaran / totalAPBD) * 100 : 0;

          return {
            id: matchExisting?.id || `fra-sync-${idx + 1}-${Date.now()}`,
            no: idx + 1,
            namaProgram: item.programRpjmd,
            namaOPD: item.opdPengampu || '',
            anggaran: finalAnggaran,
            persentase: parseFloat(pct.toFixed(2)),
            skala: calculateSkala(pct)
          };
        });

        handleSaveData(synced);
        setShowSyncModal(false);
      }
    });
  };

  // Perbarui Nama OPD saja dari Menu 1 (tanpa mengubah struktur program atau menghapus yang ada)
  const handleApplyUpdateOpdOnly = () => {
    const menu1List = getMenu1ProgramsList();
    const menu1Map = new Map<string, Menu1Program>();
    menu1List.forEach(p => {
      menu1Map.set(p.programRpjmd.toLowerCase().trim(), p);
    });

    let updatedCount = 0;
    const updatedData = data.map(d => {
      const match = menu1Map.get(d.namaProgram.toLowerCase().trim());
      if (match && match.opdPengampu && match.opdPengampu !== d.namaOPD) {
        updatedCount++;
        return {
          ...d,
          namaOPD: match.opdPengampu,
          // Jika anggaran di Menu 4 masih 0 dan di Menu 1 ada nilainya, sinkronkan juga
          anggaran: d.anggaran === 0 && match.anggaran > 0 ? match.anggaran : d.anggaran
        };
      }
      return d;
    });

    // Hitung ulang persentase & skala jika ada perubahan anggaran
    const finalData = updatedData.map(d => {
      const pct = totalAPBD > 0 ? (d.anggaran / totalAPBD) * 100 : 0;
      return {
        ...d,
        persentase: parseFloat(pct.toFixed(2)),
        skala: calculateSkala(pct)
      };
    });

    handleSaveData(finalData);
    setShowSyncModal(false);
  };

  // Tambahkan hanya program baru yang belum ada di Menu 4
  const handleApplyAddNewOnly = () => {
    const existingNames = new Set(data.map(d => d.namaProgram.toLowerCase().trim()));
    const newItemsFromMenu1 = menu1Programs.filter(
      p => selectedSyncPrograms.includes(p.programRpjmd) && !existingNames.has(p.programRpjmd.toLowerCase().trim())
    );

    if (newItemsFromMenu1.length === 0) return;

    const newRows: FaktorRisikoAnggaranItem[] = newItemsFromMenu1.map((item, idx) => {
      const pct = totalAPBD > 0 ? (item.anggaran / totalAPBD) * 100 : 0;
      return {
        id: `fra-new-${Date.now()}-${idx}`,
        no: data.length + idx + 1,
        namaProgram: item.programRpjmd,
        namaOPD: item.opdPengampu || '',
        anggaran: item.anggaran || 0,
        persentase: parseFloat(pct.toFixed(2)),
        skala: calculateSkala(pct)
      };
    });

    handleSaveData([...data, ...newRows]);
    setShowSyncModal(false);
  };

  const filteredData = data.filter(d =>
    (d.namaProgram || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.namaOPD || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProgramAnggaran = data.reduce((acc, curr) => acc + curr.anggaran, 0);

  // Sync Modal comparison metrics
  const syncComparison = useMemo(() => {
    const existingMap = new Map<string, FaktorRisikoAnggaranItem>();
    data.forEach(d => existingMap.set(d.namaProgram.toLowerCase().trim(), d));

    const totalMenu1 = menu1Programs.length;
    let newCount = 0;
    let existCount = 0;
    let diffOpdCount = 0;
    let emptyOpdInMenu1Count = 0;

    const items = menu1Programs.map(p => {
      const existing = existingMap.get(p.programRpjmd.toLowerCase().trim());
      const isNew = !existing;
      const hasDiffOpd = !isNew && p.opdPengampu !== '' && p.opdPengampu !== existing.namaOPD;
      const isOpdEmpty = !p.opdPengampu;

      if (isNew) newCount++;
      else existCount++;
      if (hasDiffOpd) diffOpdCount++;
      if (isOpdEmpty) emptyOpdInMenu1Count++;

      return {
        ...p,
        isNew,
        existing,
        hasDiffOpd,
        isOpdEmpty
      };
    });

    return {
      totalMenu1,
      newCount,
      existCount,
      diffOpdCount,
      emptyOpdInMenu1Count,
      items
    };
  }, [menu1Programs, data]);

  const filteredSyncItems = useMemo(() => {
    return syncComparison.items.filter(item => {
      const matchSearch =
        item.programRpjmd.toLowerCase().includes(syncSearch.toLowerCase()) ||
        item.opdPengampu.toLowerCase().includes(syncSearch.toLowerCase());
      if (!matchSearch) return false;

      if (syncFilter === 'NEW') return item.isNew;
      if (syncFilter === 'DIFF_OPD') return item.hasDiffOpd;
      return true;
    });
  }, [syncComparison, syncSearch, syncFilter]);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Program (RPJMD Menu 1)', key: 'namaProgram', width: 38 },
      { header: 'Nama Perangkat Daerah (OPD Pengampu Menu 1)', key: 'namaOPD', width: 32 },
      { header: 'Pagu Anggaran (Rp)', key: 'anggaran', width: 22 },
      { header: 'Persentase terhadap Belanja Langsung (%)', key: 'persentase', width: 24 },
      { header: 'Skala Risiko (1-5)', key: 'skala', width: 16 }
    ];

    exportToExcel(
      'Lampiran_4_Faktor_Risiko_Anggaran',
      'LAMPIRAN 4: PERTIMBANGAN MANAJEMEN - FAKTOR RISIKO ANGGARAN',
      `Total Belanja Langsung APBD: Rp ${totalAPBD.toLocaleString('id-ID')} | Total Anggaran Program: Rp ${totalProgramAnggaran.toLocaleString('id-ID')} | Sumber: Program RPJMD & OPD Menu 1`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Nama Program RPJMD', 'OPD Pengampu', 'Pagu Anggaran', 'Porsi APBD (%)', 'Skala Risiko'];
    const rows = filteredData.map(d => [
      d.no,
      d.namaProgram,
      d.namaOPD || '(Belum diisi di Menu 1)',
      `Rp ${d.anggaran.toLocaleString('id-ID')}`,
      `${d.persentase}%`,
      `Skala ${d.skala}`
    ]);

    exportToPdf(
      'Lampiran_4_Faktor_Risiko_Anggaran',
      'LAMPIRAN 4: PERTIMBANGAN MANAJEMEN - FAKTOR RISIKO ANGGARAN',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-amber-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 4
              </span>
              <span className="text-xs text-amber-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Faktor Risiko Besaran Anggaran</span>
            </h1>
            <p className="text-sm text-amber-100/80 mt-1 max-w-3xl">
              Nama program diambil langsung dari <strong>Program RPJMD</strong> dan nama OPD dari <strong>OPD/Unit Pengampu</strong> pada <strong>Menu 1 (Audit Universe)</strong>, dipadukan dengan porsi anggaran belanja langsung daerah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-amber-800/60 hover:bg-amber-700/80 text-amber-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-amber-700/50"
            >
              <Info className="w-3.5 h-3.5 text-amber-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* Tombol Sinkronisasi dari Menu 1 */}
            <button
              onClick={handleOpenSyncModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              title="Sinkronisasikan Program RPJMD & OPD dari Menu 1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronisasi dari Menu 1</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetAllPenilaian}
                className="px-3 py-2 bg-slate-800 hover:bg-amber-900/60 text-slate-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Hapus / Reset Seluruh Penilaian Anggaran"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Penilaian</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick APBD Parameter Control */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-amber-800/40 items-center">
          <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-1">Total Belanja Langsung APBD Daerah</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">Rp</span>
              <input
                type="number"
                value={totalAPBD}
                onChange={e => handleRecalculateAll(Number(e.target.value))}
                className="bg-slate-900 text-white font-bold text-sm px-2.5 py-1 rounded-lg border border-slate-600 w-full focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
          <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 block">Total Anggaran Program Dinilai</span>
            <span className="text-lg font-bold text-emerald-400">
              Rp {totalProgramAnggaran.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 block">Porsi terhadap APBD</span>
            <span className="text-lg font-bold text-cyan-300">
              {totalAPBD > 0 ? ((totalProgramAnggaran / totalAPBD) * 100).toFixed(2) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <Info className="w-4 h-4 text-amber-600" />
            STANDAR PENETAPAN SKALA RISIKO ANGGARAN & KONEKSI KE MENU 1
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Data nama program dan OPD di Menu 4 mengacu langsung pada <strong>Program RPJMD</strong> dan <strong>OPD/Unit Pengampu</strong> yang telah dipetakan di <strong>Menu 1 (Audit Universe)</strong>. Perhitungan skala risiko diukur dari rasio anggaran program terhadap total belanja langsung APBD:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white p-3 rounded-lg border border-amber-100">
              <strong className="text-emerald-700 block mb-1">Skala 1 (&lt; 2%)</strong>
              Anggaran sangat kecil dibanding total APBD. Risiko fiskal sangat rendah.
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-100">
              <strong className="text-blue-700 block mb-1">Skala 2 (2% - 4.99%)</strong>
              Anggaran kecil. Pengawasan rutin memadai.
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-100">
              <strong className="text-amber-700 block mb-1">Skala 3 (5% - 9.99%)</strong>
              Anggaran sedang. Memerlukan perhatian berkala.
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-100">
              <strong className="text-orange-700 block mb-1">Skala 4 (10% - 15%)</strong>
              Anggaran signifikan. Prioritas tinggi untuk audit kinerja.
            </div>
            <div className="bg-white p-3 rounded-lg border border-amber-100">
              <strong className="text-rose-700 block mb-1">Skala 5 (&gt; 15%)</strong>
              Porsi anggaran dominan/sangat besar. Wajib masuk prioritas pengawasan.
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar & Status Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari program RPJMD atau OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Total Program Dinilai: <strong>{data.length}</strong></span>
          </span>
          <span className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-800">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Tersinkronisasi Menu 1: <strong>{menu1Programs.length}</strong> Program RPJMD</span>
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3.5 text-center w-12 font-semibold">No</th>
                <th className="p-3.5 font-semibold min-w-[280px]">Nama Program RPJMD (Menu 1)</th>
                <th className="p-3.5 font-semibold min-w-[220px]">Perangkat Daerah (OPD Pengampu)</th>
                <th className="p-3.5 font-semibold min-w-[160px] text-right">Pagu Anggaran (Rp)</th>
                <th className="p-3.5 font-semibold w-36 text-center">Porsi APBD (%)</th>
                <th className="p-3.5 font-semibold w-36 text-center">Skala Risiko</th>
                <th className="p-3.5 font-semibold w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                        <Coins className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Belum ada data Faktor Risiko Anggaran</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Anda dapat langsung mengambil seluruh <strong>Program RPJMD</strong> dan <strong>OPD Pengampu</strong> dari <strong>Menu 1 (Audit Universe)</strong> secara otomatis.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenSyncModal}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Ambil Program & OPD dari Menu 1</span>
                        </button>
                        <button
                          onClick={handleOpenAddModal}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Manual</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => {
                  const isOpdEmpty = !item.namaOPD || item.namaOPD.trim() === '';

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition">
                      <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold shrink-0">RPJMD</span>
                          <span>{item.namaProgram}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {isOpdEmpty ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            Belum diisi di Menu 1
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.namaOPD}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono">
                        Rp {item.anggaran.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center font-bold text-blue-900">
                        {item.persentase.toFixed(2)}%
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                          item.skala >= 4
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.skala === 3
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          Skala {item.skala}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit Penilaian Anggaran"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestResetPenilaian(item)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                            title="Hapus / Reset Penilaian (Set Anggaran Rp 0, Skala 1)"
                          >
                            <RotateCcw className="w-4 h-4" />
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

      {/* Modal Tambah Data */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                Tambah Program / Faktor Anggaran
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-4">
              {/* Toggle Sumber Data */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Sumber Program:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsManualInput(false)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      !isManualInput ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Program RPJMD Menu 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualInput(true)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      isManualInput ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Input Manual
                  </button>
                </div>
              </div>

              {!isManualInput ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Program RPJMD (dari Menu 1) *
                  </label>
                  <select
                    value={selectedMenu1Program}
                    onChange={e => handleSelectProgramFromMenu1(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Program RPJMD dari Menu 1 --</option>
                    {menu1Programs.map(p => (
                      <option key={p.id} value={p.programRpjmd}>
                        {p.programRpjmd} {p.opdPengampu ? `(OPD: ${p.opdPengampu})` : '(OPD belum diisi)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nama OPD akan terisi otomatis sesuai OPD pengampu di Menu 1.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Program *</label>
                  <input
                    type="text"
                    required
                    value={newItem.namaProgram}
                    onChange={e => setNewItem({ ...newItem, namaProgram: e.target.value })}
                    placeholder="Contoh: Program Peningkatan Kualitas Pendidikan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perangkat Daerah (OPD Pengampu) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newItem.namaOPD}
                    onChange={e => setNewItem({ ...newItem, namaOPD: e.target.value })}
                    placeholder="Otomatis diambil dari Menu 1 / Isi OPD Pengampu..."
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                {!isManualInput && newItem.namaOPD && (
                  <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Sesuai dengan OPD Pengampu di Menu 1
                  </span>
                )}
                {!isManualInput && !newItem.namaOPD && selectedMenu1Program && (
                  <span className="text-[11px] text-amber-600 font-medium inline-flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    OPD untuk program ini belum diisi di Menu 1. Anda dapat mengetiknya di sini atau melengkapinya di Menu 1.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pagu Anggaran (Rp) *</label>
                <input
                  type="number"
                  required
                  value={newItem.anggaran || ''}
                  onChange={e => setNewItem({ ...newItem, anggaran: Number(e.target.value) })}
                  placeholder="Contoh: 15000000000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
                {newItem.anggaran > 0 && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pagu Terbaca:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        Rp {Number(newItem.anggaran).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Porsi terhadap APBD:</span>
                      <span className="font-bold text-blue-700">
                        {totalAPBD > 0 ? ((newItem.anggaran / totalAPBD) * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimasi Skala Risiko:</span>
                      <span className="font-extrabold text-slate-900">
                        Skala {calculateSkala(totalAPBD > 0 ? (newItem.anggaran / totalAPBD) * 100 : 0)}
                      </span>
                    </div>
                  </div>
                )}
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Data */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Edit Faktor Anggaran (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Program RPJMD (Menu 1)
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari RPJMD
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={editingItem.namaProgram}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Perangkat Daerah (OPD Pengampu)
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari Menu 1
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={editingItem.namaOPD || '(Belum diisi di Menu 1)'}
                    className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pagu Anggaran (Rp) *</label>
                <input
                  type="number"
                  required
                  value={editingItem.anggaran || ''}
                  onChange={e => setEditingItem({ ...editingItem, anggaran: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Porsi terhadap APBD:</span>
                    <span className="font-bold text-blue-700">
                      {totalAPBD > 0 ? ((editingItem.anggaran / totalAPBD) * 100).toFixed(2) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Skala Risiko:</span>
                    <span className="font-extrabold text-slate-900">
                      Skala {calculateSkala(totalAPBD > 0 ? (editingItem.anggaran / totalAPBD) * 100 : 0)}
                    </span>
                  </div>
                </div>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sinkronisasi dari Menu 1 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Sinkronisasi Program RPJMD & OPD dari Menu 1 (Audit Universe)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyelaraskan nama program RPJMD dan OPD pengampu secara akurat tanpa data buatan.
                </p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrik Perbandingan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total di Menu 1</span>
                <span className="text-lg font-black text-slate-900">{syncComparison.totalMenu1}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">Program Baru</span>
                <span className="text-lg font-black text-emerald-700">{syncComparison.newCount}</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-blue-600 block uppercase font-bold tracking-wider">Sudah Tercatat</span>
                <span className="text-lg font-black text-blue-700">{syncComparison.existCount}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-amber-600 block uppercase font-bold tracking-wider">OPD Berbeda/Diperbarui</span>
                <span className="text-lg font-black text-amber-700">{syncComparison.diffOpdCount}</span>
              </div>
            </div>

            {syncComparison.emptyOpdInMenu1Count > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Terdapat <strong>{syncComparison.emptyOpdInMenu1Count} program</strong> di Menu 1 yang kolom <em>OPD/Unit Pengampu</em>-nya belum diisi. Anda dapat melengkapinya di Menu 1 agar sinkronisasi nama OPD lebih optimal.
                </p>
              </div>
            )}

            {/* Filter & Toolbar Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program / OPD..."
                  value={syncSearch}
                  onChange={e => setSyncSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setSyncFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    syncFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({syncComparison.totalMenu1})
                </button>
                <button
                  type="button"
                  onClick={() => setSyncFilter('NEW')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    syncFilter === 'NEW' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hanya Baru ({syncComparison.newCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSyncFilter('DIFF_OPD')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    syncFilter === 'DIFF_OPD' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  OPD Berbeda ({syncComparison.diffOpdCount})
                </button>
              </div>
            </div>

            {/* Tabel Preview Sinkronisasi */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredSyncItems.length > 0 &&
                          filteredSyncItems.every(item => selectedSyncPrograms.includes(item.programRpjmd))
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            const add = filteredSyncItems.map(i => i.programRpjmd);
                            setSelectedSyncPrograms(Array.from(new Set([...selectedSyncPrograms, ...add])));
                          } else {
                            const remove = new Set(filteredSyncItems.map(i => i.programRpjmd));
                            setSelectedSyncPrograms(selectedSyncPrograms.filter(p => !remove.has(p)));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600"
                      />
                    </th>
                    <th className="p-2.5 font-semibold">Nama Program RPJMD (Menu 1)</th>
                    <th className="p-2.5 font-semibold min-w-[200px]">OPD Pengampu (Menu 1)</th>
                    <th className="p-2.5 font-semibold text-right min-w-[130px]">Pagu Anggaran</th>
                    <th className="p-2.5 font-semibold text-center w-28">Status di Menu 4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSyncItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Tidak ada program yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSyncItems.map(item => {
                      const isSelected = selectedSyncPrograms.includes(item.programRpjmd);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSyncPrograms(selectedSyncPrograms.filter(p => p !== item.programRpjmd));
                            } else {
                              setSelectedSyncPrograms([...selectedSyncPrograms, item.programRpjmd]);
                            }
                          }}
                        >
                          <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedSyncPrograms([...selectedSyncPrograms, item.programRpjmd]);
                                } else {
                                  setSelectedSyncPrograms(selectedSyncPrograms.filter(p => p !== item.programRpjmd));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-slate-900">
                            {item.programRpjmd}
                          </td>
                          <td className="p-2.5">
                            {item.isOpdEmpty ? (
                              <span className="text-[11px] text-amber-600 italic">Belum diisi di Menu 1</span>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{item.opdPengampu}</span>
                              </div>
                            )}
                            {item.hasDiffOpd && item.existing && (
                              <div className="text-[10px] text-amber-700 mt-0.5">
                                Sebelumnya di Menu 4: <em>{item.existing.namaOPD || '(Kosong)'}</em>
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-medium text-slate-700">
                            Rp {(item.existing && item.existing.anggaran > 0 ? item.existing.anggaran : item.anggaran).toLocaleString('id-ID')}
                          </td>
                          <td className="p-2.5 text-center">
                            {item.isNew ? (
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-300">
                                Baru
                              </span>
                            ) : item.hasDiffOpd ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold border border-amber-300">
                                OPD Berubah
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-semibold border border-blue-200">
                                Sudah Tercatat
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Terpilih <strong>{selectedSyncPrograms.length}</strong> dari {syncComparison.totalMenu1} program
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>

                {syncComparison.diffOpdCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyUpdateOpdOnly}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                    title="Hanya perbarui nama OPD yang berubah"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Perbarui {syncComparison.diffOpdCount} OPD dari Menu 1</span>
                  </button>
                )}

                {syncComparison.newCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAddNewOnly}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan {syncComparison.newCount} Program Baru</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyFullSync}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronisasi Penuh ({selectedSyncPrograms.length})</span>
                </button>
              </div>
            </div>
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
