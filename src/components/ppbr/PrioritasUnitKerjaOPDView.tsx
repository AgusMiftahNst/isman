import React, { useState, useEffect } from 'react';
import { PrioritasUnitKerjaOPDItem, INITIAL_PRIORITAS_OPD } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  getAuditUniverseOPDs,
  getFaktorAnggaranMap,
  getFaktorUnggulanMap,
  getFaktorTemuanMap,
  getFaktorIsuMap,
  PILIHAN_TAHUN_AUDIT,
  PILIHAN_PENGALAMAN_APIP,
  calculateSkorMenu9,
  sortAndRankMenu9
} from './ppbrSyncHelpers';
import {
  Building2,
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
  Crown,
  AlertTriangle,
  Layers,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export const PrioritasUnitKerjaOPDView: React.FC = () => {
  const [data, setData] = useState<PrioritasUnitKerjaOPDItem[]>(() => {
    const saved = localStorage.getItem('ppbr_prioritas_opd');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortAndRankMenu9(parsed);
        }
      } catch (e) {
        console.error('Error loading ppbr_prioritas_opd', e);
      }
    }
    return INITIAL_PRIORITAS_OPD;
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
  const [editingItem, setEditingItem] = useState<PrioritasUnitKerjaOPDItem | null>(null);

  // Form tambah OPD manual
  const [newItem, setNewItem] = useState<{
    unitKerja: string;
    kematanganMRLevel: number;
    skalaRegisterRisiko: number;
    skalaAnggaran: number;
    skalaProgramUnggulan: number;
    skalaTemuanFraud: number;
    skalaIsuTerkini: number;
    skalaTahunAudit: number;
    skalaPengalamanApip: number;
    permintaanKDH: boolean;
  }>({
    unitKerja: '',
    kematanganMRLevel: 3,
    skalaRegisterRisiko: 3.5,
    skalaAnggaran: 3,
    skalaProgramUnggulan: 3,
    skalaTemuanFraud: 2,
    skalaIsuTerkini: 3,
    skalaTahunAudit: 3,
    skalaPengalamanApip: 3,
    permintaanKDH: false,
  });

  const handleSaveData = (newData: PrioritasUnitKerjaOPDItem[]) => {
    const ranked = sortAndRankMenu9(newData);
    setData(ranked);
    localStorage.setItem('ppbr_prioritas_opd', JSON.stringify(ranked));
  };

  // Sinkronisasi otomatis dari Menu 1, 4, 5, 6, 7 khusus OPD (fokus ke OPD, tanpa program)
  const performSyncFromMenus = (mode: 'full' | 'update_only' = 'full') => {
    const opdList = getAuditUniverseOPDs();
    const anggaranMap = getFaktorAnggaranMap();
    const unggulanMap = getFaktorUnggulanMap();
    const temuanMap = getFaktorTemuanMap();
    const isuMap = getFaktorIsuMap();

    const existingMap = new Map<string, PrioritasUnitKerjaOPDItem>();
    data.forEach(item => {
      const name = (item.unitKerja || item.opd || '').trim().toLowerCase();
      if (name) existingMap.set(name, item);
    });

    const resultList: PrioritasUnitKerjaOPDItem[] = [];

    opdList.forEach((opdInfo, idx) => {
      const key = opdInfo.opd.trim().toLowerCase();
      const existing = existingMap.get(key);

      // Hitung agregat skor faktor dari program-program di bawah OPD ini
      let totalAnggaranSkala = 0;
      let countAnggaran = 0;
      let maxUnggulanSkala = 1;
      let maxTemuanSkala = 1;
      let maxIsuSkala = 1;

      opdInfo.programList.forEach(p => {
        const pKey = p.trim().toLowerCase();
        const ang = anggaranMap.get(pKey);
        if (ang) {
          totalAnggaranSkala += ang.skala;
          countAnggaran++;
        }
        const ung = unggulanMap.get(pKey);
        if (ung && ung.skala > maxUnggulanSkala) maxUnggulanSkala = ung.skala;

        const tem = temuanMap.get(pKey);
        if (tem && tem.skala > maxTemuanSkala) maxTemuanSkala = tem.skala;

        const isu = isuMap.get(pKey);
        if (isu && isu.skala > maxIsuSkala) maxIsuSkala = isu.skala;
      });

      const sAnggaran = countAnggaran > 0 ? Math.round(totalAnggaranSkala / countAnggaran) : (existing?.skalaAnggaran ?? 3);
      const sUnggulan = maxUnggulanSkala > 1 ? maxUnggulanSkala : (existing?.skalaProgramUnggulan ?? 2);
      const sTemuan = maxTemuanSkala > 1 ? maxTemuanSkala : (existing?.skalaTemuanFraud ?? 2);
      const sIsu = maxIsuSkala > 1 ? maxIsuSkala : (existing?.skalaIsuTerkini ?? 2);

      const lvlMR = existing?.kematanganMRLevel ?? 3;
      const sReg = existing?.skalaRegisterRisiko ?? 3.5;
      const sThn = existing?.skalaTahunAudit ?? 3;
      const sApip = existing?.skalaPengalamanApip ?? 3;
      const isKDH = existing?.permintaanKDH === 'Ya' || Boolean(existing?.isKDH);

      const calc = calculateSkorMenu9({
        kematanganMRLevel: lvlMR,
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
        id: existing?.id || `puko-${idx + 1}-${Date.now()}`,
        no: idx + 1,
        unitKerja: opdInfo.opd,
        opd: opdInfo.opd,
        kematanganMRLevel: lvlMR,
        kematanganMRBobot: lvlMR === 5 ? 100 : lvlMR === 4 ? 85 : lvlMR === 3 ? 70 : lvlMR === 2 ? 55 : 40,
        skalaRegisterRisiko: sReg,
        skorTertimbangRegister: calc.skorTertimbangRegister,
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

    if (mode === 'update_only') {
      data.forEach(d => {
        const dName = (d.unitKerja || d.opd || '').trim().toLowerCase();
        if (!opdList.some(o => o.opd.trim().toLowerCase() === dName)) {
          resultList.push(d);
        }
      });
    }

    handleSaveData(resultList);
    setShowSyncModal(false);
  };

  useEffect(() => {
    if (data.length === 0) {
      performSyncFromMenus('full');
    }
  }, []);

  // Toggle Permintaan KDH
  const handleToggleKDH = (item: PrioritasUnitKerjaOPDItem) => {
    const currentKDH = item.permintaanKDH === 'Ya' || Boolean(item.isKDH);
    const nextKDH = !currentKDH;

    const calc = calculateSkorMenu9({
      ...item,
      permintaanKDH: nextKDH ? 'Ya' : 'Tidak',
      isKDH: nextKDH,
    });

    const updatedItem: PrioritasUnitKerjaOPDItem = {
      ...item,
      permintaanKDH: nextKDH ? 'Ya' : 'Tidak',
      isKDH: nextKDH,
      skorTertimbangRegister: calc.skorTertimbangRegister,
      rataRataManajemen: calc.rataRataManajemen,
      skorManajemenLainnya: calc.skorManajemenLainnya,
      skorTotal: calc.skorTotal,
      tingkatRisiko: calc.tingkatRisiko,
    };

    const updated = data.map(d => (d.id === item.id ? updatedItem : d));
    handleSaveData(updated);
  };

  // Inline update tahun audit
  const handleUpdateTahunAudit = (item: PrioritasUnitKerjaOPDItem, newSkala: number) => {
    const calc = calculateSkorMenu9({
      ...item,
      skalaTahunAudit: newSkala,
    });

    const updatedItem: PrioritasUnitKerjaOPDItem = {
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

  // Inline update pengalaman APIP
  const handleUpdatePengalamanApip = (item: PrioritasUnitKerjaOPDItem, newSkala: number) => {
    const calc = calculateSkorMenu9({
      ...item,
      skalaPengalamanApip: newSkala,
    });

    const updatedItem: PrioritasUnitKerjaOPDItem = {
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

    const isKDH = editingItem.permintaanKDH === 'Ya' || editingItem.permintaanKDH === true || editingItem.isKDH;
    const calc = calculateSkorMenu9({
      ...editingItem,
      permintaanKDH: isKDH ? 'Ya' : 'Tidak',
      isKDH: isKDH,
    });

    const lvl = Number(editingItem.kematanganMRLevel) || 3;
    const updatedItem: PrioritasUnitKerjaOPDItem = {
      ...editingItem,
      kematanganMRLevel: lvl,
      kematanganMRBobot: lvl === 5 ? 100 : lvl === 4 ? 85 : lvl === 3 ? 70 : lvl === 2 ? 55 : 40,
      skalaRegisterRisiko: Number(editingItem.skalaRegisterRisiko),
      skalaAnggaran: Number(editingItem.skalaAnggaran),
      skalaProgramUnggulan: Number(editingItem.skalaProgramUnggulan),
      skalaTemuanFraud: Number(editingItem.skalaTemuanFraud),
      skalaIsuTerkini: Number(editingItem.skalaIsuTerkini),
      skalaTahunAudit: Number(editingItem.skalaTahunAudit),
      skalaPengalamanApip: Number(editingItem.skalaPengalamanApip),
      permintaanKDH: isKDH ? 'Ya' : 'Tidak',
      isKDH: isKDH,
      skorTertimbangRegister: calc.skorTertimbangRegister,
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

  // Form Tambah OPD manual
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const isKDH = newItem.permintaanKDH;
    const calc = calculateSkorMenu9({
      kematanganMRLevel: newItem.kematanganMRLevel,
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

    const lvl = Number(newItem.kematanganMRLevel) || 3;
    const item: PrioritasUnitKerjaOPDItem = {
      id: `puko-${Date.now()}`,
      no: data.length + 1,
      unitKerja: newItem.unitKerja,
      opd: newItem.unitKerja,
      kematanganMRLevel: lvl,
      kematanganMRBobot: lvl === 5 ? 100 : lvl === 4 ? 85 : lvl === 3 ? 70 : lvl === 2 ? 55 : 40,
      skalaRegisterRisiko: Number(newItem.skalaRegisterRisiko),
      skorTertimbangRegister: calc.skorTertimbangRegister,
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
      unitKerja: '',
      kematanganMRLevel: 3,
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

  const requestDelete = (item: PrioritasUnitKerjaOPDItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Unit Kerja / OPD?',
      message: 'Apakah Anda yakin ingin menghapus OPD ini dari tabel prioritas?',
      detail: `OPD: "${item.unitKerja || item.opd}" | Skor Total: ${item.skorTotal}`,
      confirmText: 'Ya, Hapus OPD',
      variant: 'danger',
      onConfirm: () => {
        const updated = data.filter(d => d.id !== item.id);
        handleSaveData(updated);
      }
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Prioritas OPD?',
      message: `Apakah Anda yakin ingin menghapus seluruh (${data.length} unit kerja) dari tabel prioritas OPD?`,
      detail: 'Tabel akan dikosongkan. Anda dapat melakukan sinkronisasi ulang kapan saja dari Menu 1-7.',
      confirmText: 'Ya, Kosongkan',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  const filteredData = data.filter(d =>
    (d.unitKerja || d.opd || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countKDH = data.filter(d => d.permintaanKDH === 'Ya' || d.permintaanKDH === true || d.isKDH).length;
  const countHighRisk = data.filter(d => (d.skorTotal || 0) >= 3.5).length;

  const handleExportExcel = () => {
    const cols = [
      { header: 'Rank', key: 'ranking', width: 8 },
      { header: 'Unit Kerja / Perangkat Daerah (OPD)', key: 'unitKerja', width: 36 },
      { header: 'Level MR', key: 'kematanganMRLevel', width: 14 },
      { header: 'Bobot MR (%)', key: 'kematanganMRBobot', width: 16 },
      { header: 'Skala Register', key: 'skalaRegisterRisiko', width: 16 },
      { header: 'Tertimbang Register (70%)', key: 'skorTertimbangRegister', width: 22 },
      { header: 'Faktor Anggaran (M4)', key: 'skalaAnggaran', width: 18 },
      { header: 'Program Unggulan (M5)', key: 'skalaProgramUnggulan', width: 18 },
      { header: 'Temuan/Fraud (M6)', key: 'skalaTemuanFraud', width: 18 },
      { header: 'Isu Terkini (M7)', key: 'skalaIsuTerkini', width: 18 },
      { header: 'Rata2 Manajemen Pokok (15%)', key: 'rataRataManajemen', width: 24 },
      { header: 'x-Thn Audit Terakhir (10%)', key: 'skalaTahunAudit', width: 22 },
      { header: 'Pengalaman APIP (5%)', key: 'skalaPengalamanApip', width: 20 },
      { header: 'Permintaan KDH (100%)', key: 'permintaanKDH', width: 20 },
      { header: 'Skor Total Akhir', key: 'skorTotal', width: 18 },
      { header: 'Kategori Prioritas', key: 'tingkatRisiko', width: 18 },
    ];

    exportToExcel(
      'Lampiran_9_Penetapan_Prioritas_Unit_Kerja_OPD',
      'LAMPIRAN 9: PENETAPAN PRIORITAS UNIT KERJA / PERANGKAT DAERAH (OPD)',
      `Fokus Unit Kerja: Register Tertimbang: 70% | Manajemen Pokok: 15% | Thn Audit: 10% | Pengalaman APIP: 5% | KDH: 100% Top`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['Rank', 'Unit Kerja / OPD', 'Maturitas MR', 'Register (70%)', 'M. Pokok (15%)', 'M. Lain (15%)', 'KDH', 'Skor Total', 'Kategori'];
    const rows = filteredData.map(d => [
      `#${d.ranking}`,
      d.unitKerja || d.opd || '',
      `Lvl ${d.kematanganMRLevel ?? 3} (${d.kematanganMRBobot ?? 70}%)`,
      (d.skorTertimbangRegister || 0).toFixed(2),
      (d.rataRataManajemen || 0).toFixed(2),
      (d.skorManajemenLainnya || 0).toFixed(2),
      (d.permintaanKDH === 'Ya' || d.isKDH) ? 'YA (100%)' : 'Tidak',
      (d.skorTotal || 0).toFixed(2),
      d.tingkatRisiko || '-'
    ]);

    exportToPdf(
      'Lampiran_9_Penetapan_Prioritas_Unit_Kerja_OPD',
      'LAMPIRAN 9: PENETAPAN PRIORITAS UNIT KERJA / OPD',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-cyan-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 9
              </span>
              <span className="text-xs text-cyan-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Penetapan Prioritas Unit Kerja / OPD
            </h1>
            <p className="text-sm text-cyan-100/80 mt-1 max-w-3xl">
              Fokus evaluasi komprehensif tingkat Perangkat Daerah (OPD) tanpa kolom program. Mengintegrasikan Kematangan MR & Register Risiko (70%), Faktor Pokok (15%), dan Pertimbangan Manajemen Lainnya (15%): x-Tahun Audit Terakhir (10%), Pengalaman APIP (5%), dan Permintaan KDH (100% Prioritas Mutlak).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronisasi OPD dari Menu 1-7</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-cyan-800/60 hover:bg-cyan-700/80 text-cyan-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-cyan-700/50"
            >
              <Info className="w-3.5 h-3.5 text-cyan-300" />
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
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah OPD</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetData}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Kosongkan Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-cyan-800/40">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total OPD Dievaluasi</span>
            <span className="text-xl font-black text-white mt-0.5 block">{data.length} Perangkat Daerah</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-amber-300 block font-medium flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              Permintaan KDH (100% Top)
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{countKDH} OPD</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-rose-300 block font-medium">Risiko Tinggi / Prioritas</span>
            <span className="text-xl font-black text-rose-400 mt-0.5 block">{countHighRisk} OPD</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-cyan-300 block font-medium">Komposisi Bobot</span>
            <span className="text-xs text-cyan-100 mt-1 block font-semibold">
              Reg: 70% | Pokok: 15% | Thn: 10% | APIP: 5%
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk & Rumus Formula OPD */}
      {showGuide && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-cyan-900 text-sm">
            <Info className="w-4 h-4 text-cyan-600" />
            FORMULA PENETAPAN PRIORITAS UNIT KERJA / OPD (PPBR)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="bg-white p-3.5 rounded-xl border border-cyan-100 shadow-2xs space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">1. Komposisi Bobot Prioritas OPD:</span>
              <p>&bull; <strong>Skor Tertimbang Register</strong> = Skala Register Risiko &times; Bobot Kematangan MR (Lvl 1=40%, 2=55%, 3=70%, 4=85%, 5=100%).</p>
              <p>&bull; <strong>Register Risiko (70%)</strong>: Kontribusi Register Risiko Tertimbang terhadap skor akhir.</p>
              <p>&bull; <strong>Faktor Manajemen Pokok (15%)</strong>: Rata-rata 4 faktor (Anggaran, Unggulan, Temuan, Isu Terkini OPD).</p>
              <p>&bull; <strong>x-Thn Audit Terakhir (10%)</strong>: Skala 1 s.d 5 (belum pernah / &gt; 3 thn = 5).</p>
              <p>&bull; <strong>Pengalaman APIP (5%)</strong>: Skala 1 s.d 5 (minim/baru = 5).</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 space-y-1.5">
              <span className="font-bold text-amber-900 block text-xs flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-600" />
                2. Override Khusus Permintaan Kepala Daerah (KDH):
              </span>
              <p>
                Jika permintaan KDH diaktifkan pada OPD bersangkutan, bobotnya <strong>LANGSUNG 100%</strong> dan skor totalnya otomatis <strong>5.00</strong>.
              </p>
              <p className="font-semibold text-amber-800">
                Unit Kerja ini secara otomatis langsung bertengger pada Ranking Teratas (#1) dalam urutan pengawasan tahunan.
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
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tabel 1: Prioritas OPD
          </button>
          <button
            onClick={() => setActiveTab('manajemen_lain')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'manajemen_lain'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tabel 2: Pertimbangan Manajemen Lainnya (OPD)</span>
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
            placeholder="Cari nama Perangkat Daerah / OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* TABEL 1: PENETAPAN PRIORITAS UNIT KERJA / OPD */}
      {(activeTab === 'all' || activeTab === 'prioritas') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h2 className="text-sm font-bold tracking-wide">
                TABEL 1: PENETAPAN PRIORITAS UNIT KERJA / ORGANISASI PERANGKAT DAERAH (OPD)
              </h2>
            </div>
            <span className="text-xs text-slate-300">
              Fokus Tingkat OPD &bull; Diurutkan dari Skor Tertinggi & Permintaan KDH
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-center">
                  <th rowSpan={2} className="p-2.5 w-14 font-bold border-r border-slate-700">Rank</th>
                  <th rowSpan={2} className="p-2.5 min-w-[240px] text-left font-semibold border-r border-slate-700">
                    Perangkat Daerah / Unit Kerja (OPD)
                  </th>
                  <th colSpan={3} className="p-2 bg-cyan-950 text-cyan-200 font-bold border-b border-cyan-900 border-r border-slate-700">
                    KEMATANGAN MR & REGISTER RISIKO (70%)
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
                  <th className="p-1.5 w-16 border-r border-slate-600">Level MR</th>
                  <th className="p-1.5 w-16 border-r border-slate-600">Skala Reg</th>
                  <th className="p-1.5 w-20 bg-cyan-900/60 text-cyan-200 font-bold border-r border-slate-700">Tertimbang</th>
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
                    <td colSpan={15} className="p-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-3">
                        <AlertTriangle className="w-8 h-8 text-cyan-500 mx-auto" />
                        <p className="text-slate-600 font-medium">Belum ada data Prioritas Unit Kerja / OPD.</p>
                        <button
                          onClick={() => performSyncFromMenus('full')}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Tarik Data OPD Otomatis dari Menu 1-7</span>
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
                        className={`transition hover:bg-cyan-50/40 ${
                          isKDH ? 'bg-amber-50/70 border-l-4 border-amber-500 font-medium' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            isKDH
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md'
                              : item.ranking === 1
                              ? 'bg-cyan-600 text-white shadow-sm'
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
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-600 shrink-0" />
                            <span>{item.unitKerja || item.opd}</span>
                            {isKDH && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                                KDH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-semibold text-slate-700">
                          Lvl {item.kematanganMRLevel ?? 3}
                        </td>
                        <td className="p-2 text-center text-slate-700">
                          {Number(item.skalaRegisterRisiko || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-extrabold text-cyan-800 bg-cyan-50/40">
                          {Number(item.skorTertimbangRegister || 0).toFixed(2)}
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
                                : 'bg-white border-slate-300 text-slate-800 hover:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer'
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
                                : 'bg-white border-slate-300 text-slate-800 hover:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer'
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
                              : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
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
                              title="Edit Skor OPD"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDelete(item)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus OPD"
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
      )}

      {/* TABEL 2: PERTIMBANGAN MANAJEMEN LAINNYA UNIT KERJA / OPD */}
      {(activeTab === 'all' || activeTab === 'manajemen_lain') && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold tracking-wide text-amber-200">
                  TABEL 2: PERTIMBANGAN MANAJEMEN LAINNYA (UNIT KERJA / OPD)
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
                  <th className="p-3 min-w-[260px] text-left font-semibold border-r border-slate-700">
                    Perangkat Daerah / Unit Kerja (OPD)
                  </th>
                  <th className="p-3 min-w-[220px] text-left bg-indigo-950 text-indigo-300 font-bold border-r border-indigo-900">
                    x-Tahun Audit Terakhir (Bobot 10%)
                  </th>
                  <th className="p-3 min-w-[220px] text-left bg-indigo-950 text-indigo-300 font-bold border-r border-indigo-900">
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
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada data pertimbangan manajemen lainnya untuk OPD.
                    </td>
                  </tr>
                ) : (
                  filteredData.map(item => {
                    const isKDH = item.permintaanKDH === 'Ya' || item.permintaanKDH === true || item.isKDH;
                    return (
                      <tr
                        key={`man-opd-${item.id}`}
                        className={`hover:bg-amber-50/40 transition ${
                          isKDH ? 'bg-amber-50/60 font-medium' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-500 font-semibold">{item.no}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-700 shrink-0" />
                            <span>{item.unitKerja || item.opd}</span>
                          </div>
                        </td>

                        {/* Dropdown x-Thn Audit Terakhir */}
                        <td className="p-3">
                          <select
                            value={item.skalaTahunAudit ?? 3}
                            onChange={e => handleUpdateTahunAudit(item, Number(e.target.value))}
                            disabled={isKDH}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition ${
                              isKDH
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-cyan-400 focus:ring-2 focus:ring-cyan-400'
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
                                : 'bg-white border-slate-300 text-slate-800 hover:border-cyan-400 focus:ring-2 focus:ring-cyan-400'
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

      {/* Modal Sinkronisasi OPD dari Menu 1-7 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Sinkronisasi OPD Otomatis</h3>
                  <p className="text-xs text-slate-500">Tarik daftar Perangkat Daerah & Faktor dari Menu 1-7</p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs text-slate-700 leading-relaxed">
              <p>
                Sistem akan memetakan dan mengagregasikan faktor risiko secara langsung per Perangkat Daerah:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-medium">
                <div className="flex items-center justify-between text-cyan-800">
                  <span>&bull; Daftar Organisasi Perangkat Daerah (OPD):</span>
                  <span className="font-bold">Menu 1 (Audit Universe)</span>
                </div>
                <div className="flex items-center justify-between text-amber-800">
                  <span>&bull; Skala Anggaran Kumulatif OPD:</span>
                  <span className="font-bold">Menu 4 (Faktor Anggaran)</span>
                </div>
                <div className="flex items-center justify-between text-purple-800">
                  <span>&bull; Pengampu Program Unggulan:</span>
                  <span className="font-bold">Menu 5 (Program Unggulan)</span>
                </div>
                <div className="flex items-center justify-between text-rose-800">
                  <span>&bull; Catatan Temuan & Potensi Fraud OPD:</span>
                  <span className="font-bold">Menu 6 (Temuan & Fraud)</span>
                </div>
                <div className="flex items-center justify-between text-orange-800">
                  <span>&bull; Isu Terkini & Pelayanan Publik OPD:</span>
                  <span className="font-bold">Menu 7 (Isu Terkini)</span>
                </div>
              </div>
              <p className="text-slate-500 text-[11px]">
                * Pengaturan Permintaan KDH, x-Tahun Audit Terakhir, dan Pengalaman APIP per OPD yang sudah Anda tentukan akan tetap terjaga.
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
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Mulai Sinkronisasi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah OPD Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                Tambah Perangkat Daerah (OPD)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Perangkat Daerah / OPD *</label>
                <input
                  type="text"
                  required
                  value={newItem.unitKerja}
                  onChange={e => setNewItem({ ...newItem, unitKerja: e.target.value })}
                  placeholder="Contoh: Dinas Pekerjaan Umum dan Penataan Ruang"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kematangan MR</label>
                  <select
                    value={newItem.kematanganMRLevel}
                    onChange={e => setNewItem({ ...newItem, kematanganMRLevel: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value={1}>Level 1 - Rintisan (40%)</option>
                    <option value={2}>Level 2 - Berkembang (55%)</option>
                    <option value={3}>Level 3 - Terdefinisi (70%)</option>
                    <option value={4}>Level 4 - Terkelola (85%)</option>
                    <option value={5}>Level 5 - Optimum (100%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Register Risiko (1-5)</label>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pengalaman APIP (1-5)</label>
                  <select
                    value={newItem.skalaPengalamanApip}
                    onChange={e => setNewItem({ ...newItem, skalaPengalamanApip: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    {PILIHAN_PENGALAMAN_APIP.map(opt => (
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan & Perangkingan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit OPD */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-600" />
                Edit Penilaian Unit Kerja / OPD
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Perangkat Daerah / OPD</label>
                <input
                  type="text"
                  required
                  value={editingItem.unitKerja || editingItem.opd || ''}
                  onChange={e => setEditingItem({ ...editingItem, unitKerja: e.target.value, opd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kematangan MR</label>
                  <select
                    value={editingItem.kematanganMRLevel ?? 3}
                    onChange={e => setEditingItem({ ...editingItem, kematanganMRLevel: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value={1}>Level 1 - Rintisan (40%)</option>
                    <option value={2}>Level 2 - Berkembang (55%)</option>
                    <option value={3}>Level 3 - Terdefinisi (70%)</option>
                    <option value={4}>Level 4 - Terkelola (85%)</option>
                    <option value={5}>Level 5 - Optimum (100%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Register Risiko (1-5)</label>
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
                <div>
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
                      Bobot langsung 100% & menduduki Ranking #1 Teratas
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
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
