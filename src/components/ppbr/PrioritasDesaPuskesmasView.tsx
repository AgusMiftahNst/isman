import React, { useState } from 'react';
import { PrioritasDesaPuskesmasItem, INITIAL_PRIORITAS_DESA_PUSKESMAS } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { Landmark, Plus, Trash2, Edit3, X, Info, FileSpreadsheet, FileText, Search, Trophy, RotateCcw } from 'lucide-react';

export const PrioritasDesaPuskesmasView: React.FC = () => {
  const [data, setData] = useState<PrioritasDesaPuskesmasItem[]>(() => {
    const saved = localStorage.getItem('ppbr_prioritas_desa_puskesmas');
    return saved ? JSON.parse(saved) : INITIAL_PRIORITAS_DESA_PUSKESMAS;
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

  const [tipeFilter, setTipeFilter] = useState<'all' | 'Desa' | 'Puskesmas' | 'Sekolah'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrioritasDesaPuskesmasItem | null>(null);

  const [newItem, setNewItem] = useState<{
    namaEntitas: string;
    tipe: 'Desa' | 'Puskesmas' | 'Sekolah';
    skalaAnggaran: number;
    skalaTemuan: number;
    skalaKompetensiSDM: number;
    skalaGeografis: number;
  }>({
    namaEntitas: '',
    tipe: 'Desa',
    skalaAnggaran: 4,
    skalaTemuan: 3,
    skalaKompetensiSDM: 3,
    skalaGeografis: 3
  });

  const calculateTotal = (
    skalaAnggaran: number,
    skalaTemuan: number,
    skalaSDM: number,
    skalaGeo: number
  ) => {
    const total = (Number(skalaAnggaran) * 0.35) + (Number(skalaTemuan) * 0.25) + (Number(skalaSDM) * 0.2) + (Number(skalaGeo) * 0.2);
    return parseFloat(total.toFixed(2));
  };

  const handleSaveData = (newData: PrioritasDesaPuskesmasItem[]) => {
    const sorted = [...newData].sort((a, b) => b.skorTotal - a.skorTotal);
    const withRank = sorted.map((item, idx) => ({ ...item, ranking: idx + 1, no: idx + 1 }));
    setData(withRank);
    localStorage.setItem('ppbr_prioritas_desa_puskesmas', JSON.stringify(withRank));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const total = calculateTotal(
      newItem.skalaAnggaran,
      newItem.skalaTemuan,
      newItem.skalaKompetensiSDM,
      newItem.skalaGeografis
    );

    const item: PrioritasDesaPuskesmasItem = {
      id: `pdp-${Date.now()}`,
      no: data.length + 1,
      namaEntitas: newItem.namaEntitas,
      tipe: newItem.tipe,
      skalaAnggaran: Number(newItem.skalaAnggaran),
      skalaTemuan: Number(newItem.skalaTemuan),
      skalaKompetensiSDM: Number(newItem.skalaKompetensiSDM),
      skalaGeografis: Number(newItem.skalaGeografis),
      skorTotal: total,
      ranking: 1
    };

    handleSaveData([...data, item]);
    setShowAddModal(false);
    setNewItem({
      namaEntitas: '',
      tipe: 'Desa',
      skalaAnggaran: 4,
      skalaTemuan: 3,
      skalaKompetensiSDM: 3,
      skalaGeografis: 3
    });
  };

  const handleOpenEdit = (item: PrioritasDesaPuskesmasItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const total = calculateTotal(
      editingItem.skalaAnggaran,
      editingItem.skalaTemuan,
      editingItem.skalaKompetensiSDM,
      editingItem.skalaGeografis
    );

    const updatedItem: PrioritasDesaPuskesmasItem = {
      ...editingItem,
      skorTotal: total
    };

    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  const requestDelete = (item: PrioritasDesaPuskesmasItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Entitas Prioritas?',
      message: 'Apakah Anda yakin ingin menghapus entitas/unit kerja ini dari daftar penilaian prioritas?',
      detail: `Entitas: "${item.namaEntitas}" | Tipe: ${item.tipe} | Skor Total: ${item.skorTotal.toFixed(2)} (Peringkat #${item.ranking})`,
      confirmText: 'Ya, Hapus Entitas',
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
      title: 'Kosongkan Seluruh Tabel Desa / Puskesmas / Sekolah?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan seluruh data (${data.length} entitas) pada tabel Prioritas Desa / Puskesmas / Sekolah?`,
      detail: 'Seluruh bobot scoring anggaran, temuan, SDM, dan aksesibilitas geografis akan dibersihkan.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  const filteredData = data.filter(d => {
    const matchType = tipeFilter === 'all' || d.tipe === tipeFilter;
    const matchSearch = (d.namaEntitas || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const handleExportExcel = () => {
    const cols = [
      { header: 'Rank', key: 'ranking', width: 8 },
      { header: 'Nama Entitas / Unit', key: 'namaEntitas', width: 32 },
      { header: 'Kategori', key: 'tipe', width: 16 },
      { header: 'Faktor Anggaran (35%)', key: 'skalaAnggaran', width: 22 },
      { header: 'Faktor Temuan (25%)', key: 'skalaTemuan', width: 20 },
      { header: 'Faktor SDM (20%)', key: 'skalaKompetensiSDM', width: 18 },
      { header: 'Faktor Geografis (20%)', key: 'skalaGeografis', width: 20 },
      { header: 'Skor Total Akhir', key: 'skorTotal', width: 18 }
    ];

    exportToExcel(
      'Lampiran_10_Prioritas_Desa_Puskesmas',
      'LAMPIRAN 10: PENETAPAN PRIORITAS DESA / PUSKESMAS / SEKOLAH',
      'Pembobotan Faktor Anggaran, Temuan, Kompetensi SDM, dan Aksesibilitas Geografis',
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['Rank', 'Nama Entitas', 'Kategori', 'Anggaran (35%)', 'Temuan (25%)', 'SDM (20%)', 'Geografis (20%)', 'Skor Total'];
    const rows = filteredData.map(d => [
      `#${d.ranking}`,
      d.namaEntitas,
      d.tipe,
      d.skalaAnggaran,
      d.skalaTemuan,
      d.skalaKompetensiSDM,
      d.skalaGeografis,
      d.skorTotal.toFixed(2)
    ]);

    exportToPdf(
      'Lampiran_10_Prioritas_Desa_Puskesmas',
      'LAMPIRAN 10: PENETAPAN PRIORITAS DESA / PUSKESMAS / SEKOLAH',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-teal-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 10
              </span>
              <span className="text-xs text-teal-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Penetapan Prioritas Desa, Puskesmas & Satuan Pendidikan
            </h1>
            <p className="text-sm text-teal-100/80 mt-1 max-w-3xl">
              Skoring risiko unit pelaksana teknis / entitas berbasis kewilayahan (Pemerintah Desa, BLUD Puskesmas, dan SMP/SD) berdasarkan porsi pagu, riwayat temuan, kapasitas SDM, dan tantangan geografis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-teal-800/60 hover:bg-teal-700/80 text-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-teal-700/50"
            >
              <Info className="w-3.5 h-3.5 text-teal-300" />
              <span>Petunjuk</span>
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
              className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
            {data.length > 0 && (
              <button
                onClick={requestResetData}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Kosongkan Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-teal-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Desa Dinilai</span>
            <span className="text-lg font-bold text-white">
              {data.filter(d => d.tipe === 'Desa').length} Desa
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Puskesmas</span>
            <span className="text-lg font-bold text-emerald-400">
              {data.filter(d => d.tipe === 'Puskesmas').length} Unit
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Satuan Pendidikan</span>
            <span className="text-lg font-bold text-cyan-300">
              {data.filter(d => d.tipe === 'Sekolah').length} Sekolah
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Top Entitas Prioritas</span>
            <span className="text-xs font-black text-amber-300 truncate block">
              {data.length > 0 ? `${data[0].namaEntitas} (${data[0].skorTotal})` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
            <Info className="w-4 h-4 text-teal-600" />
            FORMULA PEMBOBOTAN RISIKO DESA / PUSKESMAS / SEKOLAH
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. <strong>Besaran Pagu Anggaran (Bobot 35%)</strong>: Skala 1-5 berdasarkan total APBDes / Kapitasi JKN / Dana BOS.</p>
            <p>2. <strong>Riwayat Temuan / Laporan Masyarakat (Bobot 25%)</strong>: Skala 1-5 berdasarkan aduan masyarakat atau temuan audit sebelumnya.</p>
            <p>3. <strong>Kompetensi SDM & Sistem Keuangan (Bobot 20%)</strong>: Skala 1-5 (makin tinggi nilai jika SDM minim / Siskeudes/SIMDA belum tertib).</p>
            <p>4. <strong>Aksesibilitas Geografis (Bobot 20%)</strong>: Skala 1-5 (makin terpencil / sulit dijangkau, nilai makin tinggi).</p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['all', 'Desa', 'Puskesmas', 'Sekolah'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setTipeFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tipeFilter === tab
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'Semua Kategori' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama desa / puskesmas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-center">
                <th rowSpan={2} className="p-3 w-14 font-bold">Rank</th>
                <th rowSpan={2} className="p-3 min-w-[220px] text-left font-semibold">Nama Entitas / Unit Kerja</th>
                <th rowSpan={2} className="p-3 w-28 font-semibold">Kategori</th>
                <th colSpan={4} className="p-2 bg-slate-800 text-teal-300 font-bold border-b border-slate-700">
                  FAKTOR RISIKO PENILAIAN
                </th>
                <th rowSpan={2} className="p-3 w-28 bg-blue-950 text-cyan-300 font-black">
                  Skor Total
                </th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-300 text-center">
                <th className="p-2 w-28">Pagu (35%)</th>
                <th className="p-2 w-28">Temuan (25%)</th>
                <th className="p-2 w-28">SDM (20%)</th>
                <th className="p-2 w-28">Geografis (20%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-slate-500 font-medium">Belum ada data Prioritas Desa / Puskesmas / Sekolah.</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Data Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-teal-50/30 transition">
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                        item.ranking === 1
                          ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                          : item.ranking === 2
                          ? 'bg-slate-300 text-slate-900 shadow-sm'
                          : item.ranking === 3
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 font-bold'
                      }`}>
                        {item.ranking}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.namaEntitas}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.tipe === 'Desa'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.tipe === 'Puskesmas'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {item.tipe}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium text-slate-700">{item.skalaAnggaran}</td>
                    <td className="p-3 text-center font-medium text-slate-700">{item.skalaTemuan}</td>
                    <td className="p-3 text-center font-medium text-slate-700">{item.skalaKompetensiSDM}</td>
                    <td className="p-3 text-center font-medium text-slate-700">{item.skalaGeografis}</td>
                    <td className="p-3 text-center font-black text-blue-900 text-sm bg-blue-50/50">
                      {item.skorTotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Edit baris"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDelete(item)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                Tambah Entitas (Desa/Puskesmas/Sekolah)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Entitas / Unit *</label>
                <input
                  type="text"
                  required
                  value={newItem.namaEntitas}
                  onChange={e => setNewItem({ ...newItem, namaEntitas: e.target.value })}
                  placeholder="Contoh: Desa Tanjung Rejo / Puskesmas Sejahtera"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Entitas *</label>
                <select
                  value={newItem.tipe}
                  onChange={e => setNewItem({ ...newItem, tipe: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="Desa">Pemerintah Desa</option>
                  <option value="Puskesmas">Puskesmas / BLUD</option>
                  <option value="Sekolah">Satuan Pendidikan / Sekolah</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Pagu Anggaran (1-5)</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Riwayat Temuan (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaTemuan}
                    onChange={e => setNewItem({ ...newItem, skalaTemuan: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelemahan SDM/Sistem (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaKompetensiSDM}
                    onChange={e => setNewItem({ ...newItem, skalaKompetensiSDM: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tantangan Geografis (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newItem.skalaGeografis}
                    onChange={e => setNewItem({ ...newItem, skalaGeografis: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan & Hitung Rank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                Edit Entitas (#{editingItem.ranking})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Entitas / Unit *</label>
                <input
                  type="text"
                  required
                  value={editingItem.namaEntitas}
                  onChange={e => setEditingItem({ ...editingItem, namaEntitas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Entitas *</label>
                <select
                  value={editingItem.tipe}
                  onChange={e => setEditingItem({ ...editingItem, tipe: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="Desa">Pemerintah Desa</option>
                  <option value="Puskesmas">Puskesmas / BLUD</option>
                  <option value="Sekolah">Satuan Pendidikan / Sekolah</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Pagu Anggaran (1-5)</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Riwayat Temuan (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaTemuan}
                    onChange={e => setEditingItem({ ...editingItem, skalaTemuan: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelemahan SDM/Sistem (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaKompetensiSDM}
                    onChange={e => setEditingItem({ ...editingItem, skalaKompetensiSDM: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tantangan Geografis (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingItem.skalaGeografis}
                    onChange={e => setEditingItem({ ...editingItem, skalaGeografis: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
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
