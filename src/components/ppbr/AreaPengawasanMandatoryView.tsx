import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaMandatoryItem } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import {
  getScopedKey,
  getScopedPPBRDocId,
  getScopedPPBRCollectionName,
  getSelectedYear,
  DEFAULT_YEAR,
  isPPBRAdminUser
} from './ppbrYearHelper';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  X,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldAlert,
  Cloud,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  HardDrive,
  Copy,
  Sparkles
} from 'lucide-react';

export const DEFAULT_BENTUK_PENGAWASAN_MANDATORY = [
  'Reviu',
  'Monitoring',
  'Evaluasi',
  'Pemantauan',
  'Audit Kinerja',
  'Audit Ketaatan',
  'Asistensi / Bimtek'
];

export const STANDARD_MANDATORY_RECOMMENDATIONS: AreaMandatoryItem[] = [
  {
    id: 'am-std-1',
    no: 1,
    areaPengawasan: 'Reviu Laporan Keuangan Pemerintah Daerah (LKPD)',
    dasarHukum: 'UU No. 17/2003, UU No. 23/2014 & Permendagri No. 4/2018',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 25,
    keterangan: 'Wajib Semester I (Sebelum diserahkan ke BPK)'
  },
  {
    id: 'am-std-2',
    no: 2,
    areaPengawasan: 'Reviu Laporan Penyelenggaraan Pemerintahan Daerah (LPPD)',
    dasarHukum: 'PP No. 13/2019 & Permendagri No. 18/2020',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 20,
    keterangan: 'Mandat Tahunan (Maksimal Akhir Maret)'
  },
  {
    id: 'am-std-3',
    no: 3,
    areaPengawasan: 'Reviu Rencana Kerja dan Anggaran (RKA) & Perubahan APBD',
    dasarHukum: 'Permendagri Pedoman Penyusunan APBD Tahunan',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 25,
    keterangan: 'Tahap Pembahasan TAPD & Badan Anggaran DPRD'
  },
  {
    id: 'am-std-4',
    no: 4,
    areaPengawasan: 'Evaluasi Penyelenggaraan SPIP Terintegrasi',
    dasarHukum: 'PP No. 60/2008 & Perka BPKP No. 5/2021',
    jenisPengawasan: 'Evaluasi',
    alokasiMandays: 30,
    keterangan: 'Penilaian Mandiri & Penjaminan Kualitas (QA) Level Maturitas'
  },
  {
    id: 'am-std-5',
    no: 5,
    areaPengawasan: 'Penilaian Mandiri Reformasi Birokrasi (PMRB)',
    dasarHukum: 'PermenPAN-RB No. 3/2023 tentang Roadmap Reformasi Birokrasi',
    jenisPengawasan: 'Evaluasi',
    alokasiMandays: 20,
    keterangan: 'Evaluasi RB Tematik & RB General Perangkat Daerah'
  },
  {
    id: 'am-std-6',
    no: 6,
    areaPengawasan: 'Pemantauan Tindak Lanjut Rekomendasi Hasil Pemeriksaan (TLHP) BPK & Inspektorat',
    dasarHukum: 'UU No. 15/2004 & Permendagri No. 133/2018',
    jenisPengawasan: 'Pemantauan',
    alokasiMandays: 20,
    keterangan: 'Pemantauan Semesteran & Gelar Pengawasan Daerah'
  },
  {
    id: 'am-std-7',
    no: 7,
    areaPengawasan: 'Reviu Penyerapan Anggaran dan Pengadaan Barang/Jasa (PBJ)',
    dasarHukum: 'Instruksi Presiden No. 2/2022 & SE Bersama BPKP/Kemendagri',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 15,
    keterangan: 'Triwulanan / Berkala untuk Percepatan Realisasi'
  },
  {
    id: 'am-std-8',
    no: 8,
    areaPengawasan: 'Reviu Penyaluran dan Pemanfaatan Dana Alokasi Khusus (DAK)',
    dasarHukum: 'PMK Pengelolaan DAK Fisik & Non Fisik',
    jenisPengawasan: 'Reviu',
    alokasiMandays: 15,
    keterangan: 'Syarat Salur Penyaluran KPPN per Tahap'
  }
];

