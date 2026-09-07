import React, { useState, useMemo } from 'react';
import { 
  FaktorRisikoProgramUnggulanItem, 
  INITIAL_PROGRAM_UNGGULAN,
  AuditUniverseItem,
  INITIAL_AUDIT_UNIVERSE
} from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  Award, 
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
export interface Menu1ProgramUnggulan {
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

const getMenu1ProgramsList = (): Menu1ProgramUnggulan[] => {
  const auList = getAuditUniverseData();
  const map = new Map<string, Menu1ProgramUnggulan>();

  auList.forEach((item, idx) => {
    const prog = (item.programRpjmd || '').trim();
    if (!prog) return;

    const opd = (item.opdPengampu || '').trim();
    const rpjmn = (item.prioritasRpjmn || '').trim();
    const sektor = (item.sektorUnggulan || '').trim();

    if (!map.has(prog)) {
      map.set(prog, {
        id: item.id || `au-${idx}`,
        no: idx + 1,
        programRpjmd: prog,
        opdPengampu: opd,
        tujuanRpjmd: item.tujuanRpjmd || '',
        sasaranRpjmd: item.sasaranRpjmd || '',
        prioritasRpjmn: rpjmn,
        sektorUnggulan: sektor,
        anggaran: Number(item.anggaran) || 0
      });
    } else {
      const existing = map.get(prog)!;
      // Jika existing belum ada OPD tapi baris saat ini punya, lengkapi
      if (!existing.opdPengampu && opd) {
        existing.opdPengampu = opd;
      }
      if (!existing.prioritasRpjmn && rpjmn) {
        existing.prioritasRpjmn = rpjmn;
      }
      if ((!existing.sektorUnggulan || existing.sektorUnggulan.toLowerCase().includes('bukan')) && sektor && !sektor.toLowerCase().includes('bukan')) {
        existing.sektorUnggulan = sektor;
      }
    }
  });

  return Array.from(map.values());
};

const calculateSkalaStatic = (val: number): number => {
  if (val === 3) return 5;
  if (val === 2) return 3;
  if (val === 1) return 2;
  return 1;
};

export const FaktorRisikoProgramUnggulanView: React.FC = () => {
  // Inisialisasi data: Jika belum ada di localStorage, otomatis ambil dari Program RPJMD & OPD di Menu 1
  const [data, setData] = useState<FaktorRisikoProgramUnggulanItem[]>(() => {
    const saved = localStorage.getItem('ppbr_faktor_unggulan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ppbr_faktor_unggulan', e);
      }
    }

    // Auto-populate dari Program RPJMD dan OPD Menu 1
    const menu1List = getMenu1ProgramsList();
    if (menu1List.length > 0) {
      return menu1List.map((item, idx) => {
        const terkaitTujuanRpjmd: 0 | 1 = 1;
        const mendukungRpjmn: 0 | 1 = item.prioritasRpjmn && item.prioritasRpjmn.trim().length > 0 ? 1 : 1;
        const isBukanSektor = item.sektorUnggulan && item.sektorUnggulan.toLowerCase().includes('bukan');
        const sektorUnggulan: 0 | 1 = isBukanSektor ? 0 : 1;
        const totalNilai = terkaitTujuanRpjmd + mendukungRpjmn + sektorUnggulan;
        return {
          id: `fpu-${idx + 1}-${Date.now()}`,
          no: idx + 1,
          program: item.programRpjmd,
          namaOPD: item.opdPengampu || '',
          terkaitTujuanRpjmd,
          mendukungRpjmn,
          sektorUnggulan,
          nilai: totalNilai,
          skala: calculateSkalaStatic(totalNilai)
        };
      });
    }

    return INITIAL_PROGRAM_UNGGULAN;
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
  const [editingItem, setEditingItem] = useState<FaktorRisikoProgramUnggulanItem | null>(null);

  // Form Tambah
  const [isManualInput, setIsManualInput] = useState(false);
  const [selectedMenu1Program, setSelectedMenu1Program] = useState('');
  const [newItem, setNewItem] = useState<{
    program: string;
    namaOPD: string;
    terkaitTujuanRpjmd: 0 | 1;
    mendukungRpjmn: 0 | 1;
    sektorUnggulan: 0 | 1;
  }>({
    program: '',
    namaOPD: '',
    terkaitTujuanRpjmd: 1,
    mendukungRpjmn: 1,
    sektorUnggulan: 1
  });

  // Modal Sinkronisasi State
  const [syncSearch, setSyncSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'NEW' | 'DIFF_OPD'>('ALL');
  const [selectedSyncPrograms, setSelectedSyncPrograms] = useState<string[]>([]);

  const calculateSkala = (val: number): number => {
    return calculateSkalaStatic(val);
  };

  const handleSaveData = (newData: FaktorRisikoProgramUnggulanItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_faktor_unggulan', JSON.stringify(newData));
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
        terkaitTujuanRpjmd: 1,
        mendukungRpjmn: 1,
        sektorUnggulan: 1
      });
      return;
    }

