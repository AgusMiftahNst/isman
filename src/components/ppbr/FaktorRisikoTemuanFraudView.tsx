import React, { useState, useMemo } from 'react';
import { 
  FaktorRisikoTemuanFraudItem, 
  INITIAL_TEMUAN_FRAUD,
  AuditUniverseItem,
  INITIAL_AUDIT_UNIVERSE
} from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Info, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  RefreshCw,
  Building2,
  Layers,
  AlertCircle,
  Sparkles,
  Check
} from 'lucide-react';

// Helper: Mengambil data Audit Universe dari Menu 1
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
export interface Menu1ProgramItem {
  id: string;
  no: number;
  programRpjmd: string;
  opdPengampu: string;
  tujuanRpjmd?: string;
  sasaranRpjmd?: string;
  prioritasRpjmn?: string;
  sektorUnggulan?: string;
  anggaran?: number;
}

const getMenu1ProgramsList = (): Menu1ProgramItem[] => {
  const auList = getAuditUniverseData();
  const map = new Map<string, Menu1ProgramItem>();

  auList.forEach((item, idx) => {
    const prog = (item.programRpjmd || '').trim();
    if (!prog) return;

    const opd = (item.opdPengampu || '').trim();

    if (!map.has(prog)) {
      map.set(prog, {
        id: item.id || `au-${idx}`,
        no: idx + 1,
        programRpjmd: prog,
        opdPengampu: opd,
        tujuanRpjmd: item.tujuanRpjmd || '',
        sasaranRpjmd: item.sasaranRpjmd || '',
        prioritasRpjmn: item.prioritasRpjmn || '',
        sektorUnggulan: item.sektorUnggulan || '',
        anggaran: Number(item.anggaran) || 0
      });
    } else {
      const existing = map.get(prog)!;
      // Jika existing belum ada OPD tapi baris saat ini punya, lengkapi
      if (!existing.opdPengampu && opd) {
        existing.opdPengampu = opd;
      }
    }
  });

  return Array.from(map.values());
};

const calculateSkalaStatic = (val: number): number => {
  if (val === 4) return 5;
  if (val === 3) return 4;
  if (val === 2) return 3;
  if (val === 1) return 2;
  return 1;
};

