import React, { useState } from 'react';
import { AreaMandatoryItem, INITIAL_MANDATORY } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { BookOpen, Plus, Trash2, Edit3, X, Info, FileSpreadsheet, FileText, Search, ShieldAlert, RotateCcw } from 'lucide-react';

export const AreaPengawasanMandatoryView: React.FC = () => {
  const [data, setData] = useState<AreaMandatoryItem[]>(() => {
    const saved = localStorage.getItem('ppbr_area_mandatory');
    return saved ? JSON.parse(saved) : INITIAL_MANDATORY;
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
  const [editingItem, setEditingItem] = useState<AreaMandatoryItem | null>(null);

  const [newItem, setNewItem] = useState<{
    areaPengawasan: string;
    dasarHukum: string;
    jenisPengawasan: string;
    alokasiMandays: number;
    keterangan: string;
  }>({
    areaPengawasan: '',
    dasarHukum: '',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 20,
    keterangan: 'Mandat Peraturan Perundang-undangan'
  });

  const handleSaveData = (newData: AreaMandatoryItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_area_mandatory', JSON.stringify(newData));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: AreaMandatoryItem = {
      id: `am-${Date.now()}`,
      no: data.length + 1,
      areaPengawasan: newItem.areaPengawasan,
      dasarHukum: newItem.dasarHukum,
      jenisPengawasan: newItem.jenisPengawasan,
      alokasiMandays: Number(newItem.alokasiMandays),
      keterangan: newItem.keterangan
    };

    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ areaPengawasan: '', dasarHukum: '', jenisPengawasan: 'Reviu', alokasiMandays: 20, keterangan: 'Mandat Peraturan' });
  };

  const handleOpenEdit = (item: AreaMandatoryItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const updatedItem: AreaMandatoryItem = {
      ...editingItem,
      alokasiMandays: Number(editingItem.alokasiMandays)
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  const requestDelete = (item: AreaMandatoryItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Area Pengawasan Mandatory?',
      message: 'Apakah Anda yakin ingin menghapus area pengawasan wajib ini?',
      detail: `Area: "${item.areaPengawasan}" | Jenis: ${item.jenisPengawasan} | Alokasi Mandays: ${item.alokasiMandays} hari`,
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
      title: 'Kosongkan Seluruh Tabel Area Mandatory?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan seluruh data (${data.length} item) pada tabel Area Pengawasan Mandatory?`,
      detail: 'Seluruh daftar penugasan wajib peraturan perundang-undangan dan alokasi mandays akan dibersihkan.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  const filteredData = data.filter(d =>
    (d.areaPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.dasarHukum || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.jenisPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMandays = data.reduce((acc, curr) => acc + curr.alokasiMandays, 0);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Area / Objek Pengawasan Mandatory', key: 'areaPengawasan', width: 35 },
      { header: 'Dasar Hukum / Regulasi Mandat', key: 'dasarHukum', width: 35 },
      { header: 'Bentuk / Jenis Pengawasan', key: 'jenisPengawasan', width: 28 },
      { header: 'Alokasi Mandays', key: 'alokasiMandays', width: 16 },
      { header: 'Keterangan', key: 'keterangan', width: 25 }
    ];

    exportToExcel(
      'Lampiran_11_Area_Pengawasan_Mandatory',
      'LAMPIRAN 11: AREA PENGAWASAN BERDASARKAN PERATURAN PERUNDANG-UNDANGAN (MANDATORY)',
      `Total Area: ${data.length} Objek | Total Mandays Mandatory: ${totalMandays} Hari Kerja`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Area Pengawasan Mandatory', 'Dasar Hukum Regulasi', 'Bentuk Pengawasan', 'Mandays', 'Keterangan'];
    const rows = filteredData.map(d => [
      d.no,
      d.areaPengawasan,
      d.dasarHukum,
      d.jenisPengawasan,
      `${d.alokasiMandays} Hari`,
      d.keterangan
    ]);

    exportToPdf(
      'Lampiran_11_Area_Pengawasan_Mandatory',
      'LAMPIRAN 11: AREA PENGAWASAN MANDATORY',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-rose-950 rounded-2xl p-6 text-white shadow-xl border border-red-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 11
              </span>
              <span className="text-xs text-red-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Area Pengawasan Wajib (Mandatory)
            </h1>
            <p className="text-sm text-red-100/80 mt-1 max-w-3xl">
              Inventarisasi seluruh penugasan pengawasan yang diwajibkan secara eksplisit oleh peraturan perundang-undangan (Perpres, Permendagri, Perka BPKP, dll) tanpa melalui seleksi faktor risiko.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-red-800/60 hover:bg-red-700/80 text-red-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-red-700/50"
            >
              <Info className="w-3.5 h-3.5 text-red-300" />
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
              className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-red-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Penugasan Wajib</span>
            <span className="text-lg font-bold text-white">{data.length} Objek</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Hari Kerja (Mandays)</span>
            <span className="text-lg font-bold text-amber-400">{totalMandays} Hari</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Sifat Penugasan</span>
            <span className="text-xs font-bold text-rose-300">Mandatory / Wajib Hukum</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Integrasi PKPT</span>
            <span className="text-xs font-bold text-emerald-400">100% Langsung Masuk PKPT</span>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
            <Info className="w-4 h-4 text-red-600" />
            PENJELASAN AREA PENGAWASAN MANDATORY
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. Area Pengawasan Mandatory adalah pengawasan yang <strong>wajib dilakukan APIP</strong> berdasarkan perintah UU, Peraturan Pemerintah, Permendagri, dll.</p>
            <p>2. Contoh Penugasan Mandatory: Reviu LKPD, Reviu LPPD, Reviu RKA/DPA APBD, Evaluasi Penyelenggaraan SPIP Terintegrasi, Penilaian Mandiri Reformasi Birokrasi (PMRB), dll.</p>
            <p>3. Area mandatory langsung dialokasikan kebutuhan mandays-nya dan dimasukkan ke dalam Usulan PKPT (Lampiran 12 & 14).</p>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari area mandatory atau regulasi..."
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
                <th className="p-3.5 font-semibold min-w-[240px]">Area / Objek Pengawasan Mandatory</th>
                <th className="p-3.5 font-semibold min-w-[220px]">Dasar Hukum / Regulasi Mandat</th>
                <th className="p-3.5 font-semibold w-40">Bentuk Pengawasan</th>
                <th className="p-3.5 font-semibold w-32 text-center">Alokasi Mandays</th>
                <th className="p-3.5 font-semibold min-w-[180px]">Keterangan</th>
                <th className="p-3.5 font-semibold w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-slate-500 font-medium">Belum ada data Area Pengawasan Mandatory.</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Data Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      {item.areaPengawasan}
                    </td>
                    <td className="p-3 text-slate-700 text-xs italic">{item.dasarHukum}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-semibold text-[11px] border border-slate-200">
                        {item.jenisPengawasan}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-red-900 bg-red-50/40">
                      {item.alokasiMandays} Hari
                    </td>
                    <td className="p-3 text-slate-600 text-xs">{item.keterangan}</td>
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
                <Plus className="w-4 h-4 text-red-600" />
                Tambah Area Pengawasan Mandatory
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Area / Penugasan Mandatory *</label>
                <input
                  type="text"
                  required
                  value={newItem.areaPengawasan}
                  onChange={e => setNewItem({ ...newItem, areaPengawasan: e.target.value })}
                  placeholder="Contoh: Reviu Laporan Keuangan Pemerintah Daerah (LKPD)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dasar Hukum / Regulasi Mandat *</label>
                <input
                  type="text"
                  required
                  value={newItem.dasarHukum}
                  onChange={e => setNewItem({ ...newItem, dasarHukum: e.target.value })}
                  placeholder="Contoh: Permendagri No. 4/2018 & SE BPKP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bentuk Pengawasan *</label>
                  <select
                    value={newItem.jenisPengawasan}
                    onChange={e => setNewItem({ ...newItem, jenisPengawasan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Audit Kinerja">Audit Kinerja</option>
                    <option value="Audit Ketaatan">Audit Ketaatan</option>
                    <option value="Reviu">Reviu</option>
                    <option value="Evaluasi">Evaluasi</option>
                    <option value="Pemantauan">Pemantauan</option>
                    <option value="Asistensi / Bimtek">Asistensi / Bimtek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.alokasiMandays}
                    onChange={e => setNewItem({ ...newItem, alokasiMandays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={newItem.keterangan}
                  onChange={e => setNewItem({ ...newItem, keterangan: e.target.value })}
                  placeholder="Catatan / Waktu pelaksanaan"
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Penugasan
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
                <Edit3 className="w-4 h-4 text-red-600" />
                Edit Penugasan Mandatory (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Area / Penugasan Mandatory *</label>
                <input
                  type="text"
                  required
                  value={editingItem.areaPengawasan}
                  onChange={e => setEditingItem({ ...editingItem, areaPengawasan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dasar Hukum / Regulasi Mandat *</label>
                <input
                  type="text"
                  required
                  value={editingItem.dasarHukum}
                  onChange={e => setEditingItem({ ...editingItem, dasarHukum: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bentuk Pengawasan *</label>
                  <select
                    value={editingItem.jenisPengawasan}
                    onChange={e => setEditingItem({ ...editingItem, jenisPengawasan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Audit Kinerja">Audit Kinerja</option>
                    <option value="Audit Ketaatan">Audit Ketaatan</option>
                    <option value="Reviu">Reviu</option>
                    <option value="Evaluasi">Evaluasi</option>
                    <option value="Pemantauan">Pemantauan</option>
                    <option value="Asistensi / Bimtek">Asistensi / Bimtek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingItem.alokasiMandays}
                    onChange={e => setEditingItem({ ...editingItem, alokasiMandays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={editingItem.keterangan}
                  onChange={e => setEditingItem({ ...editingItem, keterangan: e.target.value })}
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
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
