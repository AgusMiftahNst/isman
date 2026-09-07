import React, { useState, useMemo } from 'react';
import { AuditUniverseItem, INITIAL_AUDIT_UNIVERSE } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  Layers,
  GitMerge,
  Split,
  RefreshCw
} from 'lucide-react';

export const AuditUniverseView: React.FC = () => {
  const [data, setData] = useState<AuditUniverseItem[]>(() => {
    const saved = localStorage.getItem('ppbr_audit_universe');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ppbr_audit_universe', e);
      }
    }
    return INITIAL_AUDIT_UNIVERSE;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterIrban, setFilterIrban] = useState('ALL');
  const [mergeViewMode, setMergeViewMode] = useState<boolean>(true);

  // Confirm Modal state
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

  const handleSaveData = (newData: AuditUniverseItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_audit_universe', JSON.stringify(newData));
  };

  // Direct cell update
  const handleCellChange = (id: string, field: keyof AuditUniverseItem, value: any) => {
    const updated = data.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'anggaran' ? Number(value) || 0 : value
        };
      }
      return item;
    });
    handleSaveData(updated);
  };

  // Update merged cell across identical group
  const handleMergedCellChange = (
    field: 'tujuanRpjmd' | 'indikatorTujuanRpjmd' | 'sasaranRpjmd' | 'indikatorSasaranRpjmd',
    groupIndices: number[],
    value: string
  ) => {
    const idsToUpdate = new Set(groupIndices.map(idx => filteredData[idx]?.id).filter(Boolean));
    const updated = data.map(item => {
      if (idsToUpdate.has(item.id)) {
        return { ...item, [field]: value };
      }
      return item;
    });
    handleSaveData(updated);
  };

  // Add new single row
  const handleAddRow = () => {
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: '',
      indikatorTujuanRpjmd: '',
      sasaranRpjmd: '',
      indikatorSasaranRpjmd: '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: 'Irban I',
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const updated = [...data, newRow];
    handleSaveData(updated);
  };

  // Add program under an existing Tujuan & Sasaran
  const handleAddProgramUnderSasaran = (tujuan: string, sasaran: string, indSasaran: string, indTujuan: string, afterIndex: number) => {
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: indTujuan || '',
      sasaranRpjmd: sasaran,
      indikatorSasaranRpjmd: indSasaran || '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: 'Irban I',
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };

    const targetItem = filteredData[afterIndex];
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Add multiple rows
  const handleAddMultipleRows = (count: number) => {
    const newRows: AuditUniverseItem[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `au-${baseTime + i}-${Math.random().toString(36).substring(2, 6)}`,
        no: data.length + i + 1,
        tujuanRpjmd: '',
        indikatorTujuanRpjmd: '',
        sasaranRpjmd: '',
        indikatorSasaranRpjmd: '',
        programRpjmd: '',
        indikatorProgramRpjmd: '',
        opdPengampu: '',
        irbanPengampu: 'Irban I',
        tujuanSasaranRenstra: '',
        indikatorRenstra: '',
        programRenstra: '',
        indikatorProgramRenstra: '',
        anggaran: 0,
        prioritasRpjmn: '',
        sektorUnggulan: 'Bukan sektor unggulan daerah',
        temuanFraudHukum: '',
        isuTerkini: ''
      });
    }
    const updated = [...data, ...newRows];
    handleSaveData(updated);
  };

  // Duplicate a row
  const handleDuplicateRow = (item: AuditUniverseItem) => {
    const duplicate: AuditUniverseItem = {
      ...item,
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1
    };
    const updated = [...data, duplicate];
    handleSaveData(updated);
  };

  // Request Delete row with confirmation dialog
  const requestDeleteRow = (item: AuditUniverseItem) => {
    const programName = item.programRpjmd || item.programRenstra || `Baris No. ${item.no}`;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Baris Program?',
      message: `Apakah Anda yakin ingin menghapus baris program ini dari tabel Audit Universe? Data pada baris ini akan dihapus secara permanen.`,
      detail: `Program: "${programName}" ${item.opdPengampu ? `| OPD: ${item.opdPengampu}` : ''} ${item.irbanPengampu ? `| Irban: ${item.irbanPengampu}` : ''}`,
      confirmText: 'Ya, Hapus Baris',
      variant: 'danger',
      onConfirm: () => {
        const updated = data
          .filter(d => d.id !== item.id)
          .map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  // Request Clear all data with confirmation dialog
  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Audit Universe?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan semua data (${data.length} baris program) pada tabel Audit Universe? Tindakan ini tidak dapat dibatalkan.`,
      detail: 'Seluruh entri Tujuan RPJMD, Sasaran, Program, Pemetaan OPD, Anggaran, dan Faktor Risiko yang ada di tabel ini akan terhapus.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  // Request Reload template RPJMD with confirmation dialog
  const requestReloadTemplateData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Muat Ulang Data Standar RPJMD?',
      message: 'Apakah Anda yakin ingin memuat ulang 52 data dasar standar RPJMD? Data di tabel saat ini akan ditimpa dengan data template standar.',
      detail: 'Tujuan RPJMD, Sasaran RPJMD, Indikator Sasaran, dan 52 Program RPJMD standar daerah akan dimuat kembali ke tabel.',
      confirmText: 'Ya, Muat Ulang Data',
      variant: 'warning',
      onConfirm: () => {
        handleSaveData(INITIAL_AUDIT_UNIVERSE);
      }
    });
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch =
        (item.tujuanRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sasaranRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.programRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.programRenstra || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.irbanPengampu || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchIrban = filterIrban === 'ALL' || item.irbanPengampu === filterIrban;
      return matchSearch && matchIrban;
    });
  }, [data, searchTerm, filterIrban]);

  // Compute Spans for Merging Identical Cells
  const spanInfo = useMemo(() => {
    const tujuanSpan: { [index: number]: number } = {};
    const tujuanIndices: { [index: number]: number[] } = {};
    const sasaranSpan: { [index: number]: number } = {};
    const sasaranIndices: { [index: number]: number[] } = {};

    if (!mergeViewMode) {
      return { tujuanSpan, tujuanIndices, sasaranSpan, sasaranIndices };
    }

    let i = 0;
    while (i < filteredData.length) {
      const currentTujuan = (filteredData[i].tujuanRpjmd || '').trim();
      let j = i + 1;
      const tIndices = [i];

      if (currentTujuan !== '') {
        while (j < filteredData.length && (filteredData[j].tujuanRpjmd || '').trim() === currentTujuan) {
          tIndices.push(j);
          j++;
        }
      }

      const tSpan = j - i;
      tujuanSpan[i] = tSpan;
      tujuanIndices[i] = tIndices;

      for (let k = i + 1; k < j; k++) {
        tujuanSpan[k] = 0; // mark as hidden
      }

      // Inside this tujuan group, calculate sasaran span
      let sStart = i;
      while (sStart < j) {
        const currentSasaran = (filteredData[sStart].sasaranRpjmd || '').trim();
        let sEnd = sStart + 1;
        const sIndices = [sStart];

        if (currentSasaran !== '') {
          while (sEnd < j && (filteredData[sEnd].sasaranRpjmd || '').trim() === currentSasaran) {
            sIndices.push(sEnd);
            sEnd++;
          }
        }

        const sSpan = sEnd - sStart;
        sasaranSpan[sStart] = sSpan;
        sasaranIndices[sStart] = sIndices;

        for (let sk = sStart + 1; sk < sEnd; sk++) {
          sasaranSpan[sk] = 0; // mark as hidden
        }
        sStart = sEnd;
      }

      i = j;
    }

    return { tujuanSpan, tujuanIndices, sasaranSpan, sasaranIndices };
  }, [filteredData, mergeViewMode]);

  const totalAnggaran = data.reduce((acc, curr) => acc + (Number(curr.anggaran) || 0), 0);

  // Export to Excel
  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      // RPJMD
      { header: 'Tujuan RPJMD', key: 'tujuanRpjmd', width: 30 },
      { header: 'Indikator Tujuan', key: 'indikatorTujuanRpjmd', width: 24 },
      { header: 'Sasaran RPJMD', key: 'sasaranRpjmd', width: 30 },
      { header: 'Indikator Sasaran', key: 'indikatorSasaranRpjmd', width: 24 },
      { header: 'Program RPJMD', key: 'programRpjmd', width: 30 },
      { header: 'Indikator Program', key: 'indikatorProgramRpjmd', width: 24 },
      { header: 'OPD/Unit Pengampu', key: 'opdPengampu', width: 26 },
      // Renstra OPD
      { header: 'Irban Pengampu', key: 'irbanPengampu', width: 16 },
      { header: 'Tujuan/ Sasaran dalam Renstra', key: 'tujuanSasaranRenstra', width: 28 },
      { header: 'Indikator Tujuan/ Sasaran', key: 'indikatorRenstra', width: 24 },
      { header: 'Program', key: 'programRenstra', width: 28 },
      { header: 'Indikator Program', key: 'indikatorProgramRenstra', width: 24 },
      { header: 'Anggaran Program (Rp)', key: 'anggaran', width: 22 },
      // Faktor Risiko & Isu
      { header: 'Program Prioritas terkait di RPJMN/Indikator Program', key: 'prioritasRpjmn', width: 30 },
      { header: 'Sektor Unggulan', key: 'sektorUnggulan', width: 22 },
      { header: 'Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum', key: 'temuanFraudHukum', width: 32 },
      { header: 'Isu Terkini', key: 'isuTerkini', width: 28 }
    ];

    exportToExcel(
      'Lampiran_1_Audit_Universe',
      'LAMPIRAN 1: KERTAS KERJA AUDIT UNIVERSE',
      'Pemetaan Hubungan RPJMD, Rencana Strategis (Renstra) OPD, dan Faktor-Faktor Risiko',
      cols,
      data
    );
  };

  // Export to PDF
  const handleExportPdf = () => {
    const headers = [
      'No',
      'Tujuan RPJMD',
      'Sasaran RPJMD',
      'Indikator Sasaran',
      'Program RPJMD',
      'OPD Pengampu',
      'Irban',
      'Program Renstra',
      'Anggaran (Rp)',
      'RPJMN',
      'Sektor',
      'Temuan/Fraud',
      'Isu Terkini'
    ];

    const rows = filteredData.map(d => [
      d.no,
      d.tujuanRpjmd || '-',
      d.sasaranRpjmd || '-',
      d.indikatorSasaranRpjmd || '-',
      d.programRpjmd || '-',
      d.opdPengampu || '-',
      d.irbanPengampu || '-',
      d.programRenstra || '-',
      `Rp ${(Number(d.anggaran) || 0).toLocaleString('id-ID')}`,
      d.prioritasRpjmn || '-',
      d.sektorUnggulan || '-',
      d.temuanFraudHukum || '-',
      d.isuTerkini || '-'
    ]);

    exportToPdf(
      'Lampiran_1_Audit_Universe',
      'LAMPIRAN 1: KERTAS KERJA AUDIT UNIVERSE',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6" id="ppbr-audit-universe-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-blue-400/30">
              Lampiran 1 (Format Resmi PPBR)
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-400" />
              Kertas Kerja Audit Universe
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Pemetaan menyeluruh ruang lingkup pengawasan (auditable units). Pengisian dapat dilakukan langsung pada setiap sel tabel di bawah ini. Baris dengan Tujuan &amp; Sasaran RPJMD yang sama otomatis digabung (merged).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tersimpan otomatis</span>
            </div>
            <button
              onClick={() => setMergeViewMode(!mergeViewMode)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                mergeViewMode
                  ? 'bg-blue-600/90 text-white border-blue-400/50 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Aktifkan/Nonaktifkan penggabungan baris identik"
            >
              {mergeViewMode ? <GitMerge className="w-4 h-4 text-blue-200" /> : <Split className="w-4 h-4" />}
              <span>{mergeViewMode ? 'Merge Baris: ON' : 'Merge Baris: OFF'}</span>
            </button>
            <button
              onClick={requestReloadTemplateData}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Muat ulang seluruh data standar Tujuan, Sasaran, Indikator Sasaran, dan Program RPJMD"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Data RPJMD</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Add Row, Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Tujuan, Sasaran, Program, OPD..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <select
            value={filterIrban}
            onChange={e => setFilterIrban(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Irban</option>
            <option value="Irban I">Irban I</option>
            <option value="Irban II">Irban II</option>
            <option value="Irban III">Irban III</option>
            <option value="Irban Khusus">Irban Khusus</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleAddRow}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Baris</span>
          </button>
          <button
            onClick={() => handleAddMultipleRows(5)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            + 5 Baris
          </button>
          <button
            onClick={requestResetData}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Kosongkan Tabel"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] relative">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header with Hierarchical Structure */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Row 1: Merged Categories */}
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
                <th rowSpan={2} className="p-3 text-center w-12 border-r border-b border-slate-700 sticky left-0 z-30 bg-slate-900">
                  No
                </th>

                {/* MERGED ROW 1: RPJMD */}
                <th colSpan={7} className="p-2.5 text-center bg-blue-900 border-r border-b border-blue-800 text-blue-100">
                  RPJMD
                </th>

                {/* MERGED ROW 2: Rencana Strategis OPD */}
                <th colSpan={6} className="p-2.5 text-center bg-indigo-900 border-r border-b border-indigo-800 text-indigo-100">
                  Rencana Strategis OPD
                </th>

                {/* Standalone Columns */}
                <th rowSpan={2} className="p-3 font-semibold min-w-[220px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Program Prioritas terkait di RPJMN / Indikator Program
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[190px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Sektor Unggulan
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[240px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[220px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Isu Terkini
                </th>
                <th rowSpan={2} className="p-3 font-semibold w-24 text-center border-b border-slate-700 sticky right-0 z-30 bg-slate-900">
                  Aksi
                </th>
              </tr>

              {/* Row 2: Sub-columns */}
              <tr className="bg-slate-800 text-slate-100 text-[11px] font-semibold">
                {/* Under RPJMD */}
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Tujuan RPJMD</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Tujuan</th>
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Sasaran RPJMD</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Sasaran</th>
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Program RPJMD</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Program</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-blue-950/90 text-blue-200">OPD/Unit Pengampu</th>

                {/* Under Rencana Strategis OPD */}
                <th className="p-2.5 min-w-[130px] text-center border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Irban Pengampu</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Tujuan/ Sasaran dalam Renstra</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Indikator Tujuan/ Sasaran</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Program</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Indikator Program</th>
                <th className="p-2.5 min-w-[170px] text-right border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Anggaran Program (Rp)</th>
              </tr>
            </thead>

            {/* Table Body - Direct Inline Editing with Row Merging */}
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-12 text-center text-slate-400 bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-slate-600 font-medium">Tabel Audit Universe masih kosong.</p>
                      <button
                        onClick={handleAddRow}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Baris Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const tSpan = spanInfo.tujuanSpan[index] ?? 1;
                  const showTujuan = tSpan > 0;
                  const tIndices = spanInfo.tujuanIndices[index] || [index];

                  const sSpan = spanInfo.sasaranSpan[index] ?? 1;
                  const showSasaran = sSpan > 0;
                  const sIndices = spanInfo.sasaranIndices[index] || [index];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition group ${
                        showTujuan && index > 0 ? 'border-t-2 border-t-slate-300' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="p-2 text-center font-bold text-slate-600 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">
                        {index + 1}
                      </td>

                      {/* RPJMD: Tujuan RPJMD (Merged if identical) */}
                      {showTujuan && (
                        <td
                          rowSpan={tSpan}
                          className={`p-2 border-r border-slate-200 align-top ${
                            tSpan > 1 ? 'bg-blue-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-2">
                            <textarea
                              rows={Math.max(2, tSpan * 2)}
                              value={item.tujuanRpjmd || ''}
                              onChange={e => {
                                if (tSpan > 1) {
                                  handleMergedCellChange('tujuanRpjmd', tIndices, e.target.value);
                                } else {
                                  handleCellChange(item.id, 'tujuanRpjmd', e.target.value);
                                }
                              }}
                              placeholder="Uraian Tujuan RPJMD..."
                              className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 resize-y focus:outline-hidden transition leading-relaxed"
                            />
                            {tSpan > 1 && (
                              <div className="text-[10px] text-blue-700 font-medium px-2 py-0.5 bg-blue-100/60 rounded self-start">
                                {tSpan} Program
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Indikator Tujuan (Merged if identical) */}
                      {showTujuan && (
                        <td
                          rowSpan={tSpan}
                          className={`p-2 border-r border-slate-200 align-top ${
                            tSpan > 1 ? 'bg-blue-50/40' : 'bg-transparent'
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, tSpan * 2)}
                            value={item.indikatorTujuanRpjmd || ''}
                            onChange={e => {
                              if (tSpan > 1) {
                                handleMergedCellChange('indikatorTujuanRpjmd', tIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'indikatorTujuanRpjmd', e.target.value);
                              }
                            }}
                            placeholder="Indikator Tujuan..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* RPJMD: Sasaran RPJMD (Merged if identical) */}
                      {showSasaran && (
                        <td
                          rowSpan={sSpan}
                          className={`p-2 border-r border-slate-200 align-top ${
                            sSpan > 1 ? 'bg-sky-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <textarea
                              rows={Math.max(2, sSpan * 2)}
                              value={item.sasaranRpjmd || ''}
                              onChange={e => {
                                if (sSpan > 1) {
                                  handleMergedCellChange('sasaranRpjmd', sIndices, e.target.value);
                                } else {
                                  handleCellChange(item.id, 'sasaranRpjmd', e.target.value);
                                }
                              }}
                              placeholder="Uraian Sasaran RPJMD..."
                              className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 resize-y focus:outline-hidden transition leading-relaxed"
                            />
                            {sSpan > 1 && (
                              <button
                                onClick={() =>
                                  handleAddProgramUnderSasaran(
                                    item.tujuanRpjmd || '',
                                    item.sasaranRpjmd || '',
                                    item.indikatorSasaranRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    index + sSpan - 1
                                  )
                                }
                                className="text-[10px] text-blue-700 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded self-start flex items-center gap-1 transition"
                                title="Tambah baris program baru dalam sasaran ini"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tambah Program</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Indikator Sasaran (Merged if identical) */}
                      {showSasaran && (
                        <td
                          rowSpan={sSpan}
                          className={`p-2 border-r border-slate-200 align-top ${
                            sSpan > 1 ? 'bg-sky-50/40' : 'bg-transparent'
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, sSpan * 2)}
                            value={item.indikatorSasaranRpjmd || ''}
                            onChange={e => {
                              if (sSpan > 1) {
                                handleMergedCellChange('indikatorSasaranRpjmd', sIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'indikatorSasaranRpjmd', e.target.value);
                              }
                            }}
                            placeholder="Indikator Sasaran..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* RPJMD: Program RPJMD */}
                      <td className="p-1.5 border-r border-slate-200 bg-blue-50/20">
                        <textarea
                          rows={2}
                          value={item.programRpjmd || ''}
                          onChange={e => handleCellChange(item.id, 'programRpjmd', e.target.value)}
                          placeholder="Nama Program RPJMD..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-blue-300 focus:border-blue-500 rounded-md text-xs font-bold text-blue-950 resize-y focus:outline-hidden transition leading-relaxed"
                        />
                      </td>

                      {/* RPJMD: Indikator Program */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.indikatorProgramRpjmd || ''}
                          onChange={e => handleCellChange(item.id, 'indikatorProgramRpjmd', e.target.value)}
                          placeholder="Indikator Program..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* RPJMD: OPD/Unit Pengampu */}
                      <td className="p-1.5 border-r border-slate-200 bg-slate-50/40">
                        <input
                          type="text"
                          value={item.opdPengampu || ''}
                          onChange={e => handleCellChange(item.id, 'opdPengampu', e.target.value)}
                          placeholder="Contoh: Dinas Pendidikan"
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 focus:outline-hidden transition"
                        />
                      </td>

                      {/* RENSTRA: Irban Pengampu */}
                      <td className="p-1.5 text-center border-r border-slate-200">
                        <select
                          value={item.irbanPengampu || 'Irban I'}
                          onChange={e => handleCellChange(item.id, 'irbanPengampu', e.target.value)}
                          className="w-full p-1.5 bg-indigo-50/60 hover:bg-white focus:bg-white border border-indigo-200 rounded-md text-xs font-semibold text-indigo-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition"
                        >
                          <option value="Irban I">Irban I</option>
                          <option value="Irban II">Irban II</option>
                          <option value="Irban III">Irban III</option>
                          <option value="Irban Khusus">Irban Khusus</option>
                        </select>
                      </td>

                      {/* RENSTRA: Tujuan/ Sasaran dalam Renstra */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.tujuanSasaranRenstra || ''}
                          onChange={e => handleCellChange(item.id, 'tujuanSasaranRenstra', e.target.value)}
                          placeholder="Tujuan/Sasaran Renstra..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* RENSTRA: Indikator Tujuan/ Sasaran */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.indikatorRenstra || ''}
                          onChange={e => handleCellChange(item.id, 'indikatorRenstra', e.target.value)}
                          placeholder="Indikator Sasaran Renstra..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* RENSTRA: Program */}
                      <td className="p-1.5 border-r border-slate-200 bg-indigo-50/20">
                        <textarea
                          rows={2}
                          value={item.programRenstra || ''}
                          onChange={e => handleCellChange(item.id, 'programRenstra', e.target.value)}
                          placeholder="Nama Program Renstra OPD..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded-md text-xs font-semibold text-indigo-950 resize-y focus:outline-hidden transition leading-relaxed"
                        />
                      </td>

                      {/* RENSTRA: Indikator Program */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.indikatorProgramRenstra || ''}
                          onChange={e => handleCellChange(item.id, 'indikatorProgramRenstra', e.target.value)}
                          placeholder="Indikator Program Renstra..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* RENSTRA: Anggaran Program */}
                      <td className="p-1.5 text-right border-r border-slate-200 bg-emerald-50/20">
                        <input
                          type="number"
                          min={0}
                          step={1000000}
                          value={item.anggaran ?? 0}
                          onChange={e => handleCellChange(item.id, 'anggaran', e.target.value)}
                          placeholder="0"
                          className="w-full p-2 text-right bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-emerald-300 focus:border-emerald-500 rounded-md text-xs font-bold text-emerald-800 focus:outline-hidden transition"
                        />
                      </td>

                      {/* Program Prioritas terkait di RPJMN/Indikator Program */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.prioritasRpjmn || ''}
                          onChange={e => handleCellChange(item.id, 'prioritasRpjmn', e.target.value)}
                          placeholder="Keterkaitan Prioritas Nasional RPJMN..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* Sektor Unggulan */}
                      <td className="p-1.5 border-r border-slate-200">
                        <select
                          value={item.sektorUnggulan || 'Bukan sektor unggulan daerah'}
                          onChange={e => handleCellChange(item.id, 'sektorUnggulan', e.target.value)}
                          className={`w-full p-1.5 border rounded-md text-xs font-medium focus:outline-hidden transition ${
                            (item.sektorUnggulan || '').includes('Prioritas') || (item.sektorUnggulan || '').includes('Unggulan')
                              ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                              : 'bg-transparent hover:bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="Bukan sektor unggulan daerah">Bukan sektor unggulan daerah</option>
                          <option value="Sektor Unggulan Daerah">Sektor Unggulan Daerah</option>
                          <option value="Sektor Prioritas Daerah">Sektor Prioritas Daerah</option>
                        </select>
                      </td>

                      {/* Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.temuanFraudHukum || ''}
                          onChange={e => handleCellChange(item.id, 'temuanFraudHukum', e.target.value)}
                          placeholder="Catatan temuan BPK/APIP, potensi fraud, perkara hukum..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-rose-300 focus:border-rose-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* Isu Terkini */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.isuTerkini || ''}
                          onChange={e => handleCellChange(item.id, 'isuTerkini', e.target.value)}
                          placeholder="Sorotan publik, pengaduan masyarakat, isu pelayanan..."
                          className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                        />
                      </td>

                      {/* Aksi */}
                      <td className="p-2 text-center sticky right-0 z-10 bg-white border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              handleAddProgramUnderSasaran(
                                item.tujuanRpjmd || '',
                                item.sasaranRpjmd || '',
                                item.indikatorSasaranRpjmd || '',
                                item.indikatorTujuanRpjmd || '',
                                index
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Tambah baris program di bawah ini (Tujuan & Sasaran sama)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateRow(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Duplikasi baris ini"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDeleteRow(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Total */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={13} className="p-3 text-right text-xs uppercase tracking-wider text-slate-700">
                    Total Anggaran Terpetakan ({data.length} Program):
                  </td>
                  <td className="p-3 text-right font-extrabold text-xs text-emerald-800 bg-emerald-100/60 border-r border-slate-300">
                    Rp {totalAnggaran.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={5} className="p-3 text-slate-500 text-xs"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Bottom Bar: Add Row & Helper */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Baru</span>
            </button>
            <button
              onClick={() => handleAddMultipleRows(5)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium transition"
            >
              + 5 Baris
            </button>
          </div>

          <div className="text-slate-500 text-[11px] italic">
            * Setiap ketikan langsung tersimpan otomatis. Baris dengan Tujuan/Sasaran yang sama digabungkan secara otomatis.
          </div>
        </div>
      </div>

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
