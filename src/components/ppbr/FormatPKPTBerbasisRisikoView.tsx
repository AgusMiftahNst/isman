import React, { useState } from 'react';
import { FormatPKPTItem } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import {
  getMenu11Items,
  getMenu12Items,
  getMenu13Items,
  generatePKPTFromSources,
  GeneratedPKPTResult,
  ExistingCustomPKPT
} from './ppbrSyncHelpers';
import {
  CalendarCheck,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  Building2,
  Calendar,
  Users,
  Ban,
  ShieldCheck,
  BookOpen,
  Eye,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const FormatPKPTBerbasisRisikoView: React.FC = () => {
  // Hanya membaca data yang sudah tersimpan di localStorage (tidak otomatis overwrite)
  const [data, setData] = useState<FormatPKPTItem[]>(() => {
    const saved = localStorage.getItem('ppbr_pkpt_final');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing ppbr_pkpt_final', e);
      }
    }
    return [];
  });

  const [syncMeta, setSyncMeta] = useState<GeneratedPKPTResult | null>(() => {
    const saved = localStorage.getItem('ppbr_pkpt_meta');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExcludedModal, setShowExcludedModal] = useState<boolean>(false);

  const [headerInfo, setHeaderInfo] = useState({
    tahun: '2025',
    namaInspektur: 'Drs. H. Ahmad Fauzi, M.Si, CGCAE',
    nipInspektur: '19750812 199903 1 004',
    namaBupati: 'Dr. Ir. Johanes Rettob, S.Sos, M.M',
    jabatanBupati: 'Bupati Mimika'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PBBR' | 'MANDATORY'>('ALL');
  const [showGuide, setShowGuide] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FormatPKPTItem | null>(null);

  // Fungsi sinkronisasi: HANYA BERJALAN SAAT TOMBOL SINKRONISASI DATA DITEKAN
  const handleManualSync = () => {
    setIsSyncing(true);

    const m11List = getMenu11Items();
    const m12List = getMenu12Items();
    const m13List = getMenu13Items();

    // Hanya pertahankan penyesuaian kustom yang pernah disimpan/diedit manual oleh user di Menu 14
    let existingCustom = new Map<string, ExistingCustomPKPT>();
    data.forEach(item => {
      if (item.manuallyEdited) {
        const key1 = (item.sasaranOPD + '::' + item.namaKegiatan).toLowerCase();
        const key2 = ((item.kategoriKegiatan || '') + '::' + (item.areaPengawasan || item.namaKegiatan || '')).toLowerCase();
        const customVal: ExistingCustomPKPT = {
          jadwal: item.jadwalBulan,
          auditor: item.timJumlahAuditor,
          mandays: item.alokasiMandays,
          anggaran: item.anggaranBiaya,
          opd: item.sasaranOPD,
          namaKegiatan: item.namaKegiatan,
          manuallyEdited: true
        };
        existingCustom.set(key1, customVal);
        existingCustom.set(key2, customVal);
      }
    });

    const result = generatePKPTFromSources(m11List, m12List, m13List, existingCustom);

    setData(result.items);
    setSyncMeta(result);
    localStorage.setItem('ppbr_pkpt_final', JSON.stringify(result.items));
    localStorage.setItem('ppbr_pkpt_meta', JSON.stringify(result));

    setTimeout(() => {
      setIsSyncing(false);
      setToastMessage(
        `Sinkronisasi selesai! ${result.items.length} kegiatan pengawasan dimuat. Pagu anggaran, rencana jadwal, dan personil tim dikosongkan untuk diisi sesuai penetapan.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    }, 350);
  };

  const handleOpenEdit = (item: FormatPKPTItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedItem: FormatPKPTItem = {
      ...editingItem,
      namaKegiatan: editingItem.namaKegiatan?.trim() || '',
      sasaranOPD: editingItem.sasaranOPD?.trim() || '-',
      jadwalBulan: editingItem.jadwalBulan?.trim() || '',
      timJumlahAuditor: Number(editingItem.timJumlahAuditor) || 0,
      alokasiMandays: Number(editingItem.alokasiMandays) || 0,
      anggaranBiaya: Number(editingItem.anggaranBiaya) || 0,
      manuallyEdited: true
    };

    const updated = data.map(d => (d.id === updatedItem.id ? updatedItem : d));
    setData(updated);
    localStorage.setItem('ppbr_pkpt_final', JSON.stringify(updated));
    setShowEditModal(false);
    setEditingItem(null);
    setToastMessage('Data penugasan PKPT berhasil diperbarui.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter berdasarkan Tab dan Search Term
  const filteredData = data.filter(d => {
    if (activeTab === 'PBBR' && !d.kategoriKegiatan?.includes('PRIORITAS RISIKO')) {
      return false;
    }
    if (activeTab === 'MANDATORY' && !d.kategoriKegiatan?.includes('MANDATORY')) {
      return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.namaKegiatan || '').toLowerCase().includes(term) ||
      (d.sasaranOPD || '').toLowerCase().includes(term) ||
      (d.kategoriKegiatan || '').toLowerCase().includes(term) ||
      (d.jadwalBulan || '').toLowerCase().includes(term)
    );
  });

  const countPbbr = data.filter(d => d.kategoriKegiatan?.includes('PRIORITAS RISIKO')).length;
  const countMandatory = data.filter(d => d.kategoriKegiatan?.includes('MANDATORY')).length;
  const countExcluded = syncMeta?.excludedItems.length || 0;

  const totalMandays = filteredData.reduce((acc, curr) => acc + (Number(curr.alokasiMandays) || 0), 0);
  const totalAnggaran = filteredData.reduce((acc, curr) => acc + (Number(curr.anggaranBiaya) || 0), 0);
  const totalAuditorPersonil = filteredData.reduce((acc, curr) => acc + (Number(curr.timJumlahAuditor) || 0), 0);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kategori / Kelompok Penugasan', key: 'kategoriKegiatan', width: 38 },
      { header: 'Nama Penugasan / Kegiatan Pengawasan', key: 'namaKegiatan', width: 44 },
      { header: 'Sasaran OPD / Unit Kerja', key: 'sasaranOPD', width: 30 },
      { header: 'Rencana Jadwal Pelaksanaan', key: 'jadwalBulan', width: 26 },
      { header: 'Jumlah Personil Tim', key: 'timJumlahAuditor', width: 18 },
      { header: 'Alokasi Mandays', key: 'alokasiMandays', width: 16 },
      { header: 'Pagu Biaya (Rp)', key: 'anggaranBiaya', width: 22 }
    ];

    const exportData = filteredData.map(d => ({
      no: d.no,
      kategoriKegiatan: d.kategoriKegiatan,
      namaKegiatan: d.namaKegiatan,
      sasaranOPD: d.sasaranOPD || '-',
      jadwalBulan: d.jadwalBulan || '-',
      timJumlahAuditor: d.timJumlahAuditor && d.timJumlahAuditor > 0 ? `${d.timJumlahAuditor} Orang` : '-',
      alokasiMandays: d.alokasiMandays && d.alokasiMandays > 0 ? `${d.alokasiMandays} Hari` : '-',
      anggaranBiaya: d.anggaranBiaya && d.anggaranBiaya > 0 ? `Rp ${d.anggaranBiaya.toLocaleString('id-ID')}` : '-'
    }));

    exportToExcel(
      `Lampiran_14_Format_PKPT_Berbasis_Risiko_Tahun_${headerInfo.tahun}`,
      `LAMPIRAN 14: FORMAT PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT) BERBASIS RISIKO TAHUN ${headerInfo.tahun}`,
      `Total: ${data.length} Penugasan (PBBR Menu 11: ${countPbbr} | Mandatory Menu 12: ${countMandatory} | Dikecualikan Menu 13: ${countExcluded}) | Total Mandays: ${totalMandays > 0 ? totalMandays + ' Hari' : '-'} | Total Anggaran: ${totalAnggaran > 0 ? 'Rp ' + totalAnggaran.toLocaleString('id-ID') : '-'}`,
      cols,
      exportData
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Kegiatan Pengawasan', 'Kategori', 'Sasaran OPD', 'Jadwal', 'Personil', 'Mandays', 'Pagu Biaya'];
    const rows = filteredData.map(d => [
      d.no,
      d.namaKegiatan,
      d.kategoriKegiatan?.includes('MANDATORY') ? 'Mandatory' : 'Prioritas Risiko',
      d.sasaranOPD || '-',
      d.jadwalBulan || '-',
      d.timJumlahAuditor && d.timJumlahAuditor > 0 ? `${d.timJumlahAuditor} Org` : '-',
      d.alokasiMandays && d.alokasiMandays > 0 ? `${d.alokasiMandays} Hari` : '-',
      d.anggaranBiaya && d.anggaranBiaya > 0 ? `Rp ${d.anggaranBiaya.toLocaleString('id-ID')}` : '-'
    ]);

    exportToPdf(
      `Lampiran_14_Format_PKPT_Berbasis_Risiko_Tahun_${headerInfo.tahun}`,
      `LAMPIRAN 14: PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT) BERBASIS RISIKO TAHUN ${headerInfo.tahun}`,
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Sukses Sinkronisasi */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 14 (Dokumen Final)
              </span>
              <span className="text-xs text-indigo-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Format Program Kerja Pengawasan Tahunan (PKPT) Berbasis Risiko
            </h1>
            <p className="text-sm text-indigo-100/80 mt-1 max-w-3xl leading-relaxed">
              Kompilasi penugasan PKPT yang ditarik melalui tombol <strong>Sinkronisasi Data</strong> dari <strong>Menu 11 (Usulan PBBR)</strong> dan <strong>Menu 12 (Mandatory Regulasi)</strong>, serta secara otomatis menyaring keluar area yang tercatat di <strong>Menu 13 (Tidak Masuk PKPT)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition transform active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Data'}</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2.5 bg-indigo-800/60 hover:bg-indigo-700/80 text-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-700/50"
            >
              <Info className="w-3.5 h-3.5 text-indigo-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={data.length === 0}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={data.length === 0}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-indigo-800/40">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Masuk PKPT</span>
            <span className="text-xl font-black text-white mt-0.5 block">{data.length} Kegiatan</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-blue-300 block font-medium">Prioritas PBBR (Menu 11)</span>
            <span className="text-lg font-black text-blue-300 mt-0.5 block">{countPbbr} Penugasan</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-teal-300 block font-medium">Mandatory (Menu 12)</span>
            <span className="text-lg font-black text-teal-300 mt-0.5 block">{countMandatory} Wajib</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-amber-300 block font-medium">Dikecualikan (Menu 13)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-black text-amber-300">{countExcluded} Objek</span>
              {countExcluded > 0 && (
                <button
                  onClick={() => setShowExcludedModal(true)}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold rounded-md border border-amber-500/40 flex items-center gap-1 transition"
                  title="Lihat rincian area yang tidak masuk PKPT"
                >
                  <Eye className="w-3 h-3" />
                  Lihat
                </button>
              )}
            </div>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-emerald-300 block font-medium">Pagu Anggaran Total</span>
            <span className="text-base font-black text-emerald-300 mt-0.5 block">
              {totalAnggaran > 0 ? `Rp ${totalAnggaran.toLocaleString('id-ID')}` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pengisian */}
      {showGuide && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
            <Info className="w-4 h-4 text-indigo-600" />
            PETUNJUK PENGISIAN & SINKRONISASI DATA FORMAT PKPT BERBASIS RISIKO (MENU 14)
          </div>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>Sinkronisasi Melalui Tombol:</strong> Data PKPT tidak diperbarui secara otomatis di latar belakang agar hasil penyesuaian Anda tidak tertimpa tiba-tiba. Tekan tombol <strong>Sinkronisasi Data</strong> kapan saja Anda ingin menyegarkan daftar penugasan dari Menu 11 dan Menu 12.
            </p>
            <p>
              2. <strong>Sumber Data Terpadu:</strong>
              <br />
              &bull; <strong>Bagian A (Prioritas PBBR):</strong> Ditarik dari usulan pengawasan di Menu 11.
              <br />
              &bull; <strong>Bagian B (Mandatory Regulasi):</strong> Ditarik dari pengawasan wajib perundang-undangan di Menu 12 (Reviu LKPD, LPPD, SPIP, dsb).
            </p>
            <p>
              3. <strong>Penyelarasan dengan Menu 13 (Tidak Masuk PKPT):</strong> Objek pengawasan yang telah dimasukkan ke Menu 13 (karena keterbatasan mandays atau pagu anggaran) secara otomatis dikeluarkan / tidak masuk ke dokumen PKPT Menu 14.
            </p>
            <p>
              4. <strong>Penyesuaian Operasional (Jadwal, Tim, Anggaran):</strong> Anda dapat mengedit jadwal kuartal (TW I - TW IV), jumlah auditor, mandays, dan pagu biaya per kegiatan dengan menekan tombol <em>Edit</em> pada baris penugasan.
            </p>
          </div>
        </div>
      )}

      {/* Banner Informasi Penyesuaian Menu 13 jika ada yang dikecualikan */}
      {countExcluded > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                Penyelarasan Menu 13: {countExcluded} Objek Pengawasan Dikecualikan dari Dokumen PKPT
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Objek ini ada di Menu 11/12 namun disaring keluar karena tercatat di Menu 13 (keterbatasan mandays/anggaran).
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExcludedModal(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Objek Dikecualikan</span>
          </button>
        </div>
      )}

      {/* STATE JIKA BELUM ADA DATA DISINKRONKAN */}
      {data.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Data PKPT Belum Disinkronkan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Format PKPT tidak diisi secara otomatis. Silakan tekan tombol <strong>Sinkronisasi Data</strong> di bawah untuk menarik dan mengompilasi kegiatan dari <strong>Menu 11 (Usulan PBBR)</strong> dan <strong>Menu 12 (Mandatory Regulasi)</strong>, yang otomatis disesuaikan dengan <strong>Menu 13</strong>.
            </p>
            <div className="pt-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg inline-flex items-center gap-2 transition transform active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronisasi Data Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: Category Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ALL'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semua ({data.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('PBBR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'PBBR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>A. Prioritas PBBR ({countPbbr})</span>
              </button>
              <button
                onClick={() => setActiveTab('MANDATORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'MANDATORY'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>B. Mandatory Regulasi ({countMandatory})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kegiatan, OPD, atau jadwal..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* TABEL FORMAT PKPT BERBASIS RISIKO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold tracking-wide">
                  TABEL PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT) BERBASIS RISIKO
                </h2>
              </div>
              <span className="text-xs text-indigo-200 font-medium">
                Terkonsolidasi dari Usulan PBBR (Menu 11) & Mandatory Regulasi (Menu 12)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-center">
                    <th className="p-3 w-12 font-bold border-r border-slate-700">No</th>
                    <th className="p-3 min-w-[280px] text-left font-semibold border-r border-slate-700">
                      Nama Penugasan / Kegiatan Pengawasan
                    </th>
                    <th className="p-3 min-w-[180px] text-left font-semibold border-r border-slate-700">
                      Sasaran / Unit Kerja Pengawasan (OPD)
                    </th>
                    <th className="p-3 w-40 text-center font-semibold border-r border-slate-700">
                      Rencana Jadwal
                    </th>
                    <th className="p-3 w-24 text-center font-semibold border-r border-slate-700">
                      Personil Tim
                    </th>
                    <th className="p-3 w-24 text-center font-semibold border-r border-slate-700">
                      Mandays
                    </th>
                    <th className="p-3 w-32 text-right font-semibold border-r border-slate-700">
                      Pagu Anggaran (Rp)
                    </th>
                    <th className="p-3 w-16 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.map(item => {
                    const isMandatory = item.kategoriKegiatan?.includes('MANDATORY');

                    return (
                      <tr key={item.id} className="transition hover:bg-indigo-50/30">
                        {/* Nomor */}
                        <td className="p-3 text-center font-bold text-slate-600">
                          {item.no}
                        </td>

                        {/* Nama Kegiatan & Kategori */}
                        <td className="p-3 font-bold text-slate-900">
                          <div className="space-y-1">
                            <span className="block text-slate-900 font-bold">{item.namaKegiatan}</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md inline-block font-semibold ${
                                  isMandatory
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {item.kategoriKegiatan}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Sasaran OPD */}
                        <td className="p-3 text-slate-700 font-medium">
                          {item.sasaranOPD && item.sasaranOPD !== '-' ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.sasaranOPD}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Jadwal Pelaksanaan */}
                        <td className="p-3 text-center">
                          {item.jadwalBulan ? (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-indigo-600" />
                              {item.jadwalBulan}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>

                        {/* Personil Tim */}
                        <td className="p-3 text-center font-semibold text-slate-800">
                          {item.timJumlahAuditor && item.timJumlahAuditor > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {item.timJumlahAuditor} Orang
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Mandays */}
                        <td className="p-3 text-center font-bold text-indigo-900">
                          {item.alokasiMandays && item.alokasiMandays > 0 ? (
                            `${item.alokasiMandays} Hari`
                          ) : (
                            <span className="text-slate-400 font-normal text-[11px]">-</span>
                          )}
                        </td>

                        {/* Anggaran Biaya */}
                        <td className="p-3 text-right font-black text-emerald-800">
                          {item.anggaranBiaya && item.anggaranBiaya > 0 ? (
                            `Rp ${item.anggaranBiaya.toLocaleString('id-ID')}`
                          ) : (
                            <span className="text-slate-400 font-normal text-[11px]">-</span>
                          )}
                        </td>

                        {/* Aksi Edit */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition inline-flex items-center"
                            title="Sesuaikan Jadwal & Anggaran"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3 text-right">
                      TOTAL DOKUMEN PKPT TAMPIL ({filteredData.length} KEGIATAN):
                    </td>
                    <td className="p-3 text-center text-indigo-900">
                      {totalAuditorPersonil > 0 ? `${totalAuditorPersonil} Personil-Tugas` : '-'}
                    </td>
                    <td className="p-3 text-center text-indigo-900">
                      {totalMandays > 0 ? `${totalMandays} Mandays` : '-'}
                    </td>
                    <td className="p-3 text-right text-emerald-800 text-sm">
                      {totalAnggaran > 0 ? `Rp ${totalAnggaran.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Form Informasi Penandatangan Dokumen PKPT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              Pengaturan Identitas & Pengesahan Dokumen PKPT
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Tahun Anggaran</label>
                <input
                  type="text"
                  value={headerInfo.tahun}
                  onChange={e => setHeaderInfo({ ...headerInfo, tahun: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Nama Inspektur Daerah</label>
                <input
                  type="text"
                  value={headerInfo.namaInspektur}
                  onChange={e => setHeaderInfo({ ...headerInfo, namaInspektur: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Nama Kepala Daerah</label>
                <input
                  type="text"
                  value={headerInfo.namaBupati}
                  onChange={e => setHeaderInfo({ ...headerInfo, namaBupati: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Jabatan Kepala Daerah</label>
                <input
                  type="text"
                  value={headerInfo.jabatanBupati}
                  onChange={e => setHeaderInfo({ ...headerInfo, jabatanBupati: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: DAFTAR AREA YANG DIKECUALIKAN OLEH MENU 13 */}
      {showExcludedModal && syncMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-amber-700">
                <Ban className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Daftar Objek yang Dikecualikan dari PKPT (Menu 13)
                </h3>
              </div>
              <button
                onClick={() => setShowExcludedModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 py-3 leading-relaxed">
              Berikut adalah daftar kegiatan yang terdapat pada <strong>Menu 11 (Usulan PBBR)</strong> atau <strong>Menu 12 (Mandatory Regulasi)</strong>, namun <strong>tidak dimasukkan ke dokumen PKPT Menu 14</strong> karena terdaftar pada <strong>Menu 13 (Area Tidak Masuk PKPT Tahun Berjalan)</strong> akibat keterbatasan mandays atau anggaran:
            </p>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl divide-y divide-slate-200">
              {syncMeta.excludedItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada objek yang dikecualikan. Seluruh usulan masuk ke dokumen PKPT.
                </div>
              ) : (
                syncMeta.excludedItems.map((ex, idx) => (
                  <div key={idx} className="p-3.5 hover:bg-slate-50 transition space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          {ex.areaPengawasan}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          OPD Pengampu: <strong>{ex.opdPengampu}</strong>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold shrink-0 border border-slate-200">
                        Sumber: {ex.source}
                      </span>
                    </div>
                    <div className="bg-amber-50/80 rounded-lg p-2 border border-amber-200/60 mt-1">
                      <span className="text-[11px] text-amber-900 font-semibold block">
                        Alasan Tidak Masuk PKPT (Menu 13):
                      </span>
                      <span className="text-[11px] text-amber-800 block">
                        {ex.alasan}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setShowExcludedModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Hanya untuk detail jadwal, tim, mandays, dan pagu) */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Sesuaikan Operasional Penugasan PKPT (#{editingItem.no})
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
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                  {editingItem.kategoriKegiatan}
                </span>
                <span className="text-xs font-semibold text-slate-800 block">
                  Penugasan #{editingItem.no}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kegiatan / Penugasan Pengawasan *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.namaKegiatan || ''}
                  onChange={e => setEditingItem({ ...editingItem, namaKegiatan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sasaran Unit Kerja / OPD Pengampu
                </label>
                <input
                  type="text"
                  value={editingItem.sasaranOPD && editingItem.sasaranOPD !== '-' ? editingItem.sasaranOPD : ''}
                  onChange={e => setEditingItem({ ...editingItem, sasaranOPD: e.target.value })}
                  placeholder="Contoh: Dinas Kesehatan, BPKAD, dll."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Jadwal Pelaksanaan
                </label>
                <select
                  value={editingItem.jadwalBulan || ''}
                  onChange={e => setEditingItem({ ...editingItem, jadwalBulan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                >
                  <option value="">-- Belum Dijadwalkan --</option>
                  <option value="Januari - Maret (TW I)">Januari - Maret (TW I)</option>
                  <option value="April - Juni (TW II)">April - Juni (TW II)</option>
                  <option value="Juli - September (TW III)">Juli - September (TW III)</option>
                  <option value="Oktober - Desember (TW IV)">Oktober - Desember (TW IV)</option>
                  <option value="Sepanjang Tahun (Insidentil)">Sepanjang Tahun (Insidentil)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Personil Tim (Orang)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="Kosong"
                    value={editingItem.timJumlahAuditor || ''}
                    onChange={e => setEditingItem({ ...editingItem, timJumlahAuditor: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Kosongkan jika belum ditetapkan</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alokasi Mandays (Hari)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="0"
                    value={editingItem.alokasiMandays || ''}
                    onChange={e => setEditingItem({ ...editingItem, alokasiMandays: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Dari Menu 11/12 atau penyesuaian</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pagu Biaya Pengawasan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  placeholder="0"
                  value={editingItem.anggaranBiaya || ''}
                  onChange={e => setEditingItem({ ...editingItem, anggaranBiaya: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-black text-emerald-800 focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Kosongkan jika pagu belum dialokasikan</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
