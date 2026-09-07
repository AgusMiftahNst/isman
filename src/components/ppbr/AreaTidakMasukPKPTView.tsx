import React, { useState } from 'react';
import { AreaTidakMasukPKPTItem, INITIAL_TIDAK_MASUK_PKPT } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { Ban, Plus, Trash2, Edit3, X, Info, FileSpreadsheet, FileText, Search, RotateCcw } from 'lucide-react';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AreaTidakMasukPKPTItem | null>(null);

  const [newItem, setNewItem] = useState<{
    areaPengawasan: string;
    opdPengampu: string;
    skorRisiko: number;
    kategoriRisiko: string;
    alasanTidakMasuk: string;
    alternatifMitigasi: string;
  }>({
    areaPengawasan: '',
    opdPengampu: '',
    skorRisiko: 2.8,
    kategoriRisiko: 'Sedang',
    alasanTidakMasuk: 'Keterbatasan jumlah auditor dan alokasi anggaran operasional',
    alternatifMitigasi: 'Asistensi mandiri dan dijadwalkan pada PKPT tahun berikutnya'
  });

  const handleSaveData = (newData: AreaTidakMasukPKPTItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_tidak_masuk_pkpt', JSON.stringify(newData));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: AreaTidakMasukPKPTItem = {
      id: `atmp-${Date.now()}`,
      no: data.length + 1,
      areaPengawasan: newItem.areaPengawasan,
      opdPengampu: newItem.opdPengampu,
      skorRisiko: Number(newItem.skorRisiko),
      kategoriRisiko: newItem.kategoriRisiko,
      alasanTidakMasuk: newItem.alasanTidakMasuk,
      alternatifMitigasi: newItem.alternatifMitigasi
    };

    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({
      areaPengawasan: '',
      opdPengampu: '',
      skorRisiko: 2.8,
      kategoriRisiko: 'Sedang',
      alasanTidakMasuk: 'Keterbatasan jumlah auditor dan alokasi anggaran operasional',
      alternatifMitigasi: 'Asistensi mandiri dan dijadwalkan pada PKPT tahun berikutnya'
    });
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
  };

  const requestDelete = (item: AreaTidakMasukPKPTItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Area Non-PKPT?',
      message: 'Apakah Anda yakin ingin menghapus area ini dari daftar pengawasan yang tidak dapat masuk PKPT?',
      detail: `Area: "${item.areaPengawasan}" | OPD: ${item.opdPengampu} | Alasan: ${item.alasanTidakMasuk}`,
      confirmText: 'Ya, Hapus Area',
      variant: 'danger',
      onConfirm: () => {
        const updated = data.filter(d => d.id !== item.id).map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Area Non-PKPT?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan seluruh data (${data.length} item) pada tabel Area yang Tidak Dapat Masuk PKPT?`,
      detail: 'Seluruh pencatatan objek risiko non-prioritas dan alternatif mitigasi akan dibersihkan.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  const filteredData = data.filter(d =>
    (d.areaPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.alasanTidakMasuk || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Area / Objek Pengawasan', key: 'areaPengawasan', width: 35 },
      { header: 'OPD Pengampu', key: 'opdPengampu', width: 28 },
      { header: 'Skor Risiko', key: 'skorRisiko', width: 14 },
      { header: 'Kategori', key: 'kategoriRisiko', width: 16 },
      { header: 'Alasan Tidak Dapat Masuk PKPT', key: 'alasanTidakMasuk', width: 38 },
      { header: 'Alternatif Pengawasan / Mitigasi Risiko', key: 'alternatifMitigasi', width: 38 }
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
      d.skorRisiko.toFixed(2),
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
            <p className="text-sm text-stone-300/80 mt-1 max-w-3xl">
              Dokumentasi transparansi dan akuntabilitas APIP mengenai objek atau kegiatan berisiko yang tidak tercover dalam PKPT tahun berjalan akibat keterbatasan sumber daya pengawasan (mandays & anggaran).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-stone-700"
            >
              <Info className="w-3.5 h-3.5 text-stone-300" />
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-700/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Area Non-PKPT</span>
            <span className="text-lg font-bold text-white">{data.length} Objek</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Status Akuntabilitas</span>
            <span className="text-xs font-bold text-amber-400">Didokumentasikan Resmi</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Penyebab Dominan</span>
            <span className="text-xs font-bold text-stone-200">Keterbatasan Mandays APIP</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Solusi Pengganti</span>
            <span className="text-xs font-bold text-cyan-300">Asistensi & PKPT Thn Depan</span>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-stone-100 border border-stone-300 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <Info className="w-4 h-4 text-stone-700" />
            PENJELASAN LAMPIRAN AREA TIDAK MASUK PKPT
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. Standar Audit APIP mensyaratkan Inspektorat mendokumentasikan area berisiko yang tidak dapat diaudit karena keterbatasan sumber daya.</p>
            <p>2. Daftar ini dilaporkan kepada Kepala Daerah sebagai dasar pertimbangan mitigasi risiko manajerial atau penambahan alokasi sumber daya APIP.</p>
            <p>3. Setiap entitas harus disertai alternatif solusi (misal: self-assessment, bimtek, atau prioritas tahun depan).</p>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari area atau alasan tidak masuk PKPT..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3.5 text-center w-12 font-semibold">No</th>
                <th className="p-3.5 font-semibold min-w-[220px]">Area / Objek Pengawasan</th>
                <th className="p-3.5 font-semibold min-w-[180px]">OPD Pengampu</th>
                <th className="p-3.5 font-semibold w-24 text-center">Skor Risiko</th>
                <th className="p-3.5 font-semibold min-w-[240px]">Alasan Tidak Dapat Masuk PKPT</th>
                <th className="p-3.5 font-semibold min-w-[240px]">Alternatif Mitigasi / Pengawasan</th>
                <th className="p-3.5 font-semibold w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-slate-500 font-medium">Belum ada data Area yang Tidak Dapat Masuk PKPT.</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Data Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    <td className="p-3 font-bold text-slate-900">{item.areaPengawasan}</td>
                    <td className="p-3 text-slate-700">{item.opdPengampu}</td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {item.skorRisiko.toFixed(2)}
                    </td>
                    <td className="p-3 text-rose-800 bg-rose-50/30 text-xs">
                      {item.alasanTidakMasuk}
                    </td>
                    <td className="p-3 text-slate-800 text-xs font-medium">
                      {item.alternatifMitigasi}
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
                <Plus className="w-4 h-4 text-amber-600" />
                Tambah Area Non-PKPT
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Area / Objek Pengawasan *</label>
                <input
                  type="text"
                  required
                  value={newItem.areaPengawasan}
                  onChange={e => setNewItem({ ...newItem, areaPengawasan: e.target.value })}
                  placeholder="Contoh: Audit Operasional RSUD Cabang..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">OPD / Unit Pengampu *</label>
                <input
                  type="text"
                  required
                  value={newItem.opdPengampu}
                  onChange={e => setNewItem({ ...newItem, opdPengampu: e.target.value })}
                  placeholder="Contoh: Dinas Kesehatan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skor Risiko (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={newItem.skorRisiko}
                    onChange={e => setNewItem({ ...newItem, skorRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Risiko</label>
                  <select
                    value={newItem.kategoriRisiko}
                    onChange={e => setNewItem({ ...newItem, kategoriRisiko: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Tidak Dapat Masuk PKPT *</label>
                <textarea
                  rows={2}
                  required
                  value={newItem.alasanTidakMasuk}
                  onChange={e => setNewItem({ ...newItem, alasanTidakMasuk: e.target.value })}
                  placeholder="Jelaskan alasan keterbatasan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternatif Mitigasi / Pengawasan *</label>
                <textarea
                  rows={2}
                  required
                  value={newItem.alternatifMitigasi}
                  onChange={e => setNewItem({ ...newItem, alternatifMitigasi: e.target.value })}
                  placeholder="Tindakan mitigasi atau asistensi mandiri..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Data
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
                <Edit3 className="w-4 h-4 text-amber-600" />
                Edit Area Non-PKPT (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Area / Objek Pengawasan *</label>
                <input
                  type="text"
                  required
                  value={editingItem.areaPengawasan}
                  onChange={e => setEditingItem({ ...editingItem, areaPengawasan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">OPD / Unit Pengampu *</label>
                <input
                  type="text"
                  required
                  value={editingItem.opdPengampu}
                  onChange={e => setEditingItem({ ...editingItem, opdPengampu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skor Risiko (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingItem.skorRisiko}
                    onChange={e => setEditingItem({ ...editingItem, skorRisiko: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Risiko</label>
                  <select
                    value={editingItem.kategoriRisiko}
                    onChange={e => setEditingItem({ ...editingItem, kategoriRisiko: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Tidak Dapat Masuk PKPT *</label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.alasanTidakMasuk}
                  onChange={e => setEditingItem({ ...editingItem, alasanTidakMasuk: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternatif Mitigasi / Pengawasan *</label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.alternatifMitigasi}
                  onChange={e => setEditingItem({ ...editingItem, alternatifMitigasi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
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
