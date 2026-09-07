import React, { useState, useEffect, useMemo } from 'react';
import { PrioritasProgramRPJMDItem, INITIAL_PRIORITAS_RPJMD } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  getAuditUniversePrograms,
  getFaktorAnggaranMap,
  getFaktorUnggulanMap,
  getFaktorTemuanMap,
  getFaktorIsuMap,
  PILIHAN_TAHUN_AUDIT,
  PILIHAN_PENGALAMAN_APIP,
  calculateSkorMenu8,
  sortAndRankMenu8
} from './ppbrSyncHelpers';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  Sliders,
  RotateCcw,
  RefreshCw,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2
} from 'lucide-react';

export const PrioritasProgramRPJMDView: React.FC = () => {
  const [data, setData] = useState<PrioritasProgramRPJMDItem[]>(() => {
    const saved = localStorage.getItem('ppbr_prioritas_program');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortAndRankMenu8(parsed);
        }
      } catch (e) {
        console.error('Error loading ppbr_prioritas_program', e);
      }
    }
    return INITIAL_PRIORITAS_RPJMD;
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

  const [activeTab, setActiveTab] = useState<'all' | 'prioritas' | 'manajemen_lain'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrioritasProgramRPJMDItem | null>(null);

  // Form tambah program baru
  const [newItem, setNewItem] = useState<{
    program: string;
    opdPengampu: string;
    skalaRegisterRisiko: number;
    skalaAnggaran: number;
    skalaProgramUnggulan: number;
    skalaTemuanFraud: number;
    skalaIsuTerkini: number;
    skalaTahunAudit: number;
    skalaPengalamanApip: number;
    permintaanKDH: boolean;
  }>({
    program: '',
    opdPengampu: '',
    skalaRegisterRisiko: 3.5,
    skalaAnggaran: 3,
    skalaProgramUnggulan: 3,
    skalaTemuanFraud: 2,
    skalaIsuTerkini: 3,
    skalaTahunAudit: 3,
    skalaPengalamanApip: 3,
    permintaanKDH: false,
  });

  // Simpan data & peringkat
  const handleSaveData = (newData: PrioritasProgramRPJMDItem[]) => {
    const ranked = sortAndRankMenu8(newData);
    setData(ranked);
    localStorage.setItem('ppbr_prioritas_program', JSON.stringify(ranked));
  };

  // Fungsi sinkronisasi otomatis dari Menu 1, 4, 5, 6, 7
  const performSyncFromMenus = (mode: 'full' | 'update_only' = 'full') => {
    const menu1List = getAuditUniversePrograms();
    const anggaranMap = getFaktorAnggaranMap();
    const unggulanMap = getFaktorUnggulanMap();
    const temuanMap = getFaktorTemuanMap();
    const isuMap = getFaktorIsuMap();

    const existingMap = new Map<string, PrioritasProgramRPJMDItem>();
    data.forEach(item => {
      if (item.program) {
        existingMap.set(item.program.trim().toLowerCase(), item);
      }
    });

    const resultList: PrioritasProgramRPJMDItem[] = [];

    menu1List.forEach((m1, idx) => {
      const key = m1.program.trim().toLowerCase();
      const existing = existingMap.get(key);

      const sAnggaran = anggaranMap.get(key)?.skala ?? (existing?.skalaAnggaran ?? 1);
      const sUnggulan = unggulanMap.get(key)?.skala ?? (existing?.skalaProgramUnggulan ?? 1);
      const sTemuan = temuanMap.get(key)?.skala ?? (existing?.skalaTemuanFraud ?? 1);
      const sIsu = isuMap.get(key)?.skala ?? (existing?.skalaIsuTerkini ?? 1);

      const sReg = existing?.skalaRegisterRisiko ?? 3.5;
      const sThn = existing?.skalaTahunAudit ?? 3;
      const sApip = existing?.skalaPengalamanApip ?? 3;
      const isKDH = existing?.permintaanKDH === 'Ya' || Boolean(existing?.isKDH);

      const calc = calculateSkorMenu8({
        skalaRegisterRisiko: sReg,
        skalaAnggaran: sAnggaran,
        skalaProgramUnggulan: sUnggulan,
        skalaTemuanFraud: sTemuan,
        skalaIsuTerkini: sIsu,
        skalaTahunAudit: sThn,
        skalaPengalamanApip: sApip,
        permintaanKDH: isKDH ? 'Ya' : 'Tidak',
        isKDH: isKDH,
      });

      resultList.push({
        id: existing?.id || `ppr-${idx + 1}-${Date.now()}`,
        no: idx + 1,
        program: m1.program,
        opdPengampu: m1.opdPengampu || existing?.opdPengampu || '',
        skalaRegisterRisiko: sReg,
        skalaAnggaran: sAnggaran,
        skalaProgramUnggulan: sUnggulan,
        skalaTemuanFraud: sTemuan,
        skalaIsuTerkini: sIsu,
        skalaTahunAudit: sThn,
        skalaPengalamanApip: sApip,
        permintaanKDH: isKDH ? 'Ya' : 'Tidak',
        isKDH: isKDH,
        rataRataManajemen: calc.rataRataManajemen,
        skorManajemenLainnya: calc.skorManajemenLainnya,
        skorTotal: calc.skorTotal,
        ranking: 1,
        tingkatRisiko: calc.tingkatRisiko,
      });
    });

    // Pertahankan program non-Menu 1 jika ada
    if (mode === 'update_only') {
      data.forEach(d => {
        if (d.program && !menu1List.some(m => m.program.trim().toLowerCase() === d.program!.trim().toLowerCase())) {
          resultList.push(d);
        }
      });
    }

    handleSaveData(resultList);
    setShowSyncModal(false);
  };

  // Inisialisasi awal saat tabel kosong
  useEffect(() => {
    if (data.length === 0) {
      performSyncFromMenus('full');
    }
  }, []);

  // Toggle Permintaan KDH langsung di tabel
  const handleToggleKDH = (item: PrioritasProgramRPJMDItem) => {
    const currentKDH = item.permintaanKDH === 'Ya' || Boolean(item.isKDH);
    const nextKDH = !currentKDH;

    const calc = calculateSkorMenu8({
      ...item,
      permintaanKDH: nextKDH ? 'Ya' : 'Tidak',
      isKDH: nextKDH,
    });

    const updatedItem: PrioritasProgramRPJMDItem = {
      ...item,
      permintaanKDH: nextKDH ? 'Ya' : 'Tidak',
      isKDH: nextKDH,
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      tingkatRisiko: calc.tingkatRisiko,
    };

    const updated = data.map(d => (d.id === item.id ? updatedItem : d));
    handleSaveData(updated);
  };

  // Update inline skala tahun audit
  const handleUpdateTahunAudit = (item: PrioritasProgramRPJMDItem, newSkala: number) => {
    const calc = calculateSkorMenu8({
      ...item,
      skalaTahunAudit: newSkala,
    });

    const updatedItem: PrioritasProgramRPJMDItem = {
      ...item,
      skalaTahunAudit: newSkala,
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      tingkatRisiko: calc.tingkatRisiko,
    };

    const updated = data.map(d => (d.id === item.id ? updatedItem : d));
    handleSaveData(updated);
  };

  // Update inline skala pengalaman APIP
  const handleUpdatePengalamanApip = (item: PrioritasProgramRPJMDItem, newSkala: number) => {
    const calc = calculateSkorMenu8({
      ...item,
      skalaPengalamanApip: newSkala,
    });

    const updatedItem: PrioritasProgramRPJMDItem = {
      ...item,
      skalaPengalamanApip: newSkala,
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      tingkatRisiko: calc.tingkatRisiko,
    };

    const updated = data.map(d => (d.id === item.id ? updatedItem : d));
    handleSaveData(updated);
  };

  // Simpan hasil form edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const calc = calculateSkorMenu8({
      ...editingItem,
      permintaanKDH: editingItem.permintaanKDH,
      isKDH: editingItem.permintaanKDH === 'Ya' || editingItem.permintaanKDH === true || editingItem.isKDH,
    });

    const updatedItem: PrioritasProgramRPJMDItem = {
      ...editingItem,
      skalaRegisterRisiko: Number(editingItem.skalaRegisterRisiko),
      skalaAnggaran: Number(editingItem.skalaAnggaran),
      skalaProgramUnggulan: Number(editingItem.skalaProgramUnggulan),
      skalaTemuanFraud: Number(editingItem.skalaTemuanFraud),
      skalaIsuTerkini: Number(editingItem.skalaIsuTerkini),
      skalaTahunAudit: Number(editingItem.skalaTahunAudit),
      skalaPengalamanApip: Number(editingItem.skalaPengalamanApip),
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      tingkatRisiko: calc.tingkatRisiko,
    };

    const updated = data.map(d => (d.id === updatedItem.id ? updatedItem : d));
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Tambah item manual
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const isKDH = newItem.permintaanKDH;
    const calc = calculateSkorMenu8({
      skalaRegisterRisiko: newItem.skalaRegisterRisiko,
      skalaAnggaran: newItem.skalaAnggaran,
      skalaProgramUnggulan: newItem.skalaProgramUnggulan,
      skalaTemuanFraud: newItem.skalaTemuanFraud,
      skalaIsuTerkini: newItem.skalaIsuTerkini,
      skalaTahunAudit: newItem.skalaTahunAudit,
      skalaPengalamanApip: newItem.skalaPengalamanApip,
      permintaanKDH: isKDH ? 'Ya' : 'Tidak',
      isKDH: isKDH,
    });

    const item: PrioritasProgramRPJMDItem = {
      id: `ppr-${Date.now()}`,
      no: data.length + 1,
      program: newItem.program,
      opdPengampu: newItem.opdPengampu,
      skalaRegisterRisiko: Number(newItem.skalaRegisterRisiko),
      skalaAnggaran: Number(newItem.skalaAnggaran),
      skalaProgramUnggulan: Number(newItem.skalaProgramUnggulan),
      skalaTemuanFraud: Number(newItem.skalaTemuanFraud),
      skalaIsuTerkini: Number(newItem.skalaIsuTerkini),
      skalaTahunAudit: Number(newItem.skalaTahunAudit),
      skalaPengalamanApip: Number(newItem.skalaPengalamanApip),
      permintaanKDH: isKDH ? 'Ya' : 'Tidak',
      isKDH: isKDH,
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      ranking: 1,
      tingkatRisiko: calc.tingkatRisiko,
    };

    handleSaveData([...data, item]);
    setShowAddModal(false);
    setNewItem({
      program: '',
      opdPengampu: '',
      skalaRegisterRisiko: 3.5,
      skalaAnggaran: 3,
      skalaProgramUnggulan: 3,
      skalaTemuanFraud: 2,
      skalaIsuTerkini: 3,
      skalaTahunAudit: 3,
      skalaPengalamanApip: 3,
      permintaanKDH: false,
    });
  };

  const requestResetPenilaian = (item: PrioritasProgramRPJMDItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Penilaian Prioritas Program?',
      message: 'Apakah Anda yakin ingin mereset/menghapus penilaian untuk program ini? Nama program dan OPD akan tetap ada di tabel.',
      detail: `Program: "${item.program}" | OPD: ${item.opdPengampu} | Skor Saat Ini: ${Number(item.skorTotal || 0).toFixed(2)}`,
      confirmText: 'Ya, Hapus Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const calc = calculateSkorMenu8({
          skalaRegisterRisiko: 1,
          skalaAnggaran: 1,
          skalaProgramUnggulan: 1,
          skalaTemuanFraud: 1,
          skalaIsuTerkini: 1,
          skalaTahunAudit: 1,
          skalaPengalamanApip: 1,
          permintaanKDH: 'Tidak',
          isKDH: false,
        });

        const updated = data.map(d =>
          d.id === item.id
            ? {
                ...d,
                skalaRegisterRisiko: 1,
                skalaAnggaran: 1,
                skalaProgramUnggulan: 1,
                skalaTemuanFraud: 1,
                skalaIsuTerkini: 1,
                skalaTahunAudit: 1,
                skalaPengalamanApip: 1,
                permintaanKDH: 'Tidak',
                isKDH: false,
                rataRataManajemen: calc.rataRataManajemen,
                skorManajemenLainnya: calc.skorManajemenLainnya,
                skorTotal: calc.skorTotal,
                tingkatRisiko: calc.tingkatRisiko,
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
      title: 'Hapus Seluruh Penilaian Prioritas Program?',
      message: `Apakah Anda yakin ingin mereset penilaian untuk seluruh program (${data.length} program)?`,
      detail: 'Semua skala penilaian (Register Risiko, Faktor Pokok, Manajemen Lainnya, Permintaan KDH) akan direset ke skala baseline 1. Nama program dan OPD tetap aman di tabel.',
      confirmText: 'Ya, Reset Semua Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const calc = calculateSkorMenu8({
          skalaRegisterRisiko: 1,
          skalaAnggaran: 1,
          skalaProgramUnggulan: 1,
          skalaTemuanFraud: 1,
          skalaIsuTerkini: 1,
          skalaTahunAudit: 1,
          skalaPengalamanApip: 1,
          permintaanKDH: 'Tidak',
          isKDH: false,
        });

        const updated = data.map(d => ({
          ...d,
          skalaRegisterRisiko: 1,
          skalaAnggaran: 1,
          skalaProgramUnggulan: 1,
          skalaTemuanFraud: 1,
          skalaIsuTerkini: 1,
          skalaTahunAudit: 1,
          skalaPengalamanApip: 1,
          permintaanKDH: 'Tidak',
          isKDH: false,
          rataRataManajemen: calc.rataRataManajemen,
          skorManajemenLainnya: calc.skorManajemenLainnya,
          skorTotal: calc.skorTotal,
          tingkatRisiko: calc.tingkatRisiko,
        }));
        handleSaveData(updated);
      }
    });
  };

  const filteredData = data.filter(d =>
    (d.program || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countKDH = data.filter(d => d.permintaanKDH === 'Ya' || d.permintaanKDH === true || d.isKDH).length;
  const countHighRisk = data.filter(d => (d.skorTotal || 0) >= 3.5).length;

  const handleExportExcel = () => {
    const cols = [
      { header: 'Rank', key: 'ranking', width: 8 },
      { header: 'Program RPJMD (Menu 1)', key: 'program', width: 35 },
      { header: 'OPD Pengampu (Menu 1)', key: 'opdPengampu', width: 28 },
      { header: 'Register Risiko (70%)', key: 'skalaRegisterRisiko', width: 20 },
      { header: 'Skala Anggaran (M4)', key: 'skalaAnggaran', width: 18 },
      { header: 'Skala Unggulan (M5)', key: 'skalaProgramUnggulan', width: 18 },
      { header: 'Skala Temuan (M6)', key: 'skalaTemuanFraud', width: 18 },
      { header: 'Skala Isu Terkini (M7)', key: 'skalaIsuTerkini', width: 18 },
      { header: 'Rata-rata Manajemen Pokok (15%)', key: 'rataRataManajemen', width: 25 },
      { header: 'x-Thn Audit Terakhir (10%)', key: 'skalaTahunAudit', width: 22 },
      { header: 'Pengalaman APIP (5%)', key: 'skalaPengalamanApip', width: 20 },
      { header: 'Permintaan KDH (100% Top)', key: 'permintaanKDH', width: 22 },
      { header: 'Skor Total Akhir', key: 'skorTotal', width: 18 },
      { header: 'Kategori Prioritas', key: 'tingkatRisiko', width: 18 },
    ];

    exportToExcel(
      'Lampiran_8_Penetapan_Prioritas_Program_RPJMD',
      'LAMPIRAN 8: PENETAPAN PRIORITAS PROGRAM RPJMD (PBBR)',
      `Register Risiko: 70% | Manajemen Pokok: 15% | Thn Audit: 10% | Pengalaman APIP: 5% | Permintaan KDH: 100% Prioritas Mutlak`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['Rank', 'Program RPJMD', 'OPD Pengampu', 'Register (70%)', 'M. Pokok (15%)', 'M. Lain (15%)', 'KDH', 'Skor Total', 'Kategori'];
    const rows = filteredData.map(d => [
      `#${d.ranking}`,
      d.program || '',
      d.opdPengampu || '',
      (d.skalaRegisterRisiko || 0).toFixed(2),
      (d.rataRataManajemen || 0).toFixed(2),
      (d.skorManajemenLainnya || 0).toFixed(2),
      (d.permintaanKDH === 'Ya' || d.isKDH) ? 'YA (100%)' : 'Tidak',
      (d.skorTotal || 0).toFixed(2),
      d.tingkatRisiko || '-'
    ]);

    exportToPdf(
      'Lampiran_8_Penetapan_Prioritas_Program_RPJMD',
      'LAMPIRAN 8: PENETAPAN PRIORITAS PROGRAM RPJMD',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 8
              </span>
              <span className="text-xs text-emerald-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Penetapan Prioritas Program RPJMD
            </h1>
            <p className="text-sm text-emerald-100/80 mt-1 max-w-3xl">
              Integrasi komprehensif data Program & OPD (Menu 1), Anggaran (Menu 4), Unggulan (Menu 5), Temuan (Menu 6), Isu Terkini (Menu 7), serta Tabel Pertimbangan Manajemen Lainnya (Audit Terakhir, Pengalaman APIP, dan Permintaan KDH).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronisasi dari Menu 1, 4, 5, 6, 7</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-emerald-700/50"
            >
              <Info className="w-3.5 h-3.5 text-emerald-300" />
              <span>Petunjuk & Rumus</span>
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
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Manual</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetAllPenilaian}
                className="px-3.5 py-2 bg-slate-800 hover:bg-amber-900/60 text-slate-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Hapus / Reset Seluruh Penilaian Prioritas Program"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Penilaian</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/40">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Program Terdaftar</span>
            <span className="text-xl font-black text-white mt-0.5 block">{data.length} Program</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-amber-300 block font-medium flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              Permintaan KDH (100% Top)
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{countKDH} Program</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-rose-300 block font-medium">Risiko Tinggi / Prioritas</span>
            <span className="text-xl font-black text-rose-400 mt-0.5 block">{countHighRisk} Program</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-emerald-300 block font-medium">Bobot Formulasi Baku</span>
            <span className="text-xs text-emerald-100 mt-1 block font-semibold">
              Reg: 70% | Pokok: 15% | Thn: 10% | APIP: 5%
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk & Rumus Formula PPBR */}
      {showGuide && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
            <Info className="w-4 h-4 text-emerald-600" />
            FORMULA PEMBOBOTAN PENETAPAN PRIORITAS PROGRAM RPJMD (PPBR)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">1. Komposisi Bobot Penilaian Normal (100%):</span>
              <p>&bull; <strong>Register Risiko OPD</strong>: Bobot <strong>70%</strong></p>
              <p>&bull; <strong>Faktor Manajemen Pokok</strong>: Bobot <strong>15%</strong> (Rata-rata 4 faktor: Anggaran M4, Unggulan M5, Temuan M6, Isu Terkini M7)</p>
              <p>&bull; <strong>x-Thn Audit Terakhir</strong>: Bobot <strong>10%</strong> (Skala 1 s.d 5)</p>
              <p>&bull; <strong>Pengalaman APIP</strong>: Bobot <strong>5%</strong> (Skala 1 s.d 5)</p>
              <p className="text-slate-500 font-mono text-[11px] pt-1">
                Skor Total = (Register &times; 70%) + (Rata2 Pokok &times; 15%) + (Thn Audit &times; 10%) + (APIP &times; 5%)
              </p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 space-y-1.5">
              <span className="font-bold text-amber-900 block text-xs flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-600" />
                2. Ketentuan Khusus Permintaan Kepala Daerah (KDH):
              </span>
              <p>
                Sesuai prinsip mandatori pengawasan inspektorat, jika kolom <strong>Permintaan KDH</strong> diaktifkan (Ya), bobotnya <strong>LANGSUNG 100%</strong> dengan skor total otomatis <strong>5.00</strong>.
              </p>
              <p className="font-semibold text-amber-800">
                Program tersebut secara otomatis melesat menduduki Ranking Teratas (#1) dalam daftar usulan rencana pengawasan tahunan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Switcher Tab */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Tabel
          </button>
          <button
            onClick={() => setActiveTab('prioritas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'prioritas'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tabel 1: Prioritas Utama
          </button>
          <button
            onClick={() => setActiveTab('manajemen_lain')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'manajemen_lain'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tabel 2: Pertimbangan Manajemen Lainnya</span>
            {countKDH > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                {countKDH}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari program RPJMD atau OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* TABEL 1: PENETAPAN PRIORITAS PROGRAM RPJMD (UTAMA) */}
      {(activeTab === 'all' || activeTab === 'prioritas') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-sm font-bold tracking-wide">
                TABEL 1: PENETAPAN PRIORITAS PROGRAM RPJMD (SKOR KOMPOSIT)
              </h2>
            </div>
            <span className="text-xs text-slate-300">
              Diurutkan dari Skor Total Tertinggi & Prioritas KDH
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-center">
                  <th rowSpan={2} className="p-2.5 w-14 font-bold border-r border-slate-700">Rank</th>
                  <th rowSpan={2} className="p-2.5 min-w-[220px] text-left font-semibold border-r border-slate-700">
                    Program RPJMD (Menu 1)
                  </th>
                  <th rowSpan={2} className="p-2.5 min-w-[170px] text-left font-semibold border-r border-slate-700">
                    Perangkat Daerah (OPD)
                  </th>
                  <th rowSpan={2} className="p-2.5 w-24 bg-emerald-950 text-emerald-300 font-bold border-r border-emerald-900">
                    Register Risiko (70%)
                  </th>
                  <th colSpan={5} className="p-2 bg-slate-800/90 text-amber-300 font-bold border-b border-slate-700 border-r border-slate-700">
                    FAKTOR MANAJEMEN POKOK (15%)
                  </th>
                  <th colSpan={3} className="p-2 bg-indigo-950 text-indigo-200 font-bold border-b border-indigo-900 border-r border-indigo-900">
                    MANAJEMEN LAINNYA (15%)
                  </th>
                  <th rowSpan={2} className="p-2.5 w-24 bg-blue-950 text-cyan-300 font-black border-r border-blue-900">
                    Skor Total
                  </th>
                  <th rowSpan={2} className="p-2.5 w-28 font-semibold border-r border-slate-700">
                    Prioritas
                  </th>
                  <th rowSpan={2} className="p-2.5 w-20 font-semibold">Aksi</th>
                </tr>
                <tr className="bg-slate-700/80 text-slate-200 text-center text-[11px]">
                  <th className="p-1.5 w-16 border-r border-slate-600" title="Dari Menu 4">Anggaran</th>
                  <th className="p-1.5 w-16 border-r border-slate-600" title="Dari Menu 5">Unggulan</th>
                  <th className="p-1.5 w-16 border-r border-slate-600" title="Dari Menu 6">Temuan</th>
                  <th className="p-1.5 w-16 border-r border-slate-600" title="Dari Menu 7">Isu Terkini</th>
                  <th className="p-1.5 w-16 bg-amber-950/60 text-amber-300 font-bold border-r border-slate-700">Rata2 Pokok</th>
                  <th className="p-1.5 min-w-[125px] border-r border-indigo-900 font-semibold" title="Bobot 10%">x-Tahun Audit Terakhir</th>
                  <th className="p-1.5 min-w-[125px] border-r border-indigo-900 font-semibold" title="Bobot 5%">Pengalaman APIP</th>
                  <th className="p-1.5 w-24 bg-amber-900/60 text-amber-200 font-bold border-r border-indigo-900">KDH (100%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="text-slate-600 font-medium">Belum ada data Prioritas Program RPJMD.</p>
                        <button
                          onClick={() => performSyncFromMenus('full')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Tarik Data Otomatis dari Menu 1, 4, 5, 6, 7</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => {
                    const isKDH = item.permintaanKDH === 'Ya' || item.permintaanKDH === true || item.isKDH;
                    return (
                      <tr
                        key={item.id}
                        className={`transition hover:bg-emerald-50/40 ${
                          isKDH ? 'bg-amber-50/70 border-l-4 border-amber-500 font-medium' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            isKDH
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md'
                              : item.ranking === 1
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : item.ranking === 2
                              ? 'bg-teal-600 text-white shadow-sm'
                              : item.ranking === 3
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isKDH ? <Crown className="w-3.5 h-3.5 text-amber-100" /> : item.ranking}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{item.program}</span>
                            {isKDH && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                                KDH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.opdPengampu || '-'}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-800 bg-emerald-50/30">
                          {Number(item.skalaRegisterRisiko || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-center text-slate-700 font-semibold">{item.skalaAnggaran ?? 1}</td>
                        <td className="p-2 text-center text-slate-700 font-semibold">{item.skalaProgramUnggulan ?? 1}</td>
                        <td className="p-2 text-center text-slate-700 font-semibold">{item.skalaTemuanFraud ?? 1}</td>
                        <td className="p-2 text-center text-slate-700 font-semibold">{item.skalaIsuTerkini ?? 1}</td>
                        <td className="p-2 text-center font-bold text-amber-800 bg-amber-50/40">
                          {Number(item.rataRataManajemen || 0).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center">
                          <select
                            value={item.skalaTahunAudit ?? 3}
                            onChange={e => handleUpdateTahunAudit(item, Number(e.target.value))}
                            disabled={isKDH}
                            className={`w-full max-w-[115px] px-1.5 py-1 text-xs rounded-lg border font-semibold transition ${
                              isKDH
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-1 focus:ring-emerald-400 cursor-pointer'
                            }`}
                            title="Pilih x-Tahun Audit Terakhir (Bobot 10%)"
                          >
                            {PILIHAN_TAHUN_AUDIT.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                Skala {opt.value} ({opt.label.split(' - ')[0]})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 text-center">
                          <select
                            value={item.skalaPengalamanApip ?? 3}
                            onChange={e => handleUpdatePengalamanApip(item, Number(e.target.value))}
                            disabled={isKDH}
                            className={`w-full max-w-[115px] px-1.5 py-1 text-xs rounded-lg border font-semibold transition ${
                              isKDH
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-1 focus:ring-emerald-400 cursor-pointer'
                            }`}
                            title="Pilih Pengalaman APIP (Bobot 5%)"
                          >
                            {PILIHAN_PENGALAMAN_APIP.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                Skala {opt.value} ({opt.label.split(' - ')[0]})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleToggleKDH(item)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase transition ${
                              isKDH
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Klik untuk mengubah status permintaan Kepala Daerah (KDH)"
                          >
                            {isKDH ? 'YA (100%)' : 'TIDAK'}
                          </button>
                        </td>
                        <td className="p-2.5 text-center font-black text-blue-900 text-sm bg-blue-50/50">
                          {isKDH ? '5.00' : Number(item.skorTotal || 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase inline-flex items-center gap-1 ${
                            isKDH
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : (item.skorTotal || 0) >= 3.5
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : (item.skorTotal || 0) >= 2.5
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isKDH ? 'Mandatori KDH' : item.tingkatRisiko || 'Sedang'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingItem({ ...item });
                                setShowEditModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Penilaian Baris Ini"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestResetPenilaian(item)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                              title="Hapus / Reset Penilaian (Set Skala = 1)"
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
      )}

      {/* TABEL 2: PERTIMBANGAN MANAJEMEN LAINNYA */}
      {(activeTab === 'all' || activeTab === 'manajemen_lain') && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold tracking-wide text-amber-200">
                  TABEL 2: PERTIMBANGAN MANAJEMEN LAINNYA
                </h2>
              </div>
              <p className="text-xs text-amber-100/70 mt-0.5">
                x-Tahun Audit Terakhir (10%) + Pengalaman APIP (5%) + Permintaan KDH (Bobot 100% & Prioritas #1)
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg font-bold">
              Sub-Bobot Manajemen Lainnya: 15%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-center">
                  <th className="p-3 w-12 font-bold border-r border-slate-700">No</th>
                  <th className="p-3 min-w-[220px] text-left font-semibold border-r border-slate-700">Program RPJMD</th>
                  <th className="p-3 min-w-[160px] text-left font-semibold border-r border-slate-700">OPD Pengampu</th>
                  <th className="p-3 min-w-[200px] text-left bg-indigo-950 text-indigo-300 font-bold border-r border-indigo-900">
                    x-Tahun Audit Terakhir (Bobot 10%)
                  </th>
                  <th className="p-3 min-w-[200px] text-left bg-indigo-950 text-indigo-300 font-bold border-r border-indigo-900">
                    Pengalaman APIP (Bobot 5%)
                  </th>
                  <th className="p-3 w-36 bg-amber-950 text-amber-300 font-bold border-r border-amber-900">
                    Permintaan KDH (Bobot 100%)
                  </th>
                  <th className="p-3 w-28 bg-slate-900 text-slate-200 font-bold border-r border-slate-700">
                    Skor Tertimbang
                  </th>
                  <th className="p-3 w-24 font-semibold">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Belum ada data pertimbangan manajemen lainnya.
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => {
                    const isKDH = item.permintaanKDH === 'Ya' || item.permintaanKDH === true || item.isKDH;
                    return (
                      <tr
                        key={`man-${item.id}`}
                        className={`hover:bg-amber-50/40 transition ${
                          isKDH ? 'bg-amber-50/60 font-medium' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-500 font-semibold">{item.no}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <span>{item.program}</span>
                        </td>
                        <td className="p-3 text-slate-700">{item.opdPengampu}</td>
                        
                        {/* Dropdown x-Thn Audit Terakhir */}
                        <td className="p-3">
                          <select
                            value={item.skalaTahunAudit ?? 3}
                            onChange={e => handleUpdateTahunAudit(item, Number(e.target.value))}
                            disabled={isKDH}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition ${
                              isKDH
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400'
                            }`}
                          >
                            {PILIHAN_TAHUN_AUDIT.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Dropdown Pengalaman APIP */}
                        <td className="p-3">
                          <select
                            value={item.skalaPengalamanApip ?? 3}
                            onChange={e => handleUpdatePengalamanApip(item, Number(e.target.value))}
                            disabled={isKDH}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition ${
                              isKDH
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400'
                            }`}
                          >
                            {PILIHAN_PENGALAMAN_APIP.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Permintaan KDH Switcher */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleKDH(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition inline-flex items-center gap-1.5 ${
                              isKDH
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isKDH ? (
                              <>
                                <Crown className="w-3.5 h-3.5" />
                                <span>YA (100%)</span>
                              </>
                            ) : (
                              <span>TIDAK</span>
                            )}
                          </button>
                        </td>

                        {/* Skor Tertimbang Manajemen Lainnya */}
                        <td className="p-3 text-center font-bold text-amber-900 bg-amber-50/50">
                          {isKDH ? '5.00 (100%)' : Number(item.skorManajemenLainnya || 3.0).toFixed(2)}
                        </td>

                        {/* Aksi Cepat Edit */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setEditingItem({ ...item });
                              setShowEditModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Sinkronisasi dari Menu 1, 4, 5, 6, 7 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Sinkronisasi Data Otomatis</h3>
                  <p className="text-xs text-slate-500">Tarik dari Menu 1 (Universe), 4, 5, 6, dan 7</p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs text-slate-700 leading-relaxed">
              <p>
                Proses ini akan membaca dan menyinkronkan data secara otomatis:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-medium">
                <div className="flex items-center justify-between text-emerald-800">
                  <span>&bull; Program RPJMD & OPD Pengampu:</span>
                  <span className="font-bold">Menu 1 (Audit Universe)</span>
                </div>
                <div className="flex items-center justify-between text-amber-800">
                  <span>&bull; Skala Faktor Anggaran:</span>
                  <span className="font-bold">Menu 4 (Faktor Anggaran)</span>
                </div>
                <div className="flex items-center justify-between text-purple-800">
                  <span>&bull; Skala Program Unggulan:</span>
                  <span className="font-bold">Menu 5 (Program Unggulan)</span>
                </div>
                <div className="flex items-center justify-between text-rose-800">
                  <span>&bull; Skala Temuan & Kasus Hukum:</span>
                  <span className="font-bold">Menu 6 (Temuan & Fraud)</span>
                </div>
                <div className="flex items-center justify-between text-orange-800">
                  <span>&bull; Skala Isu Terkini & Sosial:</span>
                  <span className="font-bold">Menu 7 (Isu Terkini)</span>
                </div>
              </div>
              <p className="text-slate-500 text-[11px]">
                * Pengaturan Permintaan KDH, x-Tahun Audit Terakhir, dan Pengalaman APIP yang sudah Anda tetapkan sebelumnya akan tetap dipertahankan dengan aman.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => performSyncFromMenus('full')}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Mulai Sinkronisasi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Tambah Program Prioritas RPJMD
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Program RPJMD *</label>
                <input
                  type="text"
                  required
                  value={newItem.program}
                  onChange={e => setNewItem({ ...newItem, program: e.target.value })}
                  placeholder="Contoh: Program Pengelolaan Pelayanan Kesehatan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">OPD Pengampu *</label>
                <input
                  type="text"
                  required
                  value={newItem.opdPengampu}
                  onChange={e => setNewItem({ ...newItem, opdPengampu: e.target.value })}
                  placeholder="Contoh: Dinas Kesehatan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Register Risiko (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={newItem.skalaRegisterRisiko}
                    onChange={e => setNewItem({ ...newItem, skalaRegisterRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Anggaran (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaAnggaran}
                    onChange={e => setNewItem({ ...newItem, skalaAnggaran: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Unggulan (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaProgramUnggulan}
                    onChange={e => setNewItem({ ...newItem, skalaProgramUnggulan: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Temuan (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaTemuanFraud}
                    onChange={e => setNewItem({ ...newItem, skalaTemuanFraud: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Isu Terkini (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaIsuTerkini}
                    onChange={e => setNewItem({ ...newItem, skalaIsuTerkini: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">x-Thn Audit (1-5)</label>
                  <select
                    value={newItem.skalaTahunAudit}
                    onChange={e => setNewItem({ ...newItem, skalaTahunAudit: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    {PILIHAN_TAHUN_AUDIT.map(opt => (
                      <option key={opt.value} value={opt.value}>Skala {opt.value}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permintaan KDH */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.permintaanKDH}
                    onChange={e => setNewItem({ ...newItem, permintaanKDH: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      Permintaan Khusus Kepala Daerah (KDH)
                    </span>
                    <span className="text-[11px] text-amber-800 block">
                      Bobot langsung 100% & otomatis menduduki Ranking #1 Teratas
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan & Perangkingan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Item */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Edit Skor Prioritas Program RPJMD
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Program RPJMD</label>
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
                  <label className="block text-xs font-semibold text-slate-700">OPD Pengampu</label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari Menu 1
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={editingItem.opdPengampu || '-'}
                    className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Register Risiko (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingItem.skalaRegisterRisiko}
                    onChange={e => setEditingItem({ ...editingItem, skalaRegisterRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Anggaran (M4)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaAnggaran}
                    onChange={e => setEditingItem({ ...editingItem, skalaAnggaran: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Unggulan (M5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaProgramUnggulan}
                    onChange={e => setEditingItem({ ...editingItem, skalaProgramUnggulan: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Temuan (M6)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaTemuanFraud}
                    onChange={e => setEditingItem({ ...editingItem, skalaTemuanFraud: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Isu Terkini (M7)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaIsuTerkini}
                    onChange={e => setEditingItem({ ...editingItem, skalaIsuTerkini: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">x-Tahun Audit Terakhir (Bobot 10%)</label>
                  <select
                    value={editingItem.skalaTahunAudit ?? 3}
                    onChange={e => setEditingItem({ ...editingItem, skalaTahunAudit: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {PILIHAN_TAHUN_AUDIT.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pengalaman APIP (Bobot 5%)</label>
                  <select
                    value={editingItem.skalaPengalamanApip ?? 3}
                    onChange={e => setEditingItem({ ...editingItem, skalaPengalamanApip: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {PILIHAN_PENGALAMAN_APIP.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permintaan KDH */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.permintaanKDH === 'Ya' || editingItem.permintaanKDH === true || editingItem.isKDH}
                    onChange={e => setEditingItem({
                      ...editingItem,
                      permintaanKDH: e.target.checked ? 'Ya' : 'Tidak',
                      isKDH: e.target.checked,
                    })}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      Permintaan Khusus Kepala Daerah (KDH)
                    </span>
                    <span className="text-[11px] text-amber-800 block">
                      Mengabaikan bobot lainnya, bobot langsung 100% & menduduki Ranking #1 Teratas
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
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