export interface AreaPengawasanMandatoryViewProps {
  isAdmin?: boolean;
  year?: string;
}

export const AreaPengawasanMandatoryView: React.FC<AreaPengawasanMandatoryViewProps> = ({ isAdmin: isAdminProp, year }) => {
  const currentYear = year || getSelectedYear();
  const storageKey = getScopedKey('ppbr_area_mandatory', currentYear);
  const docId = getScopedPPBRDocId('area_mandatory', currentYear);
  const rowCollectionName = getScopedPPBRCollectionName('mandatory', currentYear);

  const isAdmin = isPPBRAdminUser() && (isAdminProp ?? true);

  // Main data state loaded from localStorage initially
  const [data, setData] = useState<AreaMandatoryItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse ' + storageKey, e);
      }
    }
    return currentYear === DEFAULT_YEAR ? STANDARD_MANDATORY_RECOMMENDATIONS : [];
  });

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference to current data and known row IDs to track deletions cleanly
  const dataRef = useRef<AreaMandatoryItem[]>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const prevKnownRowIdsRef = useRef<string[]>(data.map(d => d.id));

  // Modals & UI Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AreaMandatoryItem | null>(null);

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

  const [newItem, setNewItem] = useState<{
    areaPengawasan: string;
    dasarHukum: string;
    jenisPengawasan: string;
    alokasiMandays: number;
    keterangan: string;
  }>({
    areaPengawasan: '',
    dasarHukum: '',
    jenisPengawasan: 'Monitoring',
    alokasiMandays: 20,
    keterangan: 'Mandat Peraturan Perundang-undangan'
  });

  // Custom options state for dropdown
  const [customBentukList, setCustomBentukList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ppbr_m12_custom_bentuk_pengawasan');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        }
      }
    } catch (_) {}
    return [];
  });

  const availableBentukOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_BENTUK_PENGAWASAN_MANDATORY);
    customBentukList.forEach(opt => {
      if (opt && opt.trim()) set.add(opt.trim());
    });
    data.forEach(item => {
      if (item.jenisPengawasan && item.jenisPengawasan.trim()) {
        set.add(item.jenisPengawasan.trim());
      }
    });
    return Array.from(set);
  }, [customBentukList, data]);

  const [quickNewOptionAdd, setQuickNewOptionAdd] = useState('');
  const [quickNewOptionEdit, setQuickNewOptionEdit] = useState('');
  const [optionSuccessMsg, setOptionSuccessMsg] = useState<string | null>(null);
  const [isCustomBentukAdd, setIsCustomBentukAdd] = useState(false);
  const [customBentukAddInput, setCustomBentukAddInput] = useState('');
  const [isCustomBentukEdit, setIsCustomBentukEdit] = useState(false);
  const [customBentukEditInput, setCustomBentukEditInput] = useState('');

  // Row-Level Real-time Firestore Sync (Identical to RSO/ROO)
  useEffect(() => {
    let isMounted = true;
    const colRef = collection(db, rowCollectionName);
    let isSeeding = false;

    const unsubRows = onSnapshot(colRef, async (snap) => {
      if (!isMounted) return;

      // Jika koleksi baris belum ada di Firestore, migrasikan data secara otomatis
      if (snap.empty && !isSeeding) {
        isSeeding = true;
        let seedRows: AreaMandatoryItem[] = [];
        try {
          const legacySnap = await getDoc(doc(db, 'ppbr_data', docId));
          if (legacySnap.exists() && Array.isArray(legacySnap.data()?.items) && legacySnap.data()?.items.length > 0) {
            seedRows = legacySnap.data()!.items;
          }
        } catch (e) {
          console.warn('Legacy mandatory ppbr_data fetch warning:', e);
        }

        if (seedRows.length === 0) {
          const local = localStorage.getItem(storageKey);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) seedRows = parsed;
            } catch (_) {}
          }
        }

        if (seedRows.length === 0 && currentYear === DEFAULT_YEAR) {
          seedRows = STANDARD_MANDATORY_RECOMMENDATIONS;
        }

        if (seedRows.length > 0) {
          setCloudStatus('saving');
          try {
            for (let i = 0; i < seedRows.length; i += 200) {
              const chunk = seedRows.slice(i, i + 200);
              const batch = writeBatch(db);
              chunk.forEach((item, cIdx) => {
                const rowId = item.id || `am-${i + cIdx + 1}`;
                const cleanItem: AreaMandatoryItem = {
                  ...item,
                  id: rowId,
                  no: item.no || i + cIdx + 1,
                  alokasiMandays: Number(item.alokasiMandays) || 0
                };
                batch.set(doc(db, rowCollectionName, rowId), cleanItem);
              });
              await batch.commit();
            }
            setData(seedRows);
            dataRef.current = seedRows;
            prevKnownRowIdsRef.current = seedRows.map(r => r.id);
            try {
              localStorage.setItem(storageKey, JSON.stringify(seedRows));
            } catch (_) {}
            setCloudStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          } catch (err) {
            console.warn('Seeding mandatory error:', err);
            setCloudStatus('offline');
          }
        }
        return;
      }

      // Koleksi sudah terisi: mapping langsung baris-baris dokumen per row
      const rows: AreaMandatoryItem[] = [];
      snap.forEach(d => {
        const dData = d.data() as AreaMandatoryItem;
        rows.push({
          ...dData,
          id: d.id,
          no: Number(dData.no) || 0,
          alokasiMandays: Number(dData.alokasiMandays) || 0
        });
      });
      rows.sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0) || String(a.id || '').localeCompare(String(b.id || '')));

      prevKnownRowIdsRef.current = rows.map(r => r.id);
      setData(rows);
      dataRef.current = rows;
      try {
        localStorage.setItem(storageKey, JSON.stringify(rows));
      } catch (_) {}
      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, (err) => {
      console.warn('Firestore Area Mandatory listener warning:', err?.message || err);
      setCloudStatus('offline');
    });

    // Custom options listener from Firestore
    const customOptDocRef = doc(db, 'ppbr_data', `${docId}_custom_options`);
    const unsubCustom = onSnapshot(customOptDocRef, (snap) => {
      if (snap.exists()) {
        const list = snap.data()?.options;
        if (Array.isArray(list) && list.length > 0) {
          setCustomBentukList(list);
          try {
            localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(list));
          } catch (_) {}
        }
      }
    }, () => {});

    return () => {
      isMounted = false;
      unsubRows();
      unsubCustom();
    };
  }, [rowCollectionName, docId, storageKey, currentYear]);

  // Save new custom bentuk option
  const saveNewBentukOption = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!DEFAULT_BENTUK_PENGAWASAN_MANDATORY.includes(trimmed) && !customBentukList.includes(trimmed)) {
      const updated = [...customBentukList, trimmed];
      setCustomBentukList(updated);
      try {
        localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(updated));
      } catch (_) {}
      try {
        await setDoc(doc(db, 'ppbr_data', `${docId}_custom_options`), {
          options: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Sync custom bentuk option warning:', err);
      }
    }
  };

  const handleAddNewCustomOptionDirectly = (val: string, targetModal: 'add' | 'edit') => {
    const trimmed = val.trim();
    if (!trimmed) return;

    saveNewBentukOption(trimmed);

    if (targetModal === 'add') {
      setNewItem(prev => ({ ...prev, jenisPengawasan: trimmed }));
      setIsCustomBentukAdd(false);
      setCustomBentukAddInput('');
      setQuickNewOptionAdd('');
    } else if (targetModal === 'edit') {
      setEditingItem(prev => prev ? ({ ...prev, jenisPengawasan: trimmed }) : null);
      setIsCustomBentukEdit(false);
      setCustomBentukEditInput('');
      setQuickNewOptionEdit('');
    }

    setOptionSuccessMsg(`✓ Bentuk pengawasan "${trimmed}" berhasil ditambahkan ke dropdown!`);
    setTimeout(() => {
      setOptionSuccessMsg(null);
    }, 4000);
  };

  const handleDeleteCustomOption = (optToDelete: string) => {
    const updated = customBentukList.filter(o => o !== optToDelete);
    setCustomBentukList(updated);
    try {
      localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(updated));
    } catch (_) {}
    setDoc(doc(db, 'ppbr_data', `${docId}_custom_options`), {
      options: updated,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => {
      console.warn('Sync custom options deletion to cloud warning:', err);
    });
  };

  const handleOpenAddModal = () => {
    setIsCustomBentukAdd(false);
    setCustomBentukAddInput('');
    setQuickNewOptionAdd('');
    setOptionSuccessMsg(null);
    setNewItem({
      areaPengawasan: '',
      dasarHukum: '',
      jenisPengawasan: 'Monitoring',
      alokasiMandays: 20,
      keterangan: 'Mandat Peraturan Perundang-undangan'
    });
    setShowAddModal(true);
  };

  // Row-level batch save for multi-item operations (import, reset, load standard, renumber)
  const handleSaveData = async (newData: AreaMandatoryItem[]) => {
    setData(newData);
    dataRef.current = newData;
    try {
      localStorage.setItem(storageKey, JSON.stringify(newData));
    } catch (_) {}

    setCloudStatus('saving');
    try {
      const newIdSet = new Set(newData.map(d => d.id));
      const deletedIds = prevKnownRowIdsRef.current.filter(id => !newIdSet.has(id));
      prevKnownRowIdsRef.current = newData.map(d => d.id);

      // 1. Hapus dokumen baris yang dihapus
      if (deletedIds.length > 0) {
        for (let i = 0; i < deletedIds.length; i += 200) {
          const chunk = deletedIds.slice(i, i + 200);
          const delBatch = writeBatch(db);
          chunk.forEach(id => delBatch.delete(doc(db, rowCollectionName, id)));
          await delBatch.commit();
        }
      }

      // 2. Simpan/perbarui baris dalam batch
      for (let i = 0; i < newData.length; i += 200) {
        const chunk = newData.slice(i, i + 200);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, rowCollectionName, item.id), item);
        });
        await batch.commit();
      }

      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Save data error:', err);
      setCloudStatus('offline');
    }
  };

  // Manual trigger: pull from Firestore
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setCloudStatus('saving');
    try {
      const snap = await getDocs(collection(db, rowCollectionName));
      if (!snap.empty) {
        const rows: AreaMandatoryItem[] = [];
        snap.forEach(d => {
          const dData = d.data() as AreaMandatoryItem;
          rows.push({ ...dData, id: d.id, no: Number(dData.no) || 0, alokasiMandays: Number(dData.alokasiMandays) || 0 });
        });
        rows.sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0) || String(a.id || '').localeCompare(String(b.id || '')));
        setData(rows);
        dataRef.current = rows;
        try {
          localStorage.setItem(storageKey, JSON.stringify(rows));
        } catch (_) {}
      }
      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Manual sync warning:', e);
      setCloudStatus('offline');
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Export current data as a JSON file
  const handleDownloadBackupJson = (itemsToDownload: AreaMandatoryItem[], filename = 'area_mandatory_backup.json') => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(itemsToDownload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportJson = () => {
    handleDownloadBackupJson(data, `area_mandatory_backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  // Import data from a JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setConfirmModal({
            isOpen: true,
            title: 'Impor Data Area Mandatory?',
            message: `File ini berisi ${parsed.length} objek pengawasan wajib. Apakah Anda ingin mengimpor data ini dan menyinkronkannya ke Cloud untuk seluruh tim? Data di tabel saat ini akan digantikan.`,
            confirmText: 'Ya, Impor & Sinkronkan',
            variant: 'info',
            onConfirm: () => {
              const mapped: AreaMandatoryItem[] = parsed.map((item: any, idx: number) => ({
                id: item.id || `am-${Date.now()}-${idx}`,
                no: idx + 1,
                areaPengawasan: item.areaPengawasan || '',
                dasarHukum: item.dasarHukum || '',
                jenisPengawasan: item.jenisPengawasan || 'Reviu',
                alokasiMandays: Number(item.alokasiMandays) || 20,
                keterangan: item.keterangan || ''
              }));
              handleSaveData(mapped);
              setShowStorageModal(false);
            }
          });
        } else {
          alert('Format file JSON tidak valid. Pastikan file berisi array data.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON. Pastikan file JSON dalam format yang benar.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load standard mandatory recommendations
  const handleLoadStandardRecommendations = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Muat Rekomendasi Area Mandatory Standar?',
      message: `Akan dimuat ${STANDARD_MANDATORY_RECOMMENDATIONS.length} objek pengawasan wajib regulasi perundang-undangan standar (Reviu LKPD, LPPD, RKA APBD, Evaluasi SPIP, PMRB, TLHP BPK, Penyerapan Anggaran PBJ, DAK).`,
      confirmText: 'Ya, Muat Standar Regulasi',
      variant: 'info',
      onConfirm: () => {
        handleSaveData(STANDARD_MANDATORY_RECOMMENDATIONS);
        setShowStorageModal(false);
      }
    });
  };

  // Add single item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedJenis = isCustomBentukAdd
      ? (customBentukAddInput.trim() || 'Monitoring')
      : newItem.jenisPengawasan;

    if (selectedJenis && selectedJenis.trim()) {
      saveNewBentukOption(selectedJenis);
    }

    const item: AreaMandatoryItem = {
      id: `am-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      areaPengawasan: newItem.areaPengawasan,
      dasarHukum: newItem.dasarHukum,
      jenisPengawasan: selectedJenis,
      alokasiMandays: Number(newItem.alokasiMandays),
      keterangan: newItem.keterangan
    };

    const updated = [...data, item];
    setData(updated);
    dataRef.current = updated;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    setCloudStatus('saving');
    try {
      await setDoc(doc(db, rowCollectionName, item.id), item);
      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Save row error:', err);
      setCloudStatus('offline');
    }

    setShowAddModal(false);
    setIsCustomBentukAdd(false);
    setCustomBentukAddInput('');
    setNewItem({ areaPengawasan: '', dasarHukum: '', jenisPengawasan: 'Monitoring', alokasiMandays: 20, keterangan: 'Mandat Peraturan Perundang-undangan' });
  };

  const handleAddMultipleRows = (count: number) => {
    const newRows: AreaMandatoryItem[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `am-${baseTime + i}-${Math.random().toString(36).substring(2, 6)}`,
        no: data.length + i + 1,
        areaPengawasan: `Penugasan Mandatory ${data.length + i + 1}`,
        dasarHukum: 'Peraturan Perundang-undangan',
        jenisPengawasan: 'Monitoring',
        alokasiMandays: 15,
        keterangan: 'Rencana Pengawasan Tahunan'
      });
    }
    const updated = [...data, ...newRows];
    handleSaveData(updated);
  };

  const handleDuplicateRow = (item: AreaMandatoryItem) => {
    const duplicate: AreaMandatoryItem = {
      ...item,
      id: `am-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      areaPengawasan: `${item.areaPengawasan} (Salinan)`
    };
    const updated = [...data, duplicate];
    handleSaveData(updated);
  };

  const handleOpenEdit = (item: AreaMandatoryItem) => {
    setEditingItem({ ...item });
    setIsCustomBentukEdit(false);
    setCustomBentukEditInput('');
    setQuickNewOptionEdit('');
    setOptionSuccessMsg(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const selectedJenis = isCustomBentukEdit
      ? (customBentukEditInput.trim() || editingItem.jenisPengawasan || 'Monitoring')
      : editingItem.jenisPengawasan;

    if (selectedJenis && selectedJenis.trim()) {
      saveNewBentukOption(selectedJenis);
    }

    const updatedItem: AreaMandatoryItem = {
      ...editingItem,
      jenisPengawasan: selectedJenis,
      alokasiMandays: Number(editingItem.alokasiMandays)
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    setData(updated);
    dataRef.current = updated;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    setCloudStatus('saving');
    try {
      await setDoc(doc(db, rowCollectionName, updatedItem.id), updatedItem, { merge: true });
      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Update row error:', err);
      setCloudStatus('offline');
    }

    setShowEditModal(false);
    setIsCustomBentukEdit(false);
    setCustomBentukEditInput('');
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
      onConfirm: async () => {
        const updated = data.filter(d => d.id !== item.id).map((d, idx) => ({ ...d, no: idx + 1 }));
        setData(updated);
        dataRef.current = updated;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (_) {}

        setCloudStatus('saving');
        try {
          await deleteDoc(doc(db, rowCollectionName, item.id));
          if (updated.length > 0) {
            const batch = writeBatch(db);
            updated.forEach(u => batch.update(doc(db, rowCollectionName, u.id), { no: u.no }));
            await batch.commit();
          }
          setCloudStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (err) {
          console.warn('Delete row error:', err);
          setCloudStatus('offline');
        }
      }
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Area Mandatory?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan seluruh data (${data.length} item) pada tabel Area Pengawasan Mandatory?`,
      detail: 'Seluruh daftar penugasan wajib peraturan perundang-undangan dan alokasi mandays akan dibersihkan dari layar dan Cloud.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  const filteredData = [...data]
    .sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0) || String(a.id || '').localeCompare(String(b.id || '')))
    .filter(d =>
      (d.areaPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.dasarHukum || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.jenisPengawasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalMandays = data.reduce((acc, curr) => acc + (Number(curr.alokasiMandays) || 0), 0);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Area / Objek Pengawasan Mandatory', key: 'areaPengawasan', width: 38 },
      { header: 'Dasar Hukum / Regulasi Mandat', key: 'dasarHukum', width: 35 },
      { header: 'Bentuk / Jenis Pengawasan', key: 'jenisPengawasan', width: 25 },
      { header: 'Alokasi Mandays', key: 'alokasiMandays', width: 16 },
      { header: 'Keterangan', key: 'keterangan', width: 30 }
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
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJson}
        accept=".json"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-rose-950 rounded-2xl p-6 text-white shadow-xl border border-red-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 11 / Menu 12
              </span>
              <span className="text-xs text-red-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>

              {/* Cloud Sync Status Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-700/60 text-xs">
                {cloudStatus === 'synced' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Tersimpan di Cloud</span>
                    {lastSyncedTime && <span className="text-slate-400 text-[10px]">({lastSyncedTime})</span>}
                  </>
                ) : cloudStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span className="text-blue-300 font-medium">Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300 font-medium">Tersimpan Lokal (Offline)</span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-red-400" />
              Area Pengawasan Wajib (Mandatory)
            </h1>
            <p className="text-sm text-red-100/80 mt-1 max-w-3xl">
              Inventarisasi seluruh penugasan pengawasan yang diwajibkan secara eksplisit oleh peraturan perundang-undangan (Perpres, Permendagri, Perka BPKP, dll) tanpa melalui seleksi faktor risiko.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Manual Sync / Refresh Button (Khusus Admin) */}
            {isAdmin && (
              <button
                onClick={handleManualSync}
                disabled={isManualSyncing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                title="Sinkronkan & tarik perubahan terbaru dari Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{isManualSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
              </button>
            )}

            {/* Storage Input & Manager Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setShowStorageModal(true)}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                title="Buka menu input dari storage & restore lokal"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Input Storage</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari area pengawasan, dasar hukum, jenis..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambahkan Data</span>
          </button>

          <button
            onClick={() => handleAddMultipleRows(5)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
          >
            + 5 Baris
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowStorageModal(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Buka menu input dari storage & restore lokal"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Input dari Storage</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-2 text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
              title="Impor data Area Mandatory dari file cadangan JSON"
            >
              <Upload className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Impor JSON</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="px-2.5 py-2 text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            title="Unduh cadangan data Area Mandatory ke file JSON"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Ekspor JSON</span>
          </button>

          {isAdmin && data.length > 0 && (
            <button
              onClick={requestResetData}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition"
              title="Kosongkan Seluruh Tabel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3.5 text-center w-12 font-semibold">No</th>
                <th className="p-3.5 font-semibold min-w-[260px]">Area / Objek Pengawasan Mandatory</th>
                <th className="p-3.5 font-semibold min-w-[240px]">Dasar Hukum / Regulasi Mandat</th>
                <th className="p-3.5 font-semibold w-40">Bentuk Pengawasan</th>
                <th className="p-3.5 font-semibold w-32 text-center">Alokasi Mandays</th>
                <th className="p-3.5 font-semibold min-w-[200px]">Keterangan</th>
                <th className="p-3.5 font-semibold w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="p-3 bg-red-50 text-red-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-slate-800 font-bold text-sm">Belum ada data Area Pengawasan Mandatory</h4>
                        <p className="text-slate-500 text-xs mt-1">
                          Tabel saat ini kosong. Anda dapat menambahkan data secara manual, memasukkan data dari penyimpanan storage browser, atau memuat rekomendasi regulasi standar.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenAddModal}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Data
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setShowStorageModal(true)}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
                            >
                              <HardDrive className="w-4 h-4" />
                              Input dari Storage
                            </button>
                            <button
                              onClick={handleLoadStandardRecommendations}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Muat Regulasi Standar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{item.areaPengawasan}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 text-xs italic">{item.dasarHukum}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] border inline-flex items-center gap-1 ${
                        item.jenisPengawasan === 'Monitoring'
                          ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                          : item.jenisPengawasan === 'Reviu'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : item.jenisPengawasan === 'Evaluasi'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : item.jenisPengawasan === 'Pemantauan'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : item.jenisPengawasan?.toLowerCase().includes('audit')
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}>
                        {item.jenisPengawasan === 'Monitoring' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>}
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
                          onClick={() => handleDuplicateRow(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Duplikasi baris"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Edit baris"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requestDelete(item)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Storage Management Modal (Input dari Storage) */}
      {isAdmin && showStorageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Input & Kelola Data dari Storage
                  </h3>
                  <p className="text-xs text-slate-500">
                    Penyimpanan lokal di browser laptop ini & sinkronisasi Cloud server
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStorageModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage Status Cards */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">Data di Layar Saat Ini</span>
              <span className="text-xl font-black text-slate-900">{data.length} Objek</span>
              <p className="text-[11px] text-slate-500">Total {totalMandays} mandays pengawasan</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowStorageModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Impor File JSON</span>
                  </button>
                  <button
                    onClick={() => handleDownloadBackupJson(data, 'area_mandatory_backup.json')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Unduh File JSON</span>
                  </button>
                </div>

                <button
                  onClick={handleLoadStandardRecommendations}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  <span>Muat Standar Regulasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Bentuk Pengawasan *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBentukAdd(!isCustomBentukAdd);
                        if (!isCustomBentukAdd) {
                          setCustomBentukAddInput('');
                        }
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCustomBentukAdd ? 'Pilih dari Dropdown' : '✍️ Isi Sendiri / Tambah Pilihan'}</span>
                    </button>
                  </div>

                  {!isCustomBentukAdd ? (
                    <div className="space-y-2">
                      <select
                        value={newItem.jenisPengawasan}
                        onChange={e => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomBentukAdd(true);
                            setCustomBentukAddInput('');
                          } else {
                            setNewItem({ ...newItem, jenisPengawasan: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white cursor-pointer"
                      >
                        {availableBentukOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="__CUSTOM__" className="text-red-600 font-bold bg-red-50">
                          + Tambah Pilihan Lainnya...
                        </option>
                      </select>

                      {/* Quick input to add option directly */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={quickNewOptionAdd}
                          onChange={e => setQuickNewOptionAdd(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCustomOptionDirectly(quickNewOptionAdd, 'add');
                            }
                          }}
                          placeholder="+ Tambah bentuk pengawasan baru..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewCustomOptionDirectly(quickNewOptionAdd, 'add')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        value={customBentukAddInput}
                        onChange={e => setCustomBentukAddInput(e.target.value)}
                        placeholder="Ketik bentuk pengawasan baru (misal: Investigasi, Pendampingan)..."
                        className="w-full px-3 py-2 border-2 border-red-400 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500 italic">
                        Bentuk pengawasan yang Anda ketik ini akan otomatis tersimpan ke daftar dropdown untuk pilihan selanjutnya.
                      </p>
                    </div>
                  )}

                  {optionSuccessMsg && (
                    <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2 border border-emerald-200">
                      {optionSuccessMsg}
                    </p>
                  )}

                  {/* List of custom options with delete button */}
                  {customBentukList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Pilihan Tambahan:</span>
                      {customBentukList.map(opt => (
                        <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] text-slate-700">
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomOption(opt)}
                            className="text-slate-400 hover:text-red-600 transition"
                            title="Hapus opsi ini dari dropdown"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari Kerja) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.alokasiMandays}
                    onChange={e => setNewItem({ ...newItem, alokasiMandays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={newItem.keterangan}
                  onChange={e => setNewItem({ ...newItem, keterangan: e.target.value })}
                  placeholder="Contoh: Jadwal pelaksanaan, penanggung jawab, dll"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
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
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edit Area Pengawasan Mandatory
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                className="text-slate-400 hover:text-slate-700"
              >
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dasar Hukum / Regulasi Mandat *</label>
                <input
                  type="text"
                  required
                  value={editingItem.dasarHukum}
                  onChange={e => setEditingItem({ ...editingItem, dasarHukum: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Bentuk Pengawasan *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBentukEdit(!isCustomBentukEdit);
                        if (!isCustomBentukEdit) {
                          setCustomBentukEditInput('');
                        }
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isCustomBentukEdit ? 'Pilih dari Dropdown' : '✍️ Isi Sendiri / Tambah Pilihan'}</span>
                    </button>
                  </div>

                  {!isCustomBentukEdit ? (
                    <div className="space-y-2">
                      <select
                        value={editingItem.jenisPengawasan}
                        onChange={e => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomBentukEdit(true);
                            setCustomBentukEditInput('');
                          } else {
                            setEditingItem({ ...editingItem, jenisPengawasan: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white cursor-pointer"
                      >
                        {availableBentukOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="__CUSTOM__" className="text-red-600 font-bold bg-red-50">
                          + Tambah Pilihan Lainnya...
                        </option>
                      </select>

                      {/* Quick input to add option directly */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={quickNewOptionEdit}
                          onChange={e => setQuickNewOptionEdit(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCustomOptionDirectly(quickNewOptionEdit, 'edit');
                            }
                          }}
                          placeholder="+ Tambah bentuk pengawasan baru..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewCustomOptionDirectly(quickNewOptionEdit, 'edit')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        value={customBentukEditInput}
                        onChange={e => setCustomBentukEditInput(e.target.value)}
                        placeholder="Ketik bentuk pengawasan baru..."
                        className="w-full px-3 py-2 border-2 border-red-400 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500 italic">
                        Bentuk pengawasan yang Anda ketik ini akan otomatis tersimpan ke daftar dropdown untuk pilihan selanjutnya.
                      </p>
                    </div>
                  )}

                  {optionSuccessMsg && (
                    <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2 border border-emerald-200">
                      {optionSuccessMsg}
                    </p>
                  )}

                  {/* List of custom options with delete button */}
                  {customBentukList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Pilihan Tambahan:</span>
                      {customBentukList.map(opt => (
                        <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] text-slate-700">
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomOption(opt)}
                            className="text-slate-400 hover:text-red-600 transition"
                            title="Hapus opsi ini dari dropdown"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari Kerja) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingItem.alokasiMandays}
                    onChange={e => setEditingItem({ ...editingItem, alokasiMandays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={editingItem.keterangan}
                  onChange={e => setEditingItem({ ...editingItem, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
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
