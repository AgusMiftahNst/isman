import React, { useState } from 'react';
import { AreaTidakMasukPKPTItem, INITIAL_TIDAK_MASUK_PKPT } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { getMenu11Items, getMenu12Items, getMandatoryDefaultOPD } from './ppbrSyncHelpers';
import {
  Ban,
  Plus,
  Trash2,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Building2,
  BookOpen,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface CandidateArea {
  id: string;
  source: 'Menu 11' | 'Menu 12';
  area: string;
  opd: string;
  skor: number;
  kategori: string;
}

export const AreaTidakMasukPKPTView: React.FC = () => {
  const [data, setData] = useState<AreaTidakMasukPKPTItem[]>(() => {
    const saved = localStorage.getItem('ppbr_tidak_masuk_pkpt');
    return saved ? JSON.parse(saved) : INITIAL_TIDAK_MASUK_PKPT;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showQuickPickModal, setShowQuickPickModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AreaTidakMasukPKPTItem | null>(null);

  // State untuk form Tambah Data Manual
  const [manualForm, setManualForm] = useState({
    areaPengawasan: '',
    opdPengampu: '',
    skorRisiko: 2.8,
    kategoriRisiko: 'Sedang',
    alasanTidakMasuk: 'Keterbatasan jumlah auditor dan alokasi anggaran operasional',
    alternatifMitigasi: 'Asistensi mandiri dan dijadwalkan pada PKPT tahun berikutnya'
  });

  // State untuk form modal Pilih Cepat
  const [quickFilterTab, setQuickFilterTab] = useState<'ALL' | 'Menu 11' | 'Menu 12'>('ALL');
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateArea | null>(null);
  const [quickPickReason, setQuickPickReason] = useState(
    'Keterbatasan jumlah personil auditor APIP dan keterbatasan pagu anggaran pengawasan tahun berjalan'
  );
  const [quickPickMitigasi, setQuickPickMitigasi] = useState(
    'Asistensi dan self-assessment mandiri oleh OPD serta pemantauan berkala'
  );

  const handleSaveData = (newData: AreaTidakMasukPKPTItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_tidak_masuk_pkpt', JSON.stringify(newData));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Ambil daftar kandidat dari Menu 11 & Menu 12
  const getAllCandidates = (): CandidateArea[] => {
    const m11 = getMenu11Items();
    const m12 = getMenu12Items();

    const candidates: CandidateArea[] = [];

    m11.forEach((item, idx) => {
      const area = item.areaPengawasan || item.namaAreaPengawasan || '';
      if (area) {
        candidates.push({
          id: `cand-m11-${item.id || idx}`,
          source: 'Menu 11',
          area,
          opd: item.opdPengampu || '-',
          skor: Number(item.skorRisiko) || 3.0,
          kategori: item.kategoriPrioritas || 'Sedang'
        });
      }
    });

    m12.forEach((item, idx) => {
      const area = item.areaPengawasan || item.namaAreaPengawasan || '';
      if (area) {
        candidates.push({
          id: `cand-m12-${item.id || idx}`,
          source: 'Menu 12',
          area,
          opd: (item as any).opdPengampu || getMandatoryDefaultOPD(area),
          skor: 3.5,
          kategori: 'Sedang'
        });
      }
    });

    return candidates;
  };

  // Cek apakah kandidat sudah ada di Menu 13
  const isAlreadyInMenu13 = (candidateArea: string) => {
    const cleanCand = candidateArea.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    return data.some(d => {
      const cleanD = (d.areaPengawasan || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      return cleanCand === cleanD || (cleanCand.length >= 6 && cleanD.includes(cleanCand));
    });
  };

  // Tambah item manual
  const handleSaveManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.areaPengawasan.trim()) return;

    const item: AreaTidakMasukPKPTItem = {
      id: `atmp-${Date.now()}`,
      no: data.length + 1,
      areaPengawasan: manualForm.areaPengawasan.trim(),
      opdPengampu: manualForm.opdPengampu.trim() || '-',
      skorRisiko: Number(manualForm.skorRisiko),
      kategoriRisiko: manualForm.kategoriRisiko,
      alasanTidakMasuk: manualForm.alasanTidakMasuk.trim(),
      alternatifMitigasi: manualForm.alternatifMitigasi.trim()
    };

    const updated = [...data, item];
    handleSaveData(updated);
    setShowManualAddModal(false);
    setManualForm({
      areaPengawasan: '',
      opdPengampu: '',
      skorRisiko: 2.8,
      kategoriRisiko: 'Sedang',
      alasanTidakMasuk: 'Keterbatasan jumlah auditor dan alokasi anggaran operasional',
      alternatifMitigasi: 'Asistensi mandiri dan dijadwalkan pada PKPT tahun berikutnya'
    });
    showToast(`Berhasil menambahkan "${item.areaPengawasan}" secara manual.`);
  };

  // Simpan item yang dipilih cepat dari Menu 11 / 12
  const handleConfirmQuickPick = () => {
    if (!selectedCandidate) return;

    const item: AreaTidakMasukPKPTItem = {
      id: `atmp-qp-${Date.now()}`,
      no: data.length + 1,
      areaPengawasan: selectedCandidate.area,
      opdPengampu: selectedCandidate.opd,
      skorRisiko: selectedCandidate.skor,
      kategoriRisiko: selectedCandidate.kategori,
      alasanTidakMasuk: quickPickReason.trim(),
      alternatifMitigasi: quickPickMitigasi.trim()
    };

    const updated = [...data, item];
    handleSaveData(updated);
    showToast(`Berhasil menambahkan "${selectedCandidate.area}" dari ${selectedCandidate.source}.`);
    setSelectedCandidate(null);
  };

  const handleOpenEdit = (item: AreaTidakMasukPKPTItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const updatedItem: AreaTidakMasukPKPTItem = {
      ...editingItem,
      skorRisiko: Number(editingItem.skorRisiko)
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
    showToast('Perubahan data berhasil disimpan.');
  };

  const requestDelete = (item: AreaTidakMasukPKPTItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Area Non-PKPT?',
      message: 'Apakah Anda yakin ingin menghapus area ini dari daftar pengawasan yang tidak dapat masuk PKPT?',
      detail: `Area: "${item.areaPengawasan}" | OPD: ${item.opdPengampu}`,
      confirmText: 'Ya, Hapus Area',
      variant: 'danger',
      onConfirm: () => {
        const updated = data.filter(d => d.id !== item.id).map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
        showToast('Area berhasil dihapus dari Menu 13.');
      }
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Area Non-PKPT?',
      message: `Apakah Anda yakin ingin mengosongkan seluruh data (${data.length} item) pada tabel Area Tidak Masuk PKPT?`,
      detail: 'Seluruh pencatatan objek risiko non-prioritas dan alternatif mitigasi akan dibersihkan.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
        showToast('Data Area Tidak Masuk PKPT telah dikosongkan.');
      }
    });
  };

  const filteredData = data.filter(d =>
    (d.areaPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.alasanTidakMasuk || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allCandidates = getAllCandidates();
  const filteredCandidates = allCandidates.filter(c => {
    if (quickFilterTab !== 'ALL' && c.source !== quickFilterTab) return false;
    if (!quickSearchTerm) return true;
    const term = quickSearchTerm.toLowerCase();
    return c.area.toLowerCase().includes(term) || c.opd.toLowerCase().includes(term);
  });

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Area / Objek Pengawasan', key: 'areaPengawasan', width: 38 },
      { header: 'OPD Pengampu', key: 'opdPengampu', width: 28 },
      { header: 'Skor Risiko', key: 'skorRisiko', width: 14 },
      { header: 'Kategori', key: 'kategoriRisiko', width: 16 },
      { header: 'Alasan Tidak Dapat Masuk PKPT', key: 'alasanTidakMasuk', width: 40 },
      { header: 'Alternatif Pengawasan / Mitigasi Risiko', key: 'alternatifMitigasi', width: 40 }
    ];

    exportToExcel(
      'Lampiran_13_Area_Tidak_Masuk_PKPT',
      'LAMPIRAN 13: DAFTAR AREA PENGAWASAN YANG TIDAK DAPAT DILAKSANAKAN DALAM PKPT TAHUN BERJALAN',
      'Dokumentasi Keterbatasan Sumber Daya APIP & Tindak Lanjut Mitigasi Risiko Terkait',
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Area Pengawasan', 'OPD Pengampu', 'Skor', 'Alasan Tidak Masuk PKPT', 'Alternatif Mitigasi'];
    const rows = filteredData.map(d => [
      d.no,
      d.areaPengawasan,
      d.opdPengampu,
      Number(d.skorRisiko).toFixed(2),
      d.alasanTidakMasuk,
      d.alternatifMitigasi
    ]);

    exportToPdf(
      'Lampiran_13_Area_Tidak_Masuk_PKPT',
      'LAMPIRAN 13: AREA PENGAWASAN TIDAK DAPAT MASUK PKPT',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
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
      <div className="bg-gradient-to-r from-stone-900 via-slate-900 to-zinc-900 rounded-2xl p-6 text-white shadow-xl border border-stone-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-stone-500/20 text-stone-300 border border-stone-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 13
              </span>
              <span className="text-xs text-stone-300">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Area Pengawasan yang Tidak Dapat Dilaksanakan dalam PKPT
            </h1>
            <p className="text-sm text-stone-300/80 mt-1 max-w-3xl leading-relaxed">
              Dokumentasi transparansi dan akuntabilitas APIP mengenai objek berisiko yang tidak tercover dalam PKPT tahun berjalan akibat keterbatasan sumber daya. Area yang dicatat di sini otomatis disaring keluar dari <strong>Menu 14</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol 1: Pilih Cepat dari Menu 11 & 12 */}
            <button
              onClick={() => {
                setSelectedCandidate(null);
                setShowQuickPickModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
              title="Pilih langsung dari daftar usulan Menu 11 atau kewajiban Menu 12"
            >
              <Sparkles className="w-4 h-4 text-amber-950" />
              <span>Pilih Cepat (Menu 11 & 12)</span>
            </button>

            {/* Tombol 2: Tambah Data Manual */}
            <button
              onClick={() => setShowManualAddModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition transform active:scale-95"
              title="Input data objek non-PKPT secara manual bebas dari awal"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Manual</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-stone-700"
            >
              <Info className="w-3.5 h-3.5 text-stone-300" />
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

            {data.length > 0 && (
              <button
                onClick={requestResetData}
                className="px-3 py-2.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Kosongkan Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-700/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block font-medium">Total Area Non-PKPT</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{data.length} Objek</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block font-medium">Koneksi ke Menu 14</span>
            <span className="text-xs font-bold text-amber-400 mt-1 block flex items-center gap-1">
              <Ban className="w-3.5 h-3.5" />
              Disaring Keluar dari PKPT
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block font-medium">Tersedia di Menu 11 & 12</span>
            <span className="text-sm font-bold text-indigo-300 mt-0.5 block">
              {allCandidates.length} Objek Siap Dipilih
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block font-medium">Metode Input</span>
            <span className="text-xs font-bold text-emerald-300 mt-1 block">
              Pilih Cepat & Manual Bebas
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pengisian */}
      {showGuide && (
        <div className="bg-stone-50 border border-stone-300 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <Info className="w-4 h-4 text-stone-600" />
            PETUNJUK PENGISIAN AREA TIDAK DAPAT MASUK PKPT (MENU 13)
          </div>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>Fitur Pilih Cepat dari Menu 11 & 12:</strong> Gunakan tombol <strong>Pilih Cepat (Menu 11 & 12)</strong> untuk memilih objek yang sudah tercatat di Usulan Prioritas PBBR (Menu 11) atau Mandatory Regulasi (Menu 12). Nama dan OPD akan terisi identik sehingga Menu 14 langsung mengenalinya dan menyaringnya keluar dari dokumen PKPT.
            </p>
            <p>
              2. <strong>Fitur Tambah Data Manual:</strong> Gunakan tombol <strong>Tambah Manual</strong> jika Anda ingin menginput objek pengawasan non-PKPT secara bebas dari awal (misalnya usulan ad-hoc baru di luar Menu 11 dan Menu 12).
            </p>
            <p>
              3. <strong>Alasan & Alternatif Mitigasi:</strong> Wajib diisi sebagai bukti akuntabilitas APIP bila terdapat program berisiko yang tidak diaudit pada tahun berjalan karena keterbatasan mandays auditor atau alokasi biaya pengawasan.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar: Search & Action Shortcut */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">
            Menampilkan: <strong>{filteredData.length}</strong> dari <strong>{data.length}</strong> objek tercatat
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari area, OPD, atau alasan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* TABEL AREA TIDAK MASUK PKPT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold tracking-wide">
              DAFTAR OBJEK PENGAWASAN YANG TIDAK DAPAT DILAKSANAKAN DALAM PKPT
            </h2>
          </div>
          <span className="text-xs text-slate-300 font-medium">
            Area berikut otomatis dikecualikan dari Format PKPT (Menu 14)
          </span>
        </div>

        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {data.length === 0
                ? 'Belum ada data area pengawasan yang dikecualikan dari PKPT.'
                : 'Tidak ada data yang sesuai dengan pencarian.'}
            </p>
            {data.length === 0 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowQuickPickModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilih Cepat dari Menu 11 & 12</span>
                </button>
                <button
                  onClick={() => setShowManualAddModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Data Manual</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-center">
                  <th className="p-3 w-12 font-bold border-r border-slate-700">No</th>
                  <th className="p-3 min-w-[240px] text-left font-semibold border-r border-slate-700">
                    Area / Objek Pengawasan
                  </th>
                  <th className="p-3 min-w-[180px] text-left font-semibold border-r border-slate-700">
                    OPD Pengampu
                  </th>
                  <th className="p-3 w-24 text-center font-semibold border-r border-slate-700">
                    Skor Risiko
                  </th>
                  <th className="p-3 w-28 text-center font-semibold border-r border-slate-700">
                    Kategori
                  </th>
                  <th className="p-3 min-w-[260px] text-left font-semibold border-r border-slate-700">
                    Alasan Tidak Masuk PKPT
                  </th>
                  <th className="p-3 min-w-[260px] text-left font-semibold border-r border-slate-700">
                    Alternatif Pengawasan / Mitigasi
                  </th>
                  <th className="p-3 w-20 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.map(item => (
                  <tr key={item.id} className="transition hover:bg-amber-50/20">
                    <td className="p-3 text-center font-bold text-slate-600">{item.no}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="space-y-0.5">
                        <span className="block text-slate-900 font-bold">{item.areaPengawasan}</span>
                        <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.2 rounded-md inline-block font-semibold">
                          Non-PKPT
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.opdPengampu}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {Number(item.skorRisiko).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.kategoriRisiko === 'Tinggi'
                            ? 'bg-rose-100 text-rose-800'
                            : item.kategoriRisiko === 'Sedang'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.kategoriRisiko}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 text-[11px] leading-relaxed">
                      {item.alasanTidakMasuk}
                    </td>
                    <td className="p-3 text-slate-700 text-[11px] leading-relaxed">
                      {item.alternatifMitigasi}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Area Non-PKPT"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDelete(item)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus dari Menu 13"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PILIH CEPAT DARI MENU 11 & MENU 12               */}
      {/* ======================================================== */}
      {showQuickPickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Pilih Cepat Objek dari Menu 11 & Menu 12
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih kegiatan yang ingin ditetapkan tidak masuk PKPT tahun berjalan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowQuickPickModal(false);
                  setSelectedCandidate(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setQuickFilterTab('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    quickFilterTab === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({allCandidates.length})
                </button>
                <button
                  onClick={() => setQuickFilterTab('Menu 11')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    quickFilterTab === 'Menu 11'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Menu 11 (PBBR)
                </button>
                <button
                  onClick={() => setQuickFilterTab('Menu 12')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    quickFilterTab === 'Menu 12'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Menu 12 (Mandatory)
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari objek pengawasan..."
                  value={quickSearchTerm}
                  onChange={e => setQuickSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* List Candidates / Form Confirmation */}
            <div className="overflow-y-auto flex-1 py-3 space-y-3">
              {selectedCandidate ? (
                /* Langkah Konfirmasi untuk item yang dipilih */
                <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block mb-1">
                        Objek yang Dipilih: {selectedCandidate.source}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{selectedCandidate.area}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        OPD Pengampu: <strong>{selectedCandidate.opd}</strong> | Skor Risiko: <strong>{selectedCandidate.skor.toFixed(2)}</strong> ({selectedCandidate.kategori})
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      Ganti Pilihan
                    </button>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-amber-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Alasan Tidak Dapat Masuk PKPT *
                      </label>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          'Keterbatasan jumlah personil auditor APIP',
                          'Keterbatasan alokasi anggaran pengawasan',
                          'Dijadwalkan untuk audit PKPT tahun berikutnya'
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setQuickPickReason(preset)}
                            className="px-2 py-0.5 bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 rounded-md text-[10px] font-medium transition"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={quickPickReason}
                        onChange={e => setQuickPickReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        placeholder="Tuliskan alasan keterbatasan..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Alternatif Pengawasan / Mitigasi Risiko *
                      </label>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          'Asistensi dan self-assessment mandiri oleh OPD',
                          'Monitoring berkala melalui laporan triwulanan',
                          'Supervisi berkala dan penugasan insidentil'
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setQuickPickMitigasi(preset)}
                            className="px-2 py-0.5 bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 rounded-md text-[10px] font-medium transition"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={quickPickMitigasi}
                        onChange={e => setQuickPickMitigasi(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                        placeholder="Tuliskan alternatif mitigasi..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCandidate(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmQuickPick}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition"
                      >
                        Simpan ke Menu 13
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Daftar Seluruh Kandidat */
                <div className="space-y-2">
                  {filteredCandidates.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Tidak ada objek pengawasan yang ditemukan.
                    </div>
                  ) : (
                    filteredCandidates.map(cand => {
                      const alreadyAdded = isAlreadyInMenu13(cand.area);

                      return (
                        <div
                          key={cand.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                            alreadyAdded
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white hover:bg-amber-50/40 border-slate-200 hover:border-amber-300 shadow-2xs'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                  cand.source === 'Menu 11'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-teal-100 text-teal-800'
                                }`}
                              >
                                {cand.source}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {cand.area}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>OPD: <strong>{cand.opd}</strong></span>
                              <span>Skor: <strong>{cand.skor.toFixed(2)}</strong></span>
                              <span>Kategori: <strong>{cand.kategori}</strong></span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {alreadyAdded ? (
                              <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Sudah di Menu 13
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedCandidate(cand)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition"
                              >
                                <span>Pilih</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowQuickPickModal(false);
                  setSelectedCandidate(null);
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TAMBAH DATA SECARA MANUAL                        */}
      {/* ======================================================== */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Tambah Area Non-PKPT Secara Manual
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input objek bebas dari awal tanpa memilih dari menu lain.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowManualAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAdd} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Area / Objek Pengawasan *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.areaPengawasan}
                  onChange={e => setManualForm({ ...manualForm, areaPengawasan: e.target.value })}
                  placeholder="Contoh: Audit Khusus Pengelolaan Retribusi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OPD / Perangkat Daerah Pengampu *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.opdPengampu}
                  onChange={e => setManualForm({ ...manualForm, opdPengampu: e.target.value })}
                  placeholder="Contoh: Badan Pendapatan Daerah"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skor Risiko (1 - 5)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="5"
                    value={manualForm.skorRisiko}
                    onChange={e => setManualForm({ ...manualForm, skorRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Risiko
                  </label>
                  <select
                    value={manualForm.kategoriRisiko}
                    onChange={e => setManualForm({ ...manualForm, kategoriRisiko: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Tidak Dapat Masuk PKPT *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualForm.alasanTidakMasuk}
                  onChange={e => setManualForm({ ...manualForm, alasanTidakMasuk: e.target.value })}
                  placeholder="Jelaskan alasan keterbatasan mandays atau anggaran..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternatif Pengawasan / Mitigasi Risiko *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualForm.alternatifMitigasi}
                  onChange={e => setManualForm({ ...manualForm, alternatifMitigasi: e.target.value })}
                  placeholder="Tindakan mitigasi atau asistensi mandiri..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Simpan Data Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT DATA ITEM                                  */}
      {/* ======================================================== */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Edit Area Non-PKPT (#{editingItem.no})
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Area / Objek Pengawasan *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.areaPengawasan}
                  onChange={e => setEditingItem({ ...editingItem, areaPengawasan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OPD / Unit Pengampu *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.opdPengampu}
                  onChange={e => setEditingItem({ ...editingItem, opdPengampu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skor Risiko (1 - 5)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="5"
                    value={editingItem.skorRisiko}
                    onChange={e => setEditingItem({ ...editingItem, skorRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Risiko
                  </label>
                  <select
                    value={editingItem.kategoriRisiko}
                    onChange={e => setEditingItem({ ...editingItem, kategoriRisiko: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Tidak Dapat Masuk PKPT *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.alasanTidakMasuk}
                  onChange={e => setEditingItem({ ...editingItem, alasanTidakMasuk: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternatif Pengawasan / Mitigasi Risiko *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.alternatifMitigasi}
                  onChange={e => setEditingItem({ ...editingItem, alternatifMitigasi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