export const FaktorRisikoTemuanFraudView: React.FC = () => {
  // Inisialisasi data: Jika belum ada di localStorage, otomatis ambil dari Program RPJMD & OPD di Menu 1
  const [data, setData] = useState<FaktorRisikoTemuanFraudItem[]>(() => {
    const saved = localStorage.getItem('ppbr_faktor_temuan_fraud');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ppbr_faktor_temuan_fraud', e);
      }
    }

    // Auto-populate dari Program RPJMD dan OPD Menu 1
    const menu1List = getMenu1ProgramsList();
    if (menu1List.length > 0) {
      return menu1List.map((item, idx) => {
        const temuanInternal95: 0 | 1 = 1;
        const temuanEksternal90: 0 | 1 = 1;
        const potensiFraud: 0 | 1 = 0;
        const kasusHukum: 0 | 1 = 0;
        const totalNilai = temuanInternal95 + temuanEksternal90 + potensiFraud + kasusHukum;
        return {
          id: `ftf-${idx + 1}-${Date.now()}`,
          no: idx + 1,
          program: item.programRpjmd,
          namaOPD: item.opdPengampu || '',
          temuanInternal95,
          temuanEksternal90,
          potensiFraud,
          kasusHukum,
          nilai: totalNilai,
          skala: calculateSkalaStatic(totalNilai)
        };
      });
    }

    return INITIAL_TEMUAN_FRAUD;
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
  const [editingItem, setEditingItem] = useState<FaktorRisikoTemuanFraudItem | null>(null);

  // Form Tambah
  const [isManualInput, setIsManualInput] = useState(false);
  const [selectedMenu1Program, setSelectedMenu1Program] = useState('');
  const [newItem, setNewItem] = useState<{
    program: string;
    namaOPD: string;
    temuanInternal95: 0 | 1;
    temuanEksternal90: 0 | 1;
    potensiFraud: 0 | 1;
    kasusHukum: 0 | 1;
  }>({
    program: '',
    namaOPD: '',
    temuanInternal95: 1,
    temuanEksternal90: 1,
    potensiFraud: 0,
    kasusHukum: 0
  });

  // Modal Sinkronisasi State
  const [syncSearch, setSyncSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'NEW' | 'DIFF_OPD'>('ALL');
  const [selectedSyncPrograms, setSelectedSyncPrograms] = useState<string[]>([]);

  const calculateSkala = (val: number): number => {
    return calculateSkalaStatic(val);
  };

  const handleSaveData = (newData: FaktorRisikoTemuanFraudItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_faktor_temuan_fraud', JSON.stringify(newData));
  };

  // Daftar program dari Menu 1 terkini
  const menu1Programs = useMemo(() => {
    return getMenu1ProgramsList();
  }, [showAddModal, showEditModal, showSyncModal]);

  // Saat memilih program RPJMD dari Menu 1 di Modal Tambah:
  const handleSelectProgramFromMenu1 = (progName: string) => {
    setSelectedMenu1Program(progName);
    if (!progName) {
      setNewItem({
        program: '',
        namaOPD: '',
        temuanInternal95: 1,
        temuanEksternal90: 1,
        potensiFraud: 0,
        kasusHukum: 0
      });
      return;
    }

    const found = menu1Programs.find(p => p.programRpjmd === progName);
    if (found) {
      setNewItem({
        program: found.programRpjmd,
        namaOPD: found.opdPengampu || '',
        temuanInternal95: 1,
        temuanEksternal90: 1,
        potensiFraud: 0,
        kasusHukum: 0
      });
    }
  };

  const handleOpenAddModal = () => {
    setIsManualInput(false);
    setSelectedMenu1Program('');
    setNewItem({
      program: '',
      namaOPD: '',
      temuanInternal95: 1,
      temuanEksternal90: 1,
      potensiFraud: 0,
      kasusHukum: 0
    });
    setShowAddModal(true);
  };

  const handleToggleCriteria = (id: string, field: 'temuanInternal95' | 'temuanEksternal90' | 'potensiFraud' | 'kasusHukum') => {
    const updated = data.map(item => {
      if (item.id === id) {
        const newVal = (item[field] === 1 ? 0 : 1) as 0 | 1;
        const updatedItem = { ...item, [field]: newVal };
        const totalNilai = updatedItem.temuanInternal95 + updatedItem.temuanEksternal90 + updatedItem.potensiFraud + updatedItem.kasusHukum;
        return {
          ...updatedItem,
          nilai: totalNilai,
          skala: calculateSkala(totalNilai)
        };
      }
      return item;
    });
    handleSaveData(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.program.trim()) return;

    const totalNilai = newItem.temuanInternal95 + newItem.temuanEksternal90 + newItem.potensiFraud + newItem.kasusHukum;
    const item: FaktorRisikoTemuanFraudItem = {
      id: `ftf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      program: newItem.program.trim(),
      namaOPD: newItem.namaOPD.trim(),
      temuanInternal95: newItem.temuanInternal95,
      temuanEksternal90: newItem.temuanEksternal90,
      potensiFraud: newItem.potensiFraud,
      kasusHukum: newItem.kasusHukum,
      nilai: totalNilai,
      skala: calculateSkala(totalNilai)
    };
    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ program: '', namaOPD: '', temuanInternal95: 1, temuanEksternal90: 1, potensiFraud: 0, kasusHukum: 0 });
  };

  const handleOpenEdit = (item: FaktorRisikoTemuanFraudItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const totalNilai = editingItem.temuanInternal95 + editingItem.temuanEksternal90 + editingItem.potensiFraud + editingItem.kasusHukum;
    const updatedItem: FaktorRisikoTemuanFraudItem = {
      ...editingItem,
      program: editingItem.program.trim(),
      namaOPD: editingItem.namaOPD.trim(),
      nilai: totalNilai,
      skala: calculateSkala(totalNilai)
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
      p => p.programRpjmd.toLowerCase() === editingItem.program.trim().toLowerCase()
    );
    if (match) {
      setEditingItem({
        ...editingItem,
        namaOPD: match.opdPengampu || editingItem.namaOPD
      });
    }
  };

  const requestResetPenilaian = (item: FaktorRisikoTemuanFraudItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Penilaian Temuan & Fraud?',
      message: 'Apakah Anda yakin ingin menghapus/mereset penilaian temuan dan fraud untuk program ini? Nama program dan OPD akan tetap ada di tabel.',
      detail: `Program: "${item.program}" | OPD: ${item.namaOPD || '(Belum diisi)'} | Kriteria saat ini: ${item.nilai} (Skala ${item.skala})`,
      confirmText: 'Ya, Hapus Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d =>
          d.id === item.id
            ? {
                ...d,
                temuanInternal95: 0 as const,
                temuanEksternal90: 0 as const,
                potensiFraud: 0 as const,
                kasusHukum: 0 as const,
                nilai: 0,
                skala: 1
              }
            : d
        );
        handleSaveData(updated);
      }
    });
  };

  const requestResetAllPenilaian = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seluruh Penilaian Temuan & Fraud?',
      message: `Apakah Anda yakin ingin menghapus/mereset penilaian untuk seluruh program (${data.length} program)?`,
      detail: 'Seluruh checklist temuan internal, temuan eksternal, potensi fraud, dan kasus hukum akan di-reset menjadi 0 (Skala 1). Nama program dan OPD tetap aman di tabel.',
      confirmText: 'Ya, Reset Semua Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d => ({
          ...d,
          temuanInternal95: 0 as const,
          temuanEksternal90: 0 as const,
          potensiFraud: 0 as const,
          kasusHukum: 0 as const,
          nilai: 0,
          skala: 1
        }));
        handleSaveData(updated);
      }
    });
  };

  // --- LOGIKA SINKRONISASI DARI MENU 1 ---
  const handleOpenSyncModal = () => {
    const list = getMenu1ProgramsList();
    setSelectedSyncPrograms(list.map(p => p.programRpjmd));
    setSyncSearch('');
    setSyncFilter('ALL');
    setShowSyncModal(true);
  };

  // Sinkronisasi Penuh (Mempertahankan checklist kriteria yang sudah diatur)
  const handleApplyFullSync = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Penuh dari Menu 1?',
      message: 'Seluruh Program RPJMD dan nama OPD pengampu di Menu 6 akan diselaraskan dengan data Menu 1 (Audit Universe).',
      detail: 'Pilihan checklist kriteria temuan dan fraud yang sudah diatur sebelumnya akan tetap dipertahankan.',
      confirmText: 'Ya, Sinkronisasikan',
      variant: 'warning',
      onConfirm: () => {
        const menu1List = getMenu1ProgramsList().filter(p => selectedSyncPrograms.includes(p.programRpjmd));

        const existingMap = new Map<string, FaktorRisikoTemuanFraudItem>();
        data.forEach(d => {
          existingMap.set(d.program.toLowerCase().trim(), d);
        });

        const synced: FaktorRisikoTemuanFraudItem[] = menu1List.map((item, idx) => {
          const matchExisting = existingMap.get(item.programRpjmd.toLowerCase().trim());
          
          let temuanInternal95: 0 | 1 = 1;
          let temuanEksternal90: 0 | 1 = 1;
          let potensiFraud: 0 | 1 = 0;
          let kasusHukum: 0 | 1 = 0;

          if (matchExisting) {
            temuanInternal95 = matchExisting.temuanInternal95;
            temuanEksternal90 = matchExisting.temuanEksternal90;
            potensiFraud = matchExisting.potensiFraud;
            kasusHukum = matchExisting.kasusHukum;
          }

          const totalNilai = temuanInternal95 + temuanEksternal90 + potensiFraud + kasusHukum;

          return {
            id: matchExisting?.id || `ftf-sync-${idx + 1}-${Date.now()}`,
            no: idx + 1,
            program: item.programRpjmd,
            namaOPD: item.opdPengampu || '',
            temuanInternal95,
            temuanEksternal90,
            potensiFraud,
            kasusHukum,
            nilai: totalNilai,
            skala: calculateSkala(totalNilai)
          };
        });

        handleSaveData(synced);
        setShowSyncModal(false);
      }
    });
  };

  // Perbarui Nama OPD saja dari Menu 1
  const handleApplyUpdateOpdOnly = () => {
    const menu1List = getMenu1ProgramsList();
    const menu1Map = new Map<string, Menu1ProgramItem>();
    menu1List.forEach(p => {
      menu1Map.set(p.programRpjmd.toLowerCase().trim(), p);
    });

    const updatedData = data.map(d => {
      const match = menu1Map.get(d.program.toLowerCase().trim());
      if (match && match.opdPengampu && match.opdPengampu !== d.namaOPD) {
        return {
          ...d,
          namaOPD: match.opdPengampu
        };
      }
      return d;
    });

    handleSaveData(updatedData);
    setShowSyncModal(false);
  };

  // Tambahkan hanya program baru yang belum ada di Menu 6
  const handleApplyAddNewOnly = () => {
    const existingNames = new Set(data.map(d => d.program.toLowerCase().trim()));
    const newItemsFromMenu1 = menu1Programs.filter(
      p => selectedSyncPrograms.includes(p.programRpjmd) && !existingNames.has(p.programRpjmd.toLowerCase().trim())
    );

    if (newItemsFromMenu1.length === 0) {
      alert('Tidak ada program baru dari Menu 1 yang dapat ditambahkan.');
      return;
    }

    const startNo = data.length;
    const additions: FaktorRisikoTemuanFraudItem[] = newItemsFromMenu1.map((item, idx) => {
      const temuanInternal95: 0 | 1 = 1;
      const temuanEksternal90: 0 | 1 = 1;
      const potensiFraud: 0 | 1 = 0;
      const kasusHukum: 0 | 1 = 0;
      const totalNilai = temuanInternal95 + temuanEksternal90 + potensiFraud + kasusHukum;

      return {
        id: `ftf-new-${Date.now()}-${idx}`,
        no: startNo + idx + 1,
        program: item.programRpjmd,
        namaOPD: item.opdPengampu || '',
        temuanInternal95,
        temuanEksternal90,
        potensiFraud,
        kasusHukum,
        nilai: totalNilai,
        skala: calculateSkala(totalNilai)
      };
    });

    handleSaveData([...data, ...additions]);
    setShowSyncModal(false);
  };

  const filteredData = data.filter(d =>
    (d.program || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.namaOPD || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Perbandingan status dengan Menu 1
  const syncComparison = useMemo(() => {
    const existingNamesMap = new Map<string, FaktorRisikoTemuanFraudItem>();
    data.forEach(d => existingNamesMap.set(d.program.toLowerCase().trim(), d));

    let countNew = 0;
    let countDiffOpd = 0;
    let countSame = 0;

    const listWithStatus = menu1Programs.map(p => {
      const existing = existingNamesMap.get(p.programRpjmd.toLowerCase().trim());
      let status: 'NEW' | 'DIFF_OPD' | 'SAME' = 'NEW';
      if (!existing) {
        status = 'NEW';
        countNew++;
      } else if (p.opdPengampu && existing.namaOPD !== p.opdPengampu) {
        status = 'DIFF_OPD';
        countDiffOpd++;
      } else {
        status = 'SAME';
        countSame++;
      }
      return {
        ...p,
        status,
        currentOpdInMenu: existing ? existing.namaOPD : undefined
      };
    });

    return {
      listWithStatus,
      countNew,
      countDiffOpd,
      countSame,
      totalMenu1: menu1Programs.length
    };
  }, [data, menu1Programs]);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Program RPJMD', key: 'program', width: 38 },
      { header: 'OPD Pengampu (Menu 1)', key: 'namaOPD', width: 30 },
      { header: 'TL Internal <=95% (1/0)', key: 'temuanInternal95', width: 22 },
      { header: 'TL Eksternal <=90% (1/0)', key: 'temuanEksternal90', width: 22 },
      { header: 'Potensi Fraud (1/0)', key: 'potensiFraud', width: 20 },
      { header: 'Kasus Hukum APH (1/0)', key: 'kasusHukum', width: 20 },
      { header: 'Total Nilai (0-4)', key: 'nilai', width: 16 },
      { header: 'Skala Risiko (1-5)', key: 'skala', width: 16 }
    ];

    exportToExcel(
      'Lampiran_6_Faktor_Temuan_Fraud',
      'LAMPIRAN 6: PERTIMBANGAN MANAJEMEN - TEMUAN, FRAUD & KASUS HUKUM',
      'Penetapan Skala Risiko Berdasarkan Status Tindak Lanjut Temuan & Integritas (Audit Universe)',
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Program RPJMD', 'OPD Pengampu', 'TL APIP', 'TL BPK', 'Fraud', 'Kasus Hukum', 'Nilai', 'Skala'];
    const rows = filteredData.map(d => [
      d.no,
      d.program,
      d.namaOPD || '-',
      d.temuanInternal95 ? 'Ya (1)' : 'Tidak (0)',
      d.temuanEksternal90 ? 'Ya (1)' : 'Tidak (0)',
      d.potensiFraud ? 'Ya (1)' : 'Tidak (0)',
      d.kasusHukum ? 'Ya (1)' : 'Tidak (0)',
      d.nilai,
      `Skala ${d.skala}`
    ]);

    exportToPdf(
      'Lampiran_6_Faktor_Temuan_Fraud',
      'LAMPIRAN 6: PERTIMBANGAN MANAJEMEN - TEMUAN, FRAUD & KASUS HUKUM',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 rounded-2xl p-6 text-white shadow-xl border border-rose-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 6
              </span>
              <span className="text-xs text-rose-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Terintegrasi Menu 1
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Faktor Temuan, Potensi Fraud & Kasus Hukum
            </h1>
            <p className="text-sm text-rose-100/80 mt-1 max-w-3xl">
              Nama program diambil langsung dari <strong className="text-rose-200">Program RPJMD</strong> dan nama OPD dari <strong className="text-rose-200">OPD/Unit Pengampu</strong> pada <strong className="text-rose-200">Menu 1 (Audit Universe)</strong>. Pertimbangan manajemen atas kepatuhan tindak lanjut temuan BPK/APIP, riwayat kelemahan pengendalian berulang, indikasi fraud, dan penanganan kasus oleh Aparat Penegak Hukum (APH).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-rose-800/60 hover:bg-rose-700/80 text-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-rose-700/50"
            >
              <Info className="w-3.5 h-3.5 text-rose-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleOpenSyncModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition border border-indigo-400/40"
              title="Sinkronisasikan Program RPJMD dan OPD dari Menu 1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronisasi dari Menu 1</span>
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
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetAllPenilaian}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Hapus / Reset Seluruh Penilaian Temuan & Fraud"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Penilaian</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-rose-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Objek Pengawasan</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-white">{data.length}</span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Terdapat Kasus Hukum / APH</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-rose-400">
                {data.filter(d => d.kasusHukum === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Potensi Fraud Tinggi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-amber-400">
                {data.filter(d => d.potensiFraud === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Tingkat Risiko Sangat Tinggi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-red-300">
                {data.filter(d => d.skala === 5).length}
              </span>
              <span className="text-xs text-slate-400">Skala 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <Info className="w-4 h-4 text-rose-600" />
            KETENTUAN SKORING FAKTOR TEMUAN, FRAUD & KASUS HUKUM
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. <strong>Sumber Program & OPD</strong>: Nama program diambil dari kolom <strong>Program RPJMD</strong> dan OPD dari <strong>OPD/Unit Pengampu</strong> pada <strong>Menu 1 (Audit Universe)</strong>.</p>
            <p>2. <strong>Tindak Lanjut Rekomendasi Internal (APIP) &le; 95%</strong>: Beri nilai 1 jika penyelesaian TL temuan inspektorat belum mencapai target minimal 95%.</p>
            <p>3. <strong>Tindak Lanjut Rekomendasi Eksternal (BPK) &le; 90%</strong>: Beri nilai 1 jika penyelesaian TL temuan BPK belum mencapai target 90%.</p>
            <p>4. <strong>Potensi/Riwayat Fraud</strong>: Beri nilai 1 jika terdapat temuan kerugian negara, gratifikasi, pungli, atau kelemahan pengendalian internal yang disengaja.</p>
            <p>5. <strong>Kasus Hukum APH</strong>: Beri nilai 1 jika sedang dalam penyelidikan/penyidikan Kejaksaan, Kepolisian, atau KPK.</p>
            <p>6. <strong>Konversi Skala</strong>: Total Nilai 4 = <strong>Skala 5</strong>, Nilai 3 = <strong>Skala 4</strong>, Nilai 2 = <strong>Skala 3</strong>, Nilai 1 = <strong>Skala 2</strong>, Nilai 0 = <strong>Skala 1</strong>.</p>
            <p>7. <strong>Sinkronisasi</strong>: Gunakan tombol <em>Sinkronisasi dari Menu 1</em> kapan saja jika terdapat penambahan program atau pembaruan OPD di Menu 1.</p>
          </div>
        </div>
      )}

      {/* Search Toolbar & Status Koneksi */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari program atau OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-rose-600" />
            <span>Tersinkron dengan <strong>{menu1Programs.length}</strong> Program RPJMD di Menu 1</span>
          </div>
          {syncComparison.countDiffOpd > 0 && (
            <button
              onClick={handleOpenSyncModal}
              className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 font-semibold flex items-center gap-1.5 transition"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{syncComparison.countDiffOpd} OPD berbeda di Menu 1</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-center">
                <th rowSpan={2} className="p-3 w-12 font-semibold">No</th>
                <th rowSpan={2} className="p-3 min-w-[240px] text-left font-semibold">
                  Program RPJMD (Menu 1)
                </th>
                <th rowSpan={2} className="p-3 min-w-[200px] text-left font-semibold">
                  Perangkat Daerah (OPD Pengampu)
                </th>
                <th colSpan={4} className="p-2 bg-slate-800 text-rose-300 font-bold border-b border-slate-700">
                  INDIKATOR FAKTOR INTEGRITAS & TEMUAN (KLIK UNTUK UBAH)
                </th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Total Skor</th>
                <th rowSpan={2} className="p-3 w-32 font-semibold">Skala Risiko</th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-center">
                <th className="p-2 w-28">TL APIP &le; 95%</th>
                <th className="p-2 w-28">TL BPK &le; 90%</th>
                <th className="p-2 w-28">Potensi Fraud</th>
                <th className="p-2 w-28">Kasus Hukum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-slate-600 font-medium">Belum ada data Faktor Temuan & Fraud.</p>
                      <p className="text-xs text-slate-400">
                        Klik tombol di bawah untuk langsung mengimpor daftar Program RPJMD dan OPD dari Menu 1.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenSyncModal}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sinkronisasi dari Menu 1
                        </button>
                        <button
                          onClick={handleOpenAddModal}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Manual
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    
                    {/* Program RPJMD */}
                    <td className="p-3 font-semibold text-slate-900">
                      <div className="flex items-start gap-1.5">
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded mt-0.5 shrink-0">
                          RPJMD
                        </span>
                        <span>{item.program}</span>
                      </div>
                    </td>

                    {/* Perangkat Daerah (OPD Pengampu) */}
                    <td className="p-3 text-slate-700">
                      {item.namaOPD ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{item.namaOPD}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs italic">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          Belum diisi di Menu 1
                        </span>
                      )}
                    </td>

                    {/* Criteria Toggles: TL APIP */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'temuanInternal95')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.temuanInternal95 === 1
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status TL APIP"
                      >
                        {item.temuanInternal95 === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: TL BPK */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'temuanEksternal90')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.temuanEksternal90 === 1
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status TL BPK"
                      >
                        {item.temuanEksternal90 === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: Potensi Fraud */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'potensiFraud')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.potensiFraud === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status Potensi Fraud"
                      >
                        {item.potensiFraud === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: Kasus Hukum */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'kasusHukum')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.kasusHukum === 1
                            ? 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status Kasus Hukum APH"
                      >
                        {item.kasusHukum === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-red-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Total Skor */}
                    <td className="p-3 text-center font-extrabold text-rose-900 bg-rose-50/40 text-sm">
                      {item.nilai} / 4
                    </td>

                    {/* Skala Risiko */}
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

                    {/* Aksi */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                          title="Edit Penilaian"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestResetPenilaian(item)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition"
                          title="Hapus / Reset Penilaian (Set Kriteria = 0, Skala 1)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH DATA (Pilih Program RPJMD dari Menu 1) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                Tambah Faktor Temuan & Integritas
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Pemilihan: Dari Menu 1 vs Input Manual */}
            <div className="flex items-center gap-2 pt-4 pb-2">
              <button
                type="button"
                onClick={() => setIsManualInput(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !isManualInput 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-rose-600" />
                Pilih Program RPJMD (Menu 1)
              </button>
              <button
                type="button"
                onClick={() => setIsManualInput(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isManualInput 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                Input Manual
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-2">
              {!isManualInput ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Program RPJMD (dari Menu 1) *
                  </label>
                  <select
                    value={selectedMenu1Program}
                    onChange={e => handleSelectProgramFromMenu1(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Pilih Program RPJMD --</option>
                    {menu1Programs.map((p, idx) => (
                      <option key={`${p.programRpjmd}-${idx}`} value={p.programRpjmd}>
                        {p.programRpjmd} {p.opdPengampu ? `(${p.opdPengampu})` : '(OPD belum diisi)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nama OPD dan program diambil otomatis dari kolom RPJMD Menu 1.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Program *</label>
                  <input
                    type="text"
                    required
                    value={newItem.program}
                    onChange={e => setNewItem({ ...newItem, program: e.target.value })}
                    placeholder="Contoh: Program Peningkatan Sarana Prasarana..."
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
                    required
                    value={newItem.namaOPD}
                    onChange={e => setNewItem({ ...newItem, namaOPD: e.target.value })}
                    placeholder="Contoh: Dinas PUPR"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  />
                  {!isManualInput && newItem.namaOPD && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      Terkoneksi Menu 1
                    </span>
                  )}
                </div>
                {!isManualInput && !newItem.namaOPD && selectedMenu1Program && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    * OPD untuk program ini belum diisi di Menu 1. Anda dapat mengetiknya di sini atau melengkapinya di Menu 1.
                  </p>
                )}
              </div>

              {/* Kriteria Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800">Indikator Kriteria Temuan & Integritas:</span>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.temuanInternal95 === 1}
                    onChange={e => setNewItem({ ...newItem, temuanInternal95: e.target.checked ? 1 : 0 })}
                    className="rounded text-rose-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Tindak Lanjut Temuan Internal APIP &le; 95%</span>
                    <span className="text-[11px] text-slate-500">Penyelesaian rekomendasi inspektorat belum mencapai target</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.temuanEksternal90 === 1}
                    onChange={e => setNewItem({ ...newItem, temuanEksternal90: e.target.checked ? 1 : 0 })}
                    className="rounded text-rose-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Tindak Lanjut Temuan Eksternal BPK &le; 90%</span>
                    <span className="text-[11px] text-slate-500">Penyelesaian rekomendasi BPK belum memenuhi target</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.potensiFraud === 1}
                    onChange={e => setNewItem({ ...newItem, potensiFraud: e.target.checked ? 1 : 0 })}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Terdapat Potensi / Riwayat Indikasi Fraud</span>
                    <span className="text-[11px] text-slate-500">Indikasi kerugian negara, gratifikasi, pungli, atau kelemahan SPI</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.kasusHukum === 1}
                    onChange={e => setNewItem({ ...newItem, kasusHukum: e.target.checked ? 1 : 0 })}
                    className="rounded text-red-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Sedang Ditangani oleh Aparat Penegak Hukum (APH)</span>
                    <span className="text-[11px] text-slate-500">Dalam penyelidikan/penyidikan Kejaksaan, Kepolisian, atau KPK</span>
                  </div>
                </label>

                {/* Preview Nilai & Skala */}
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-rose-900 font-medium">Hasil Penilaian Awal:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-900">
                      Skor: {newItem.temuanInternal95 + newItem.temuanEksternal90 + newItem.potensiFraud + newItem.kasusHukum}/4
                    </span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-extrabold rounded">
                      Skala {calculateSkala(newItem.temuanInternal95 + newItem.temuanEksternal90 + newItem.potensiFraud + newItem.kasusHukum)}
                    </span>
                  </div>
                </div>
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
                  disabled={!newItem.program.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-rose-600" />
                Edit Faktor Temuan & Integritas (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Nama Program (RPJMD)</label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari RPJMD
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={editingItem.program}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Perangkat Daerah (OPD Pengampu)</label>
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

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800">Indikator Kriteria:</span>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.temuanInternal95 === 1}
                    onChange={e => setEditingItem({ ...editingItem, temuanInternal95: e.target.checked ? 1 : 0 })}
                    className="rounded text-rose-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Tindak Lanjut Temuan Internal APIP &le; 95%</span>
                    <span className="text-[11px] text-slate-500">Penyelesaian rekomendasi inspektorat belum mencapai target</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.temuanEksternal90 === 1}
                    onChange={e => setEditingItem({ ...editingItem, temuanEksternal90: e.target.checked ? 1 : 0 })}
                    className="rounded text-rose-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Tindak Lanjut Temuan Eksternal BPK &le; 90%</span>
                    <span className="text-[11px] text-slate-500">Penyelesaian rekomendasi BPK belum memenuhi target</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.potensiFraud === 1}
                    onChange={e => setEditingItem({ ...editingItem, potensiFraud: e.target.checked ? 1 : 0 })}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Terdapat Potensi / Riwayat Indikasi Fraud</span>
                    <span className="text-[11px] text-slate-500">Indikasi kerugian negara, pungli, gratifikasi, atau kelemahan SPI</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.kasusHukum === 1}
                    onChange={e => setEditingItem({ ...editingItem, kasusHukum: e.target.checked ? 1 : 0 })}
                    className="rounded text-red-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Sedang Ditangani oleh Aparat Penegak Hukum (APH)</span>
                    <span className="text-[11px] text-slate-500">Dalam penyelidikan/penyidikan Kejaksaan, Kepolisian, atau KPK</span>
                  </div>
                </label>

                {/* Preview Hasil Edit */}
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-rose-900 font-medium">Hasil Penilaian:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-900">
                      Skor: {editingItem.temuanInternal95 + editingItem.temuanEksternal90 + editingItem.potensiFraud + editingItem.kasusHukum}/4
                    </span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-extrabold rounded">
                      Skala {calculateSkala(editingItem.temuanInternal95 + editingItem.temuanEksternal90 + editingItem.potensiFraud + editingItem.kasusHukum)}
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SINKRONISASI DARI MENU 1 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Sinkronisasi Program & OPD dari Menu 1
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menyelaraskan daftar Program RPJMD dan OPD Pengampu dari Audit Universe (Menu 1)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Summary Cards */}
            <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
              <div 
                onClick={() => setSyncFilter('ALL')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Total Program Menu 1
                </span>
                <span className="text-lg font-bold">{syncComparison.totalMenu1}</span>
              </div>

              <div 
                onClick={() => setSyncFilter('NEW')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'NEW' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'NEW' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                  Program Baru (Belum ada)
                </span>
                <span className="text-lg font-bold">{syncComparison.countNew}</span>
              </div>

              <div 
                onClick={() => setSyncFilter('DIFF_OPD')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'DIFF_OPD' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'DIFF_OPD' ? 'text-amber-100' : 'text-amber-600'}`}>
                  Perbedaan OPD Pengampu
                </span>
                <span className="text-lg font-bold">{syncComparison.countDiffOpd}</span>
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program dalam daftar Menu 1..."
                  value={syncSearch}
                  onChange={e => setSyncSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedSyncPrograms(menu1Programs.map(p => p.programRpjmd))}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSyncPrograms([])}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            {/* Comparison Program List */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {syncComparison.listWithStatus
                .filter(item => {
                  if (syncFilter === 'NEW') return item.status === 'NEW';
                  if (syncFilter === 'DIFF_OPD') return item.status === 'DIFF_OPD';
                  return true;
                })
                .filter(item => 
                  (item.programRpjmd || '').toLowerCase().includes(syncSearch.toLowerCase()) ||
                  (item.opdPengampu || '').toLowerCase().includes(syncSearch.toLowerCase())
                )
                .map(item => {
                  const isChecked = selectedSyncPrograms.includes(item.programRpjmd);
                  return (
                    <div 
                      key={item.programRpjmd} 
                      className="p-2.5 flex items-start gap-3 hover:bg-slate-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedSyncPrograms([...selectedSyncPrograms, item.programRpjmd]);
                          } else {
                            setSelectedSyncPrograms(selectedSyncPrograms.filter(p => p !== item.programRpjmd));
                          }
                        }}
                        className="rounded text-rose-600 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.programRpjmd}
                          </span>
                          {item.status === 'NEW' && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                              Program Baru
                            </span>
                          )}
                          {item.status === 'DIFF_OPD' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              OPD Berbeda
                            </span>
                          )}
                          {item.status === 'SAME' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Sudah Sesuai
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            OPD di Menu 1: <strong className="text-slate-700">{item.opdPengampu || '(Belum diisi)'}</strong>
                          </span>
                          {item.status === 'DIFF_OPD' && (
                            <span className="text-amber-700">
                              (Di Menu 6 saat ini: {item.currentOpdInMenu || '-'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Sync Actions Footer */}
            <div className="pt-4 mt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500">
                Terpilih: <strong>{selectedSyncPrograms.length}</strong> dari {menu1Programs.length} Program
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {syncComparison.countDiffOpd > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyUpdateOpdOnly}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    title="Hanya memperbarui nama OPD di Menu 6 tanpa mengubah status checklist temuan"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Perbarui OPD Saja</span>
                  </button>
                )}

                {syncComparison.countNew > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAddNewOnly}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    title="Hanya menambahkan program yang belum ada di tabel Menu 6"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Program Baru ({syncComparison.countNew})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyFullSync}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Sinkronisasi Penuh</span>
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