    const found = menu1Programs.find(p => p.programRpjmd === progName);
    if (found) {
      const isBukanSektor = found.sektorUnggulan && found.sektorUnggulan.toLowerCase().includes('bukan');
      setNewItem({
        program: found.programRpjmd,
        namaOPD: found.opdPengampu || '',
        terkaitTujuanRpjmd: 1,
        mendukungRpjmn: found.prioritasRpjmn && found.prioritasRpjmn.trim().length > 0 ? 1 : 1,
        sektorUnggulan: isBukanSektor ? 0 : 1
      });
    }
  };

  const handleOpenAddModal = () => {
    setIsManualInput(false);
    setSelectedMenu1Program('');
    setNewItem({
      program: '',
      namaOPD: '',
      terkaitTujuanRpjmd: 1,
      mendukungRpjmn: 1,
      sektorUnggulan: 1
    });
    setShowAddModal(true);
  };

  const handleToggleCriteria = (id: string, field: 'terkaitTujuanRpjmd' | 'mendukungRpjmn' | 'sektorUnggulan') => {
    const updated = data.map(item => {
      if (item.id === id) {
        const newVal = (item[field] === 1 ? 0 : 1) as 0 | 1;
        const updatedItem = { ...item, [field]: newVal };
        const totalNilai = updatedItem.terkaitTujuanRpjmd + updatedItem.mendukungRpjmn + updatedItem.sektorUnggulan;
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

    const totalNilai = newItem.terkaitTujuanRpjmd + newItem.mendukungRpjmn + newItem.sektorUnggulan;
    const item: FaktorRisikoProgramUnggulanItem = {
      id: `fpu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      program: newItem.program.trim(),
      namaOPD: newItem.namaOPD.trim(),
      terkaitTujuanRpjmd: newItem.terkaitTujuanRpjmd,
      mendukungRpjmn: newItem.mendukungRpjmn,
      sektorUnggulan: newItem.sektorUnggulan,
      nilai: totalNilai,
      skala: calculateSkala(totalNilai)
    };
    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ program: '', namaOPD: '', terkaitTujuanRpjmd: 1, mendukungRpjmn: 1, sektorUnggulan: 1 });
  };

  const handleOpenEdit = (item: FaktorRisikoProgramUnggulanItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const totalNilai = editingItem.terkaitTujuanRpjmd + editingItem.mendukungRpjmn + editingItem.sektorUnggulan;
    const updatedItem: FaktorRisikoProgramUnggulanItem = {
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

  const requestResetPenilaian = (item: FaktorRisikoProgramUnggulanItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Penilaian Program Unggulan?',
      message: 'Apakah Anda yakin ingin menghapus/mereset penilaian program unggulan ini? Nama program dan OPD akan tetap ada di tabel.',
      detail: `Program: "${item.program}" | OPD: ${item.namaOPD || '(Belum diisi)'} | Kriteria saat ini: ${item.nilai} (Skala ${item.skala})`,
      confirmText: 'Ya, Hapus Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d =>
          d.id === item.id
            ? {
                ...d,
                terkaitTujuanRpjmd: 0 as const,
                mendukungRpjmn: 0 as const,
                sektorUnggulan: 0 as const,
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
      title: 'Hapus Seluruh Penilaian Program Unggulan?',
      message: `Apakah Anda yakin ingin menghapus/mereset penilaian untuk seluruh program (${data.length} program)?`,
      detail: 'Seluruh kriteria keterkaitan RPJMD, RPJMN, dan Sektor Unggulan akan di-reset menjadi 0 (Skala 1). Nama program dan OPD tetap aman di tabel.',
      confirmText: 'Ya, Reset Semua Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d => ({
          ...d,
          terkaitTujuanRpjmd: 0 as const,
          mendukungRpjmn: 0 as const,
          sektorUnggulan: 0 as const,
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
    // Default: pilih semua program dari Menu 1
    setSelectedSyncPrograms(list.map(p => p.programRpjmd));
    setSyncSearch('');
    setSyncFilter('ALL');
    setShowSyncModal(true);
  };

  // Sinkronisasi Penuh (Memuat Ulang Semua Program & OPD dari Menu 1, mempertahankan kriteria checklist jika sudah diatur)
  const handleApplyFullSync = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Penuh dari Menu 1?',
      message: 'Seluruh Program RPJMD dan nama OPD pengampu di Menu 5 akan diselaraskan dengan data Menu 1 (Audit Universe).',
      detail: 'Pilihan checklist kriteria (Sasaran RPJMD, RPJMN, Sektor Unggulan) yang sudah diatur sebelumnya akan tetap dipertahankan.',
      confirmText: 'Ya, Sinkronisasikan',
      variant: 'warning',
      onConfirm: () => {
        const menu1List = getMenu1ProgramsList().filter(p => selectedSyncPrograms.includes(p.programRpjmd));

        // Buat map data eksisting untuk mempertahankan checklist kriteria yang sudah diatur
        const existingMap = new Map<string, FaktorRisikoProgramUnggulanItem>();
        data.forEach(d => {
          existingMap.set(d.program.toLowerCase().trim(), d);
        });

        const synced: FaktorRisikoProgramUnggulanItem[] = menu1List.map((item, idx) => {
          const matchExisting = existingMap.get(item.programRpjmd.toLowerCase().trim());
          
          let terkaitTujuanRpjmd: 0 | 1 = 1;
          let mendukungRpjmn: 0 | 1 = item.prioritasRpjmn && item.prioritasRpjmn.trim().length > 0 ? 1 : 1;
          const isBukanSektor = item.sektorUnggulan && item.sektorUnggulan.toLowerCase().includes('bukan');
          let sektorUnggulan: 0 | 1 = isBukanSektor ? 0 : 1;

          if (matchExisting) {
            terkaitTujuanRpjmd = matchExisting.terkaitTujuanRpjmd;
            mendukungRpjmn = matchExisting.mendukungRpjmn;
            sektorUnggulan = matchExisting.sektorUnggulan;
          }

          const totalNilai = terkaitTujuanRpjmd + mendukungRpjmn + sektorUnggulan;

          return {
            id: matchExisting?.id || `fpu-sync-${idx + 1}-${Date.now()}`,
            no: idx + 1,
            program: item.programRpjmd,
            namaOPD: item.opdPengampu || '',
            terkaitTujuanRpjmd,
            mendukungRpjmn,
            sektorUnggulan,
            nilai: totalNilai,
            skala: calculateSkala(totalNilai)
          };
        });

        handleSaveData(synced);
        setShowSyncModal(false);
      }
    });
  };

  // Perbarui Nama OPD saja dari Menu 1 (tanpa mengubah kriteria atau menghapus yang ada)
  const handleApplyUpdateOpdOnly = () => {
    const menu1List = getMenu1ProgramsList();
    const menu1Map = new Map<string, Menu1ProgramUnggulan>();
    menu1List.forEach(p => {
      menu1Map.set(p.programRpjmd.toLowerCase().trim(), p);
    });

    let updatedCount = 0;
    const updatedData = data.map(d => {
      const match = menu1Map.get(d.program.toLowerCase().trim());
      if (match && match.opdPengampu && match.opdPengampu !== d.namaOPD) {
        updatedCount++;
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

  // Tambahkan hanya program baru yang belum ada di Menu 5
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
    const additions: FaktorRisikoProgramUnggulanItem[] = newItemsFromMenu1.map((item, idx) => {
      const terkaitTujuanRpjmd: 0 | 1 = 1;
      const mendukungRpjmn: 0 | 1 = item.prioritasRpjmn && item.prioritasRpjmn.trim().length > 0 ? 1 : 1;
      const isBukanSektor = item.sektorUnggulan && item.sektorUnggulan.toLowerCase().includes('bukan');
      const sektorUnggulan: 0 | 1 = isBukanSektor ? 0 : 1;
      const totalNilai = terkaitTujuanRpjmd + mendukungRpjmn + sektorUnggulan;

      return {
        id: `fpu-new-${Date.now()}-${idx}`,
        no: startNo + idx + 1,
        program: item.programRpjmd,
        namaOPD: item.opdPengampu || '',
        terkaitTujuanRpjmd,
        mendukungRpjmn,
        sektorUnggulan,
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
    const existingNamesMap = new Map<string, FaktorRisikoProgramUnggulanItem>();
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
        currentOpdInMenu5: existing ? existing.namaOPD : undefined
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
      { header: 'Terkait Tujuan/Sasaran RPJMD (1/0)', key: 'terkaitTujuanRpjmd', width: 24 },
      { header: 'Mendukung RPJMN (1/0)', key: 'mendukungRpjmn', width: 22 },
      { header: 'Sektor Unggulan Daerah (1/0)', key: 'sektorUnggulan', width: 22 },
      { header: 'Total Nilai (0-3)', key: 'nilai', width: 16 },
      { header: 'Skala Risiko (1-5)', key: 'skala', width: 16 }
    ];

    exportToExcel(
      'Lampiran_5_Faktor_Program_Unggulan',
      'LAMPIRAN 5: PERTIMBANGAN MANAJEMEN - PROGRAM UNGGULAN & PRIORITAS RPJMN',
      'Penetapan Skala Risiko Berdasarkan Keterkaitan Program RPJMD & OPD (Audit Universe)',
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Program RPJMD', 'OPD Pengampu', 'RPJMD', 'RPJMN', 'Unggulan', 'Total Nilai', 'Skala Risiko'];
    const rows = filteredData.map(d => [
      d.no,
      d.program,
      d.namaOPD || '-',
      d.terkaitTujuanRpjmd ? 'Ya (1)' : 'Tidak (0)',
      d.mendukungRpjmn ? 'Ya (1)' : 'Tidak (0)',
      d.sektorUnggulan ? 'Ya (1)' : 'Tidak (0)',
      d.nilai,
      `Skala ${d.skala}`
    ]);

    exportToPdf(
      'Lampiran_5_Faktor_Program_Unggulan',
      'LAMPIRAN 5: PERTIMBANGAN MANAJEMEN - PROGRAM UNGGULAN & PRIORITAS RPJMN',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-purple-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 5
              </span>
              <span className="text-xs text-purple-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Terintegrasi Menu 1
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Faktor Program Unggulan Daerah & RPJMN
            </h1>
            <p className="text-sm text-purple-100/80 mt-1 max-w-3xl">
              Nama program diambil langsung dari <strong className="text-purple-200">Program RPJMD</strong> dan nama OPD dari <strong className="text-purple-200">OPD/Unit Pengampu</strong> pada <strong className="text-purple-200">Menu 1 (Audit Universe)</strong>. Mempertimbangkan keselarasan dengan Sasaran RPJMD, Prioritas Nasional RPJMN, dan Sektor Unggulan Daerah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-purple-700/50"
            >
              <Info className="w-3.5 h-3.5 text-purple-300" />
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
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-purple-400 hover:bg-purple-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetAllPenilaian}
                className="px-3 py-2 bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Hapus / Reset Seluruh Penilaian Program Unggulan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Penilaian</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-purple-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Program Dinilai</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-white">{data.length}</span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Prioritas Sangat Tinggi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-rose-400">
                {data.filter(d => d.skala === 5).length}
              </span>
              <span className="text-xs text-slate-400">Skala 5</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Prioritas Sedang</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-amber-400">
                {data.filter(d => d.skala === 3).length}
              </span>
              <span className="text-xs text-slate-400">Skala 3</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Sektor Unggulan Daerah</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-purple-300">
                {data.filter(d => d.sektorUnggulan === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block">Mendukung RPJMN</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-cyan-300">
                {data.filter(d => d.mendukungRpjmn === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-purple-900 text-sm">
            <Info className="w-4 h-4 text-purple-600" />
            KETENTUAN PENILAIAN KRITERIA PROGRAM UNGGULAN & KONEKSI MENU 1
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. <strong>Sumber Program & OPD</strong>: Nama program diambil dari kolom <strong>Program RPJMD</strong> dan OPD dari <strong>OPD/Unit Pengampu</strong> pada <strong>Menu 1 (Audit Universe)</strong>.</p>
            <p>2. <strong>Terkait Langsung Sasaran RPJMD</strong>: Beri nilai 1 jika program merupakan amanat utama dokumen RPJMD, beri 0 jika tidak.</p>
            <p>3. <strong>Mendukung Prioritas Nasional (RPJMN)</strong>: Beri nilai 1 jika mendukung program nasional / instruksi presiden.</p>
            <p>4. <strong>Sektor Unggulan Daerah</strong>: Beri nilai 1 jika masuk sektor prioritas kepala daerah terpilih.</p>
            <p>5. <strong>Skala Konversi</strong>: Total 3 Kriteria = <strong>Skala 5</strong>, Total 2 Kriteria = <strong>Skala 3</strong>, Total 1 Kriteria = <strong>Skala 2</strong>, Total 0 Kriteria = <strong>Skala 1</strong>.</p>
            <p>6. <strong>Sinkronisasi</strong>: Gunakan tombol <em>Sinkronisasi dari Menu 1</em> kapan saja jika terdapat penambahan program atau perubahan OPD di Menu 1.</p>
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
            <Layers className="w-3.5 h-3.5 text-purple-600" />
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
                <th colSpan={3} className="p-2 bg-slate-800 text-purple-300 font-bold border-b border-slate-700">
                  KRITERIA FAKTOR STRATEGIS (KLIK UNTUK UBAH)
                </th>
                <th rowSpan={2} className="p-3 w-28 font-semibold">Total Nilai</th>
                <th rowSpan={2} className="p-3 w-32 font-semibold">Skala Risiko</th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-center">
                <th className="p-2 w-32">Sasaran RPJMD</th>
                <th className="p-2 w-32">Prioritas RPJMN</th>
                <th className="p-2 w-36">Sektor Unggulan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-slate-600 font-medium">Belum ada data Faktor Program Unggulan.</p>
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
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
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
                  <tr key={item.id} className="hover:bg-purple-50/30 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    
                    {/* Program RPJMD */}
                    <td className="p-3 font-semibold text-slate-900">
                      <div className="flex items-start gap-1.5">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded mt-0.5 shrink-0">
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

                    {/* Toggleable Criteria: Sasaran RPJMD */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'terkaitTujuanRpjmd')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.terkaitTujuanRpjmd === 1
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status Sasaran RPJMD"
                      >
                        {item.terkaitTujuanRpjmd === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Toggleable Criteria: Prioritas RPJMN */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'mendukungRpjmn')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.mendukungRpjmn === 1
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status Prioritas RPJMN"
                      >
                        {item.mendukungRpjmn === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Toggleable Criteria: Sektor Unggulan */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'sektorUnggulan')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.sektorUnggulan === 1
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status Sektor Unggulan"
                      >
                        {item.sektorUnggulan === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ya (1)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Total Nilai */}
                    <td className="p-3 text-center font-extrabold text-purple-900 bg-purple-50/40 text-sm">
                      {item.nilai} / 3
                    </td>

                    {/* Skala Risiko */}
                    <td className="p-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                        item.skala === 5
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : item.skala === 3
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
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
                          title="Hapus / Reset Penilaian (Set Semua Kriteria = 0, Skala 1)"
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
                <Plus className="w-4 h-4 text-purple-600" />
                Tambah Faktor Program Unggulan
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
                    ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Pilih Program RPJMD (Menu 1)
              </button>
              <button
                type="button"
                onClick={() => setIsManualInput(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isManualInput 
                    ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-600" />
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
                    placeholder="Contoh: Program Pelayanan Kesehatan Rujukan..."
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
                    placeholder="Contoh: Dinas Kesehatan"
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
                <span className="block text-xs font-bold text-slate-800">Kriteria Keterkaitan Strategis:</span>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.terkaitTujuanRpjmd === 1}
                    onChange={e => setNewItem({ ...newItem, terkaitTujuanRpjmd: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Terkait langsung Tujuan & Sasaran RPJMD</span>
                    <span className="text-[11px] text-slate-500">Program merupakan amanat utama dokumen RPJMD</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.mendukungRpjmn === 1}
                    onChange={e => setNewItem({ ...newItem, mendukungRpjmn: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Mendukung Prioritas Nasional (RPJMN)</span>
                    <span className="text-[11px] text-slate-500">Mendukung instruksi presiden / program strategis nasional</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newItem.sektorUnggulan === 1}
                    onChange={e => setNewItem({ ...newItem, sektorUnggulan: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold block">Termasuk Sektor Unggulan Daerah</span>
                    <span className="text-[11px] text-slate-500">Masuk dalam sektor prioritas kepala daerah</span>
                  </div>
                </label>

                {/* Preview Nilai & Skala */}
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-purple-900 font-medium">Hasil Penilaian Awal:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-900">
                      Nilai: {newItem.terkaitTujuanRpjmd + newItem.mendukungRpjmn + newItem.sektorUnggulan}/3
                    </span>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-900 font-extrabold rounded">
                      Skala {calculateSkala(newItem.terkaitTujuanRpjmd + newItem.mendukungRpjmn + newItem.sektorUnggulan)}
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
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
                <Edit3 className="w-4 h-4 text-purple-600" />
                Edit Program Strategis (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Nama Program RPJMD</label>
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
                  <label className="block text-xs font-semibold text-slate-700">Perangkat Daerah (OPD Pengampu)</label>
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
                <span className="block text-xs font-bold text-slate-800">Kriteria Keterkaitan:</span>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.terkaitTujuanRpjmd === 1}
                    onChange={e => setEditingItem({ ...editingItem, terkaitTujuanRpjmd: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <span>Terkait langsung Tujuan & Sasaran RPJMD</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.mendukungRpjmn === 1}
                    onChange={e => setEditingItem({ ...editingItem, mendukungRpjmn: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <span>Mendukung Prioritas Nasional (RPJMN)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingItem.sektorUnggulan === 1}
                    onChange={e => setEditingItem({ ...editingItem, sektorUnggulan: e.target.checked ? 1 : 0 })}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <span>Termasuk Sektor Unggulan Daerah</span>
                </label>

                {/* Preview Nilai & Skala */}
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-purple-900 font-medium">Hasil Skala Risiko Baru:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-900">
                      Nilai: {editingItem.terkaitTujuanRpjmd + editingItem.mendukungRpjmn + editingItem.sektorUnggulan}/3
                    </span>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-900 font-extrabold rounded">
                      Skala {calculateSkala(editingItem.terkaitTujuanRpjmd + editingItem.mendukungRpjmn + editingItem.sektorUnggulan)}
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                  Sinkronisasi Program & OPD dari Menu 1 (Audit Universe)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyelaraskan nama Program RPJMD dan OPD pengampu di Menu 5 dengan data terkini di Menu 1.
                </p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-4 gap-2 pt-4 pb-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Total Program Menu 1</span>
                <span className="text-lg font-bold text-slate-900">{syncComparison.totalMenu1}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-700 block">Program Baru</span>
                <span className="text-lg font-bold text-emerald-800">{syncComparison.countNew}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                <span className="text-[11px] text-amber-700 block">OPD Berbeda</span>
                <span className="text-lg font-bold text-amber-800">{syncComparison.countDiffOpd}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                <span className="text-[11px] text-blue-700 block">Sudah Sesuai</span>
                <span className="text-lg font-bold text-blue-800">{syncComparison.countSame}</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-indigo-950 font-medium">
                Pilih opsi penyelarasan yang diinginkan:
              </div>
              <div className="flex items-center gap-2">
                {syncComparison.countDiffOpd > 0 && (
                  <button
                    onClick={handleApplyUpdateOpdOnly}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    title="Hanya memperbarui nama OPD sesuai Menu 1 tanpa mengubah kriteria yang sudah diisi"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Perbarui OPD Saja ({syncComparison.countDiffOpd})
                  </button>
                )}
                {syncComparison.countNew > 0 && (
                  <button
                    onClick={handleApplyAddNewOnly}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    title="Hanya menambahkan program RPJMD baru yang belum ada di Menu 5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Program Baru ({syncComparison.countNew})
                  </button>
                )}
                <button
                  onClick={handleApplyFullSync}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  title="Sinkronisasikan seluruh program dan OPD dari Menu 1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sinkronisasi Penuh
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex items-center justify-between gap-3 pt-3 pb-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setSyncFilter('ALL')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    syncFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({syncComparison.totalMenu1})
                </button>
                <button
                  onClick={() => setSyncFilter('NEW')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    syncFilter === 'NEW' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Program Baru ({syncComparison.countNew})
                </button>
                <button
                  onClick={() => setSyncFilter('DIFF_OPD')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    syncFilter === 'DIFF_OPD' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  OPD Berbeda ({syncComparison.countDiffOpd})
                </button>
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program di Menu 1..."
                  value={syncSearch}
                  onChange={e => setSyncSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Program List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSyncPrograms.length === syncComparison.totalMenu1}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedSyncPrograms(menu1Programs.map(p => p.programRpjmd));
                          } else {
                            setSelectedSyncPrograms([]);
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                    </th>
                    <th className="p-2.5">Program RPJMD (Menu 1)</th>
                    <th className="p-2.5">OPD Pengampu di Menu 1</th>
                    <th className="p-2.5">Status di Menu 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {syncComparison.listWithStatus
                    .filter(p => {
                      if (syncFilter === 'NEW') return p.status === 'NEW';
                      if (syncFilter === 'DIFF_OPD') return p.status === 'DIFF_OPD';
                      return true;
                    })
                    .filter(p =>
                      p.programRpjmd.toLowerCase().includes(syncSearch.toLowerCase()) ||
                      p.opdPengampu.toLowerCase().includes(syncSearch.toLowerCase())
                    )
                    .map((item, idx) => {
                      const isChecked = selectedSyncPrograms.includes(item.programRpjmd);
                      return (
                        <tr key={`${item.programRpjmd}-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 text-center">
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
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-2.5 font-medium text-slate-900">
                            {item.programRpjmd}
                          </td>
                          <td className="p-2.5 text-slate-700">
                            {item.opdPengampu ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{item.opdPengampu}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum diisi di Menu 1</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {item.status === 'NEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                <Plus className="w-3 h-3" /> Baru
                              </span>
                            )}
                            {item.status === 'DIFF_OPD' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                  <AlertCircle className="w-3 h-3" /> OPD Berbeda
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  Saat ini: {item.currentOpdInMenu5 || '(kosong)'}
                                </div>
                              </div>
                            )}
                            {item.status === 'SAME' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full">
                                <Check className="w-3 h-3 text-emerald-600" /> Sudah Sesuai
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
              <div className="text-xs text-slate-500">
                Terpilih: <strong>{selectedSyncPrograms.length}</strong> dari {syncComparison.totalMenu1} program
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleApplyFullSync}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Sinkronisasi Terpilih ({selectedSyncPrograms.length})
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
