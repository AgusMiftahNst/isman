import React, { useState, useEffect } from 'react';
import { UsulanPrioritasPengawasanItem, PrioritasProgramRPJMDItem } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import {
  Target,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  Crown,
  AlertTriangle,
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';

export const PILIHAN_JENIS_PENGAWASAN = [
  'Audit Kinerja Berbasis Risiko',
  'Audit Kepatuhan / Ketaatan',
  'Audit Investigatif / Kasus Khusus',
  'Reviu Laporan / Dokumen',
  'Evaluasi Akuntabilitas Program',
  'Monitoring & Pemantauan',
  'Asistensi & Pendampingan Tata Kelola'
];

export const UsulanPrioritasPengawasanView: React.FC = () => {
  // Baca data dari Menu 8 (Prioritas Program RPJMD)
  const getMenu8Data = (): PrioritasProgramRPJMDItem[] => {
    const saved = localStorage.getItem('ppbr_prioritas_program');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error reading ppbr_prioritas_program', e);
      }
    }
    return [];
  };

  // Baca data usulan yang sudah disimpan
  const [data, setData] = useState<UsulanPrioritasPengawasanItem[]>([]);
  const [menu8Items, setMenu8Items] = useState<PrioritasProgramRPJMDItem[]>([]);
  const [isMenu8Filled, setIsMenu8Filled] = useState<boolean>(false);

  const [filterKategori, setFilterKategori] = useState<'all' | 'Tinggi' | 'Sedang' | 'Rendah'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UsulanPrioritasPengawasanItem | null>(null);

  // Fungsi sinkronisasi otomatis dari Menu 8 yang diurutkan dari risiko tertinggi
  const syncFromMenu8 = () => {
    const m8List = getMenu8Data();
    setMenu8Items(m8List);

    if (m8List.length === 0) {
      setIsMenu8Filled(false);
      setData([]);
      localStorage.setItem('ppbr_usulan_pengawasan', JSON.stringify([]));
      return;
    }

    setIsMenu8Filled(true);

    // Ambil jenis pengawasan yang sudah pernah diatur oleh user
    let existingCustom = new Map<string, { jenis: string; mandays: number }>();
    const saved = localStorage.getItem('ppbr_usulan_pengawasan');
    if (saved) {
      try {
        const parsed: UsulanPrioritasPengawasanItem[] = JSON.parse(saved);
        parsed.forEach(item => {
          const key = (item.areaPengawasan || '').trim().toLowerCase();
          if (key) {
            existingCustom.set(key, {
              jenis: item.jenisPengawasan || 'Audit Kinerja Berbasis Risiko',
              mandays: item.alokasiMandays || 15
            });
          }
        });
      } catch (e) {
        console.error('Error reading ppbr_usulan_pengawasan', e);
      }
    }

    // Urutkan dari risiko tertinggi di Menu 8:
    // Program KDH selalu teratas, lalu diurutkan berdasarkan skorTotal / totalRisiko descending
    const sortedMenu8 = [...m8List].sort((a, b) => {
      const isKDHa = a.permintaanKDH === 'Ya' || Boolean(a.isKDH);
      const isKDHb = b.permintaanKDH === 'Ya' || Boolean(b.isKDH);
      if (isKDHa && !isKDHb) return -1;
      if (!isKDHa && isKDHb) return 1;
      return (b.skorTotal || b.totalRisiko || 0) - (a.skorTotal || a.totalRisiko || 0);
    });

    const generatedUsulan: UsulanPrioritasPengawasanItem[] = sortedMenu8.map((m8, idx) => {
      const key = (m8.program || '').trim().toLowerCase();
      const existing = existingCustom.get(key);

      const isKDH = m8.permintaanKDH === 'Ya' || Boolean(m8.isKDH);
      const skor = isKDH ? 5.0 : (m8.skorTotal || m8.totalRisiko || 3.5);

      let kat: 'Tinggi' | 'Sedang' | 'Rendah' = 'Sedang';
      if (isKDH || skor >= 3.75) {
        kat = 'Tinggi';
      } else if (skor >= 2.5) {
        kat = 'Sedang';
      } else {
        kat = 'Rendah';
      }

      // Default bentuk pengawasan disesuaikan dengan profil risiko
      let defaultJenis = existing?.jenis;
      if (!defaultJenis) {
        if (isKDH) {
          defaultJenis = 'Audit Investigatif / Kasus Khusus';
        } else if (kat === 'Tinggi') {
          defaultJenis = 'Audit Kinerja Berbasis Risiko';
        } else if (kat === 'Sedang') {
          defaultJenis = 'Audit Kepatuhan / Ketaatan';
        } else {
          defaultJenis = 'Monitoring & Pemantauan';
        }
      }

      const defaultMandays = existing?.mandays ?? (isKDH ? 20 : kat === 'Tinggi' ? 18 : kat === 'Sedang' ? 14 : 10);

      return {
        id: `upp-${idx + 1}-${m8.id}`,
        no: idx + 1,
        areaPengawasan: m8.program,
        opdPengampu: m8.opdPengampu || '',
        skorRisiko: parseFloat(skor.toFixed(2)),
        kategoriPrioritas: kat,
        jenisPengawasan: defaultJenis,
        alokasiMandays: defaultMandays,
      };
    });

    setData(generatedUsulan);
    localStorage.setItem('ppbr_usulan_pengawasan', JSON.stringify(generatedUsulan));
  };

  // Muat data saat komponen aktif
  useEffect(() => {
    syncFromMenu8();
  }, []);

  // Update inline jenis pengawasan
  const handleUpdateJenisPengawasan = (item: UsulanPrioritasPengawasanItem, newJenis: string) => {
    const updated = data.map(d => (d.id === item.id ? { ...d, jenisPengawasan: newJenis } : d));
    setData(updated);
    localStorage.setItem('ppbr_usulan_pengawasan', JSON.stringify(updated));
  };

  // Simpan hasil form edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = data.map(d =>
      d.id === editingItem.id
        ? {
            ...d,
            jenisPengawasan: editingItem.jenisPengawasan,
            alokasiMandays: Number(editingItem.alokasiMandays) || 15
          }
        : d
    );

    setData(updated);
    localStorage.setItem('ppbr_usulan_pengawasan', JSON.stringify(updated));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const filteredData = data.filter(d => {
    const matchKat = filterKategori === 'all' || d.kategoriPrioritas === filterKategori;
    const matchSearch =
      (d.areaPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.jenisPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchKat && matchSearch;
  });

  const totalMandays = data.reduce((acc, curr) => acc + curr.alokasiMandays, 0);
  const countTinggi = data.filter(d => d.kategoriPrioritas === 'Tinggi').length;

  const handleExportExcel = () => {
    const cols = [
      { header: 'No Prioritas', key: 'no', width: 12 },
      { header: 'Area / Objek Pengawasan (Program RPJMD Menu 8)', key: 'areaPengawasan', width: 38 },
      { header: 'OPD / Unit Pengampu (Menu 8)', key: 'opdPengampu', width: 30 },
      { header: 'Skor Risiko Total (Menu 8)', key: 'skorRisiko', width: 22 },
      { header: 'Kategori Prioritas', key: 'kategoriPrioritas', width: 18 },
      { header: 'Bentuk / Jenis Pengawasan', key: 'jenisPengawasan', width: 32 },
      { header: 'Alokasi Mandays', key: 'alokasiMandays', width: 16 }
    ];

    exportToExcel(
      'Lampiran_11_Usulan_Prioritas_Pengawasan_PBBR',
      'LAMPIRAN 11: USULAN PRIORITAS PENGAWASAN PBBR (OTOMATIS DARI MENU 8)',
      `Diurutkan dari Skor Risiko Tertinggi Menu 8 | Total Objek: ${data.length} | Mandays: ${totalMandays} Hari Kerja`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Area Pengawasan (Menu 8)', 'OPD Pengampu', 'Skor Total', 'Prioritas', 'Jenis Pengawasan', 'Mandays'];
    const rows = filteredData.map(d => [
      `#${d.no}`,
      d.areaPengawasan,
      d.opdPengampu,
      d.skorRisiko.toFixed(2),
      d.kategoriPrioritas,
      d.jenisPengawasan,
      `${d.alokasiMandays} Hari`
    ]);

    exportToPdf(
      'Lampiran_11_Usulan_Prioritas_Pengawasan_PBBR',
      'LAMPIRAN 11: USULAN PRIORITAS PENGAWASAN PBBR (DARI MENU 8)',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 11
              </span>
              <span className="text-xs text-blue-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Usulan Prioritas Pengawasan Hasil Penilaian Risiko (PBBR)
            </h1>
            <p className="text-sm text-blue-100/80 mt-1 max-w-3xl">
              Menu ini terisi <strong>secara otomatis dari Menu 8</strong> (Penetapan Prioritas Program RPJMD) dan diurutkan langsung dari total skor risiko tertinggi ke terendah. Anda cukup mengisi dan menyesuaikan <strong>Bentuk / Jenis Pengawasan</strong> untuk setiap objek.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={syncFromMenu8}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronkan Ulang dari Menu 8</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-blue-800/60 hover:bg-blue-700/80 text-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-blue-700/50"
            >
              <Info className="w-3.5 h-3.5 text-blue-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={data.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={data.length === 0}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Highlight Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-800/40">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Usulan dari Menu 8</span>
            <span className="text-xl font-black text-white mt-0.5 block">{data.length} Objek</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-rose-300 block font-medium">Prioritas Tinggi (High Risk)</span>
            <span className="text-xl font-black text-rose-400 mt-0.5 block">{countTinggi} Program</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-blue-300 block font-medium">Total Estimasi Mandays</span>
            <span className="text-xl font-black text-blue-300 mt-0.5 block">{totalMandays} Hari</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-emerald-300 block font-medium">Alur Data Sistem</span>
            <span className="text-xs text-emerald-200 mt-1 block font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Menu 8 &rarr; Menu 11 &rarr; Menu 14
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pengisian */}
      {showGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            PETUNJUK PENGISIAN USULAN PRIORITAS PENGAWASAN (MENU 11)
          </div>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>Otomatisasi Penuh dari Menu 8:</strong> Daftar seluruh objek pengawasan, OPD pengampu, dan total skor risiko langsung diambil dari hasil perhitungan Menu 8 (Penetapan Prioritas Program RPJMD). Fitur penambahan manual dinonaktifkan untuk menjaga integritas data berbasis risiko.
            </p>
            <p>
              2. <strong>Pengurutan Risiko Tertinggi:</strong> Data otomatis diurutkan dari skor risiko tertinggi ke terendah, dengan mandatori Permintaan Kepala Daerah (KDH) menduduki peringkat teratas (#1).
            </p>
            <p>
              3. <strong>Penetapan Bentuk / Jenis Pengawasan:</strong> Anda cukup memilih bentuk pengawasan yang tepat (seperti Audit Kinerja, Audit Kepatuhan, Reviu, Evaluasi, atau Monitoring) melalui dropdown pada kolom <em>Bentuk / Jenis Pengawasan</em>.
            </p>
          </div>
        </div>
      )}

      {/* STATE JIKA MENU 8 BELUM TERISI */}
      {!isMenu8Filled || data.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Menu 11 Belum Dapat Ditampilkan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menu 11 (Usulan Prioritas Pengawasan PBBR) hanya akan terisi otomatis setelah <strong>Menu 8 (Penetapan Prioritas Program RPJMD)</strong> selesai diisi dan dihitung.
            </p>
            <div className="pt-2">
              <button
                onClick={syncFromMenu8}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2 transition transform active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Periksa & Tarik Data dari Menu 8 Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: Filter Kategori & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Filter Kategori */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setFilterKategori('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterKategori === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({data.length})
              </button>
              <button
                onClick={() => setFilterKategori('Tinggi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterKategori === 'Tinggi'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Tinggi ({data.filter(d => d.kategoriPrioritas === 'Tinggi').length})
              </button>
              <button
                onClick={() => setFilterKategori('Sedang')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterKategori === 'Sedang'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                Sedang ({data.filter(d => d.kategoriPrioritas === 'Sedang').length})
              </button>
              <button
                onClick={() => setFilterKategori('Rendah')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterKategori === 'Rendah'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Rendah ({data.filter(d => d.kategoriPrioritas === 'Rendah').length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari program, OPD, atau jenis pengawasan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* TABEL USULAN PRIORITAS PENGAWASAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold tracking-wide">
                  DAFTAR USULAN PRIORITAS PENGAWASAN (DIURUTKAN DARI TOTAL RISIKO TERTINGGI)
                </h2>
              </div>
              <span className="text-xs text-blue-200 font-medium">
                Pilih Jenis Pengawasan pada setiap baris di bawah ini
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-center">
                    <th className="p-3 w-14 font-bold border-r border-slate-700">Urutan</th>
                    <th className="p-3 min-w-[240px] text-left font-semibold border-r border-slate-700">
                      Area / Objek Pengawasan (Program RPJMD Menu 8)
                    </th>
                    <th className="p-3 min-w-[180px] text-left font-semibold border-r border-slate-700">
                      OPD / Unit Pengampu
                    </th>
                    <th className="p-3 w-28 bg-blue-950 text-cyan-300 font-bold border-r border-blue-900">
                      Total Skor Risiko
                    </th>
                    <th className="p-3 w-24 font-semibold border-r border-slate-700">
                      Prioritas
                    </th>
                    <th className="p-3 min-w-[260px] text-left bg-indigo-950 text-indigo-200 font-bold border-r border-indigo-900">
                      Bentuk / Jenis Pengawasan (Input User)
                    </th>
                    <th className="p-3 w-24 text-center font-semibold border-r border-slate-700">
                      Mandays
                    </th>
                    <th className="p-3 w-20 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.map(item => {
                    const isHigh = item.skorRisiko >= 3.75;
                    const isKDH = item.skorRisiko === 5.0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition hover:bg-blue-50/40 ${
                          isKDH
                            ? 'bg-amber-50/60 border-l-4 border-amber-500'
                            : isHigh
                            ? 'bg-rose-50/30'
                            : ''
                        }`}
                      >
                        {/* Nomor Urut / Rank */}
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            isKDH
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md'
                              : item.no === 1
                              ? 'bg-blue-600 text-white shadow-sm'
                              : item.no === 2
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : item.no === 3
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isKDH ? <Crown className="w-3.5 h-3.5 text-amber-100" /> : item.no}
                          </span>
                        </td>

                        {/* Nama Program / Area Pengawasan */}
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{item.areaPengawasan}</span>
                            {isKDH && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                                Mandatori KDH
                              </span>
                            )}
                          </div>
                        </td>

                        {/* OPD Pengampu */}
                        <td className="p-3 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.opdPengampu}</span>
                          </div>
                        </td>

                        {/* Total Skor Risiko dari Menu 8 */}
                        <td className="p-3 text-center font-black text-blue-900 bg-blue-50/50 text-sm">
                          {isKDH ? '5.00' : item.skorRisiko.toFixed(2)}
                        </td>

                        {/* Kategori Prioritas */}
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase inline-flex items-center gap-1 ${
                            isKDH
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.kategoriPrioritas === 'Tinggi'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.kategoriPrioritas === 'Sedang'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isKDH ? 'Prioritas KDH' : item.kategoriPrioritas}
                          </span>
                        </td>

                        {/* Bentuk / Jenis Pengawasan - DROPDOWN LANGSUNG */}
                        <td className="p-3">
                          <select
                            value={item.jenisPengawasan}
                            onChange={e => handleUpdateJenisPengawasan(item, e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-400 rounded-xl text-xs font-semibold text-slate-800 transition"
                          >
                            {PILIHAN_JENIS_PENGAWASAN.map(jp => (
                              <option key={jp} value={jp}>
                                {jp}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Alokasi Mandays */}
                        <td className="p-3 text-center font-bold text-slate-800">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                            {item.alokasiMandays} Hari
                          </span>
                        </td>

                        {/* Aksi Edit */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setEditingItem({ ...item });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1"
                            title="Edit Jenis & Mandays"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Edit Khusus Jenis Pengawasan & Mandays */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Sesuaikan Pengawasan (#{editingItem.no})
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

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-400 block font-medium">Area / Objek Pengawasan</span>
                <span className="text-xs font-bold text-slate-900 block">{editingItem.areaPengawasan}</span>
                <span className="text-[11px] text-slate-600 block">OPD: {editingItem.opdPengampu}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bentuk / Jenis Pengawasan *
                </label>
                <select
                  value={editingItem.jenisPengawasan}
                  onChange={e => setEditingItem({ ...editingItem, jenisPengawasan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {PILIHAN_JENIS_PENGAWASAN.map(jp => (
                    <option key={jp} value={jp}>
                      {jp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alokasi Mandays (Hari Kerja) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={editingItem.alokasiMandays}
                  onChange={e => setEditingItem({ ...editingItem, alokasiMandays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
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
