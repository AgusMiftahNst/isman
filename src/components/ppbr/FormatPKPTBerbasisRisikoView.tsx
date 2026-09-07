import React, { useState, useEffect } from 'react';
import { FormatPKPTItem, UsulanPrioritasPengawasanItem } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
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
  CheckCircle2,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';

export const FormatPKPTBerbasisRisikoView: React.FC = () => {
  // Ambil data Menu 11 (Usulan Prioritas Pengawasan PBBR)
  const getMenu11Data = (): UsulanPrioritasPengawasanItem[] => {
    const saved = localStorage.getItem('ppbr_usulan_pengawasan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error reading ppbr_usulan_pengawasan', e);
      }
    }
    return [];
  };

  const [data, setData] = useState<FormatPKPTItem[]>([]);
  const [isMenu11Filled, setIsMenu11Filled] = useState<boolean>(false);

  const [headerInfo, setHeaderInfo] = useState({
    tahun: '2025',
    namaInspektur: 'Drs. H. Ahmad Fauzi, M.Si, CGCAE',
    nipInspektur: '19750812 199903 1 004',
    namaBupati: 'Dr. Ir. Johanes Rettob, S.Sos, M.M',
    jabatanBupati: 'Bupati Mimika'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FormatPKPTItem | null>(null);

  // Jadwal kuartal default rotasi
  const JADWAL_LIST = [
    'Januari - Maret (TW I)',
    'April - Juni (TW II)',
    'Juli - September (TW III)',
    'Oktober - Desember (TW IV)'
  ];

  // Sinkronisasi otomatis dari Menu 11
  const syncFromMenu11 = () => {
    const m11List = getMenu11Data();

    if (m11List.length === 0) {
      setIsMenu11Filled(false);
      setData([]);
      localStorage.setItem('ppbr_pkpt_final', JSON.stringify([]));
      return;
    }

    setIsMenu11Filled(true);

    // Ambil penyesuaian detail PKPT sebelumnya jika ada
    let existingCustom = new Map<string, { jadwal: string; auditor: number; mandays: number; anggaran: number }>();
    const saved = localStorage.getItem('ppbr_pkpt_final');
    if (saved) {
      try {
        const parsed: FormatPKPTItem[] = JSON.parse(saved);
        parsed.forEach(item => {
          const key = (item.sasaranOPD + '::' + item.namaKegiatan).toLowerCase();
          existingCustom.set(key, {
            jadwal: item.jadwalBulan,
            auditor: item.timJumlahAuditor,
            mandays: item.alokasiMandays,
            anggaran: item.anggaranBiaya
          });
        });
      } catch (e) {
        console.error('Error reading ppbr_pkpt_final', e);
      }
    }

    const generatedPKPT: FormatPKPTItem[] = m11List.map((m11, idx) => {
      const namaKegiatan = `${m11.jenisPengawasan || 'Audit Kinerja Berbasis Risiko'} atas ${m11.areaPengawasan}`;
      const sasaranOPD = m11.opdPengampu || '-';
      const customKey = (sasaranOPD + '::' + namaKegiatan).toLowerCase();
      const existing = existingCustom.get(customKey);

      const defaultJadwal = existing?.jadwal || JADWAL_LIST[idx % JADWAL_LIST.length];
      const defaultAuditor = existing?.auditor || (m11.skorRisiko >= 4.5 ? 5 : m11.skorRisiko >= 3.5 ? 4 : 3);
      const defaultMandays = existing?.mandays || m11.alokasiMandays || 15;
      const defaultAnggaran = existing?.anggaran || defaultMandays * 2500000;

      return {
        id: `pkpt-${idx + 1}-${m11.id}`,
        no: idx + 1,
        kategoriKegiatan: 'A. KEGIATAN PENGAWASAN PRIORITAS RISIKO (PBBR)',
        namaKegiatan,
        sasaranOPD,
        jadwalBulan: defaultJadwal,
        timJumlahAuditor: defaultAuditor,
        alokasiMandays: defaultMandays,
        anggaranBiaya: defaultAnggaran
      };
    });

    setData(generatedPKPT);
    localStorage.setItem('ppbr_pkpt_final', JSON.stringify(generatedPKPT));
  };

  useEffect(() => {
    syncFromMenu11();
  }, []);

  const handleOpenEdit = (item: FormatPKPTItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedItem: FormatPKPTItem = {
      ...editingItem,
      timJumlahAuditor: Number(editingItem.timJumlahAuditor),
      alokasiMandays: Number(editingItem.alokasiMandays),
      anggaranBiaya: Number(editingItem.anggaranBiaya)
    };

    const updated = data.map(d => (d.id === updatedItem.id ? updatedItem : d));
    setData(updated);
    localStorage.setItem('ppbr_pkpt_final', JSON.stringify(updated));
    setShowEditModal(false);
    setEditingItem(null);
  };

  const filteredData = data.filter(
    d =>
      (d.namaKegiatan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.sasaranOPD || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.jadwalBulan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMandays = data.reduce((acc, curr) => acc + (Number(curr.alokasiMandays) || 0), 0);
  const totalAnggaran = data.reduce((acc, curr) => acc + (Number(curr.anggaranBiaya) || 0), 0);
  const totalAuditorPersonil = data.reduce((acc, curr) => acc + (Number(curr.timJumlahAuditor) || 0), 0);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kategori / Kelompok Penugasan', key: 'kategoriKegiatan', width: 38 },
      { header: 'Nama Penugasan / Kegiatan Pengawasan (Menu 11)', key: 'namaKegiatan', width: 42 },
      { header: 'Sasaran OPD / Unit Kerja (Menu 11)', key: 'sasaranOPD', width: 28 },
      { header: 'Rencana Jadwal Pelaksanaan', key: 'jadwalBulan', width: 26 },
      { header: 'Jumlah Personil Tim', key: 'timJumlahAuditor', width: 18 },
      { header: 'Alokasi Mandays', key: 'alokasiMandays', width: 16 },
      { header: 'Pagu Biaya (Rp)', key: 'anggaranBiaya', width: 22 }
    ];

    exportToExcel(
      `Lampiran_14_Format_PKPT_Berbasis_Risiko_Tahun_${headerInfo.tahun}`,
      `LAMPIRAN 14: FORMAT PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT) BERBASIS RISIKO TAHUN ${headerInfo.tahun}`,
      `Total Paket Kegiatan: ${data.length} Penugasan | Total Mandays: ${totalMandays} Hari Kerja | Total Anggaran: Rp ${totalAnggaran.toLocaleString('id-ID')}`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Kegiatan Pengawasan (Dari Menu 11)', 'Sasaran OPD', 'Jadwal', 'Personil', 'Mandays', 'Pagu Biaya'];
    const rows = filteredData.map(d => [
      d.no,
      d.namaKegiatan,
      d.sasaranOPD,
      d.jadwalBulan,
      `${d.timJumlahAuditor} Org`,
      `${d.alokasiMandays} Hari`,
      `Rp ${d.anggaranBiaya.toLocaleString('id-ID')}`
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
            <p className="text-sm text-indigo-100/80 mt-1 max-w-3xl">
              Menu ini terisi <strong>secara otomatis dari Menu 11</strong> (Usulan Prioritas Pengawasan PBBR). Setiap objek pengawasan beserta jenis pengawasannya yang telah ditentukan dikompilasikan ke dalam format resmi dokumen PKPT lengkap dengan jadwal dan alokasi sumber daya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={syncFromMenu11}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronkan Ulang dari Menu 11</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-indigo-800/60 hover:bg-indigo-700/80 text-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-700/50"
            >
              <Info className="w-3.5 h-3.5 text-indigo-300" />
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

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-800/40">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Paket Penugasan PKPT</span>
            <span className="text-xl font-black text-white mt-0.5 block">{data.length} Kegiatan</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-indigo-300 block font-medium">Alokasi Mandays Dibutuhkan</span>
            <span className="text-xl font-black text-indigo-300 mt-0.5 block">{totalMandays} Hari Kerja</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-emerald-300 block font-medium">Estimasi Pagu Anggaran</span>
            <span className="text-lg font-black text-emerald-300 mt-0.5 block">Rp {totalAnggaran.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-cyan-300 block font-medium">Koneksi Otomatis</span>
            <span className="text-xs text-cyan-200 mt-1 block font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Terkunci dari Menu 11
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pengisian */}
      {showGuide && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
            <Info className="w-4 h-4 text-indigo-600" />
            PETUNJUK PENGISIAN FORMAT PKPT BERBASIS RISIKO (MENU 14)
          </div>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>Otomatisasi Penuh dari Menu 11:</strong> Fitur tambah data manual telah dinonaktifkan. Seluruh daftar kegiatan pengawasan otomatis dibentuk berdasarkan <em>Area Pengawasan</em> dan <em>Bentuk / Jenis Pengawasan</em> yang telah dipilih di Menu 11.
            </p>
            <p>
              2. <strong>Penyesuaian Operasional Penugasan:</strong> Anda dapat menyesuaikan alokasi Jadwal Pelaksanaan (TW I s/d TW IV), Jumlah Personil Auditor, serta Estimasi Pagu Biaya pengawasan dengan mengklik tombol <em>Edit</em> pada baris penugasan yang bersangkutan.
            </p>
            <p>
              3. <strong>Legalitas Dokumen:</strong> Informasi pejabat penandatangan (Bupati & Inspektur) di bagian bawah dapat disesuaikan untuk kebutuhan pencetakan dan penetapan dokumen resmi.
            </p>
          </div>
        </div>
      )}

      {/* STATE JIKA MENU 11 BELUM TERISI */}
      {!isMenu11Filled || data.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Format PKPT Belum Dapat Ditampilkan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menu 14 (Format PKPT Berbasis Risiko) hanya akan terisi secara otomatis setelah <strong>Menu 11 (Usulan Prioritas Pengawasan PBBR)</strong> selesai diisi dan ditetapkan.
            </p>
            <div className="pt-2">
              <button
                onClick={syncFromMenu11}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2 transition transform active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Periksa & Tarik Data dari Menu 11 Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200">
                Tahun Anggaran: {headerInfo.tahun}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Total: <strong>{filteredData.length}</strong> kegiatan penugasan
              </span>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kegiatan, sasaran OPD, atau jadwal..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* TABEL FORMAT PKPT BERBASIS RISIKO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold tracking-wide">
                  TABEL PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT) BERBASIS RISIKO
                </h2>
              </div>
              <span className="text-xs text-indigo-200 font-medium">
                Otomatis bersumber dari Usulan Prioritas PBBR (Menu 11)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-center">
                    <th className="p-3 w-12 font-bold border-r border-slate-700">No</th>
                    <th className="p-3 min-w-[280px] text-left font-semibold border-r border-slate-700">
                      Nama Penugasan / Kegiatan Pengawasan (Menu 11)
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
                  {filteredData.map(item => (
                    <tr key={item.id} className="transition hover:bg-indigo-50/30">
                      {/* Nomor */}
                      <td className="p-3 text-center font-bold text-slate-600">
                        {item.no}
                      </td>

                      {/* Nama Kegiatan */}
                      <td className="p-3 font-bold text-slate-900">
                        <div className="space-y-0.5">
                          <span className="block text-indigo-950 font-bold">{item.namaKegiatan}</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                            {item.kategoriKegiatan}
                          </span>
                        </div>
                      </td>

                      {/* Sasaran OPD */}
                      <td className="p-3 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.sasaranOPD}</span>
                        </div>
                      </td>

                      {/* Jadwal Pelaksanaan */}
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          {item.jadwalBulan}
                        </span>
                      </td>

                      {/* Personil Tim */}
                      <td className="p-3 text-center font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {item.timJumlahAuditor} Orang
                        </span>
                      </td>

                      {/* Mandays */}
                      <td className="p-3 text-center font-bold text-indigo-900">
                        {item.alokasiMandays} Hari
                      </td>

                      {/* Anggaran Biaya */}
                      <td className="p-3 text-right font-black text-emerald-800">
                        Rp {item.anggaranBiaya.toLocaleString('id-ID')}
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
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3 text-right">
                      TOTAL PROGRAM KERJA PENGAWASAN TAHUNAN (PKPT):
                    </td>
                    <td className="p-3 text-center text-indigo-900">
                      {totalAuditorPersonil} Personil-Tugas
                    </td>
                    <td className="p-3 text-center text-indigo-900">
                      {totalMandays} Mandays
                    </td>
                    <td className="p-3 text-right text-emerald-800 text-sm">
                      Rp {totalAnggaran.toLocaleString('id-ID')}
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
                <span className="text-[11px] text-indigo-700 font-bold block">{editingItem.namaKegiatan}</span>
                <span className="text-xs text-slate-600 block">Sasaran OPD: {editingItem.sasaranOPD}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Jadwal Pelaksanaan *
                </label>
                <select
                  value={editingItem.jadwalBulan}
                  onChange={e => setEditingItem({ ...editingItem, jadwalBulan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
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
                    Personil Tim (Orang) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={15}
                    value={editingItem.timJumlahAuditor}
                    onChange={e => setEditingItem({ ...editingItem, timJumlahAuditor: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alokasi Mandays (Hari) *
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pagu Biaya Pengawasan (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500000}
                  value={editingItem.anggaranBiaya}
                  onChange={e => setEditingItem({ ...editingItem, anggaranBiaya: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-black text-emerald-800"
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
    </div>
  );
};
