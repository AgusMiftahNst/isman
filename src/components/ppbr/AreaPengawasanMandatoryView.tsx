import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaMandatoryItem } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getScopedKey, getScopedPPBRDocId, getSelectedYear, DEFAULT_YEAR } from './ppbrYearHelper';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  X,
  Info,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldAlert,
  RotateCcw,
  Cloud,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  HardDrive,
  Copy,
  CheckCircle2,
  Check,
  Sparkles,
  Clock,
  History,
  UserCheck,
  Laptop,
  Lock
} from 'lucide-react';
import { getDeviceOperatorName, DeviceOperatorBadge } from '../common/DeviceRegistrationModal';

export interface AreaMandatoryVersion {
  id: string;
  timestamp: string;
  formattedTime: string;
  operatorName: string;
  itemCount: number;
  totalMandays: number;
  items: AreaMandatoryItem[];
  actionDescription: string;
}

export const DEFAULT_BENTUK_PENGAWASAN_MANDATORY = [
  'Reviu',
  'Monitoring',
  'Evaluasi',
  'Pemantauan',
  'Audit Kinerja',
  'Audit Ketaatan',
  'Asistensi / Bimtek'
];

const STANDARD_MANDATORY_RECOMMENDATIONS: AreaMandatoryItem[] = [
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

  const isAdmin = isAdminProp !== undefined ? isAdminProp : (() => {
    try {
      const saved = localStorage.getItem('isman_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'Operator') return false;
        return !u.role || u.role === 'Administrator' || u.role === 'Admin' || u.username?.toLowerCase() === 'admin';
      }
    } catch (_) {}
    return true;
  })();

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
    return [];
  });

  // Local backup detection from localStorage (ensures data input on this laptop is never lost)
  const [localBackupData, setLocalBackupData] = useState<AreaMandatoryItem[] | null>(() => {
    try {
      const saved = localStorage.getItem('ppbr_area_mandatory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!localStorage.getItem('ppbr_area_mandatory_local_backup')) {
            localStorage.setItem('ppbr_area_mandatory_local_backup', saved);
          }
          return parsed;
        }
      }
      const existingBackup = localStorage.getItem('ppbr_area_mandatory_local_backup');
      if (existingBackup) {
        const parsed = JSON.parse(existingBackup);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return null;
  });

  const [showLocalRestoreBanner, setShowLocalRestoreBanner] = useState<boolean>(() => {
    return currentYear === DEFAULT_YEAR && localBackupData !== null && localBackupData.length > 0;
  });

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const isRemoteUpdateRef = useRef(false);
  const saveTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & UI Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AreaMandatoryItem | null>(null);

  // Version History states (Admin only)
  const [historyVersions, setHistoryVersions] = useState<AreaMandatoryVersion[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey + '_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<AreaMandatoryVersion | null>(null);

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

  // Daftar opsi bentuk pengawasan kustom yang ditambahkan sendiri oleh user
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

  // Gabungan opsi default + kustom + opsi yang sudah ada dalam data aktif
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

  // Quick input states untuk menambah opsi langsung ke dropdown
  const [quickNewOptionAdd, setQuickNewOptionAdd] = useState('');
  const [quickNewOptionEdit, setQuickNewOptionEdit] = useState('');
  const [optionSuccessMsg, setOptionSuccessMsg] = useState<string | null>(null);

  // Fungsi menyimpan opsi baru ke daftar dropdown & localStorage & Cloud
  const saveNewBentukOption = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!DEFAULT_BENTUK_PENGAWASAN_MANDATORY.includes(trimmed) && !customBentukList.includes(trimmed)) {
      const updated = [...customBentukList, trimmed];
      setCustomBentukList(updated);
      try {
        localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(updated));
      } catch (_) {}
      // Sync ke Firestore agar seluruh tim di laptop lain langsung mendapatkan opsi dropdown ini
      setDoc(doc(db, 'ppbr_data', docId), {
        customOptions: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn('Sync custom bentuk option to cloud warning:', err);
      });
    }
  };

  // Fungsi menambah opsi baru secara langsung dari quick input form
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

  // Fungsi menghapus opsi kustom dari daftar dropdown
  const handleDeleteCustomOption = (optToDelete: string) => {
    const updated = customBentukList.filter(o => o !== optToDelete);
    setCustomBentukList(updated);
    try {
      localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(updated));
    } catch (_) {}
    setDoc(doc(db, 'ppbr_data', docId), {
      customOptions: updated,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => {
      console.warn('Sync custom options deletion to cloud warning:', err);
    });
  };

  // State untuk mode "Isi Sendiri" di modal Tambah dan Edit
  const [isCustomBentukAdd, setIsCustomBentukAdd] = useState(false);
  const [customBentukAddInput, setCustomBentukAddInput] = useState('');
  const [isCustomBentukEdit, setIsCustomBentukEdit] = useState(false);
  const [customBentukEditInput, setCustomBentukEditInput] = useState('');

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

  // Real-time listener: Listen to Firestore Cloud Database updates for Area Mandatory
  useEffect(() => {
    const docRef = doc(db, 'ppbr_data', docId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const snapData = snap.data();
        if (snapData && Array.isArray(snapData.items)) {
          isRemoteUpdateRef.current = true;
          setData(snapData.items);
          localStorage.setItem(storageKey, JSON.stringify(snapData.items));
          window.dispatchEvent(new Event('ppbr_data_updated'));
          if (snapData.items.length > 0 && currentYear === DEFAULT_YEAR) {
            localStorage.setItem('ppbr_area_mandatory_local_backup', JSON.stringify(snapData.items));
            setLocalBackupData(snapData.items);
          }
          setCloudStatus('synced');
          if (snapData.updatedAt) {
            try {
              setLastSyncedTime(new Date(snapData.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (_) {
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
        // Sinkronisasi opsi kustom dari Cloud
        if (snapData && Array.isArray(snapData.customOptions) && snapData.customOptions.length > 0) {
          setCustomBentukList(prev => {
            const merged = Array.from(new Set([...prev, ...snapData.customOptions]));
            try {
              localStorage.setItem('ppbr_m12_custom_bentuk_pengawasan', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
        // Sinkronisasi riwayat versi dari Cloud
        if (snapData && Array.isArray(snapData.historyVersions) && snapData.historyVersions.length > 0) {
          setHistoryVersions(snapData.historyVersions);
          try {
            localStorage.setItem(storageKey + '_history', JSON.stringify(snapData.historyVersions));
          } catch (_) {}
        }
      } else {
        // If not in Firestore yet and local has data, initialize in Firestore
        if (data.length > 0) {
          setDoc(docRef, {
            items: data,
            customOptions: customBentukList,
            historyVersions: historyVersions,
            updatedAt: new Date().toISOString(),
            title: `Area Pengawasan Mandatory (${currentYear})`
          }, { merge: true }).catch(err => {
            console.warn('Initial push area mandatory to cloud error:', err);
          });
        }
      }
    }, (err) => {
      console.warn('Firestore Area Mandatory listener warning:', err?.message || err);
      setCloudStatus('offline');
    });

    return () => {
      unsub();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [docId, storageKey, currentYear]);

  // Dual Persistence: Save to local state + localStorage + Firestore Cloud + History Version
  const handleSaveData = (newData: AreaMandatoryItem[], immediateCloud = false, actionNote?: string) => {
    setData(newData);
    localStorage.setItem(storageKey, JSON.stringify(newData));
    window.dispatchEvent(new Event('ppbr_data_updated'));
    if (newData.length > 0 && currentYear === DEFAULT_YEAR) {
      localStorage.setItem('ppbr_area_mandatory_local_backup', JSON.stringify(newData));
      setLocalBackupData(newData);
    }

    // Catat Snapshot Riwayat Versi
    const currentOp = getDeviceOperatorName();
    const now = new Date();
    const note = actionNote || (
      newData.length > data.length
        ? `Menambah data (+${newData.length - data.length} baris)`
        : newData.length < data.length
        ? `Menghapus data (-${data.length - newData.length} baris)`
        : `Pembaruan data (${newData.length} objek)`
    );

    const newVersion: AreaMandatoryVersion = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      operatorName: currentOp,
      itemCount: newData.length,
      totalMandays: newData.reduce((acc, c) => acc + (Number(c.alokasiMandays) || 0), 0),
      items: newData,
      actionDescription: note
    };

    const updatedHistory = [newVersion, ...historyVersions.filter(v => v.id !== newVersion.id)].slice(0, 50);
    setHistoryVersions(updatedHistory);
    try {
      localStorage.setItem(storageKey + '_history', JSON.stringify(updatedHistory));
    } catch (_) {}

    // If update originated from remote snapshot, do not re-emit to cloud
    if (isRemoteUpdateRef.current) return;

    setCloudStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const doCloudSave = async () => {
      try {
        const nowIso = new Date().toISOString();
        await setDoc(doc(db, 'ppbr_data', docId), {
          items: newData,
          customOptions: customBentukList,
          historyVersions: updatedHistory,
          updatedAt: nowIso,
          title: `Area Pengawasan Mandatory (${currentYear})`
        }, { merge: true });
        setCloudStatus('synced');
        setLastSyncedTime(new Date(nowIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err: any) {
        console.warn('Cloud save deferred or offline:', err);
        setCloudStatus('offline');
      }
    };

    if (immediateCloud) {
      doCloudSave();
    } else {
      saveTimeoutRef.current = setTimeout(doCloudSave, 600);
    }
  };

  // Handler memulihkan versi data riwayat ke tabel utama
  const handleRestoreVersion = (version: AreaMandatoryVersion) => {
    setConfirmModal({
      isOpen: true,
      title: 'Pulihkan Versi Riwayat Ini?',
      message: `Apakah Anda yakin ingin memulihkan tabel ke versi tanggal ${version.formattedTime} oleh ${version.operatorName}?`,
      detail: `Tabel akan digantikan dengan ${version.itemCount} objek penugasan (${version.totalMandays} mandays) dari versi ini. Aksi pemulihan ini juga akan dicatat ke dalam riwayat versi.`,
      confirmText: 'Ya, Pulihkan Versi Ini',
      variant: 'info',
      onConfirm: () => {
        handleSaveData(version.items, true, `Dipulihkan dari versi ${version.formattedTime} (${version.operatorName})`);
        setShowHistoryModal(false);
        setSelectedHistoryVersion(null);
      }
    });
  };

  // Manual Trigger: Pull latest data or Push current data to Firestore
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setCloudStatus('saving');
    try {
      const snap = await getDoc(doc(db, 'ppbr_data', docId));
      if (snap.exists() && Array.isArray(snap.data()?.items)) {
        const items = snap.data().items;
        setData(items);
        localStorage.setItem(storageKey, JSON.stringify(items));
        if (items.length > 0 && currentYear === DEFAULT_YEAR) {
          localStorage.setItem('ppbr_area_mandatory_local_backup', JSON.stringify(items));
          setLocalBackupData(items);
        }
      } else {
        await setDoc(doc(db, 'ppbr_data', docId), {
          items: data,
          updatedAt: new Date().toISOString(),
          title: `Area Pengawasan Mandatory (${currentYear})`
        }, { merge: true });
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

  // Recovery: Upload local laptop data to Cloud
  const handleUploadLocalToCloud = () => {
    if (!localBackupData || localBackupData.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Unggah Data Laptop Ini ke Cloud?',
      message: `Terdapat ${localBackupData.length} baris data Area Mandatory yang tersimpan di laptop ini. Mengunggahnya akan menjadikan data ini sebagai data utama Cloud server dan langsung terlihat oleh seluruh rekan tim.`,
      confirmText: 'Ya, Unggah ke Cloud',
      variant: 'info',
      onConfirm: () => {
        handleSaveData(localBackupData, true);
        setShowLocalRestoreBanner(false);
        setShowStorageModal(false);
      }
    });
  };

  // Export current data or local backup as a JSON file
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
              handleSaveData(mapped, true);
              setShowLocalRestoreBanner(false);
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
        handleSaveData(STANDARD_MANDATORY_RECOMMENDATIONS, true);
        setShowStorageModal(false);
      }
    });
  };

  // Explicitly snapshot current table to local storage
  const handleSaveCurrentToLocalStorage = () => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (currentYear === DEFAULT_YEAR) {
      localStorage.setItem('ppbr_area_mandatory_local_backup', JSON.stringify(data));
      setLocalBackupData(data);
    }
    alert(`Berhasil menyimpan ${data.length} baris data Area Mandatory (${currentYear}) ke penyimpanan lokal browser laptop ini!`);
  };

  // Item additions & row controls
  const handleAddItem = (e: React.FormEvent) => {
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
    handleSaveData(updated);
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

  const handleSaveEdit = (e: React.FormEvent) => {
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
    handleSaveData(updated);
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
      detail: 'Seluruh daftar penugasan wajib peraturan perundang-undangan dan alokasi mandays akan dibersihkan dari layar dan Cloud.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([], true);
      }
    });
  };

  const filteredData = data.filter(d =>
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

              {/* Registered Device Badge */}
              <DeviceOperatorBadge />
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
            {/* Riwayat Versi Button (Khusus Admin) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedHistoryVersion(historyVersions[0] || null);
                  setShowHistoryModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition border border-amber-400/40"
                title="Buka Riwayat Versi & Audit Trail Pengisian (Khusus Administrator)"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Riwayat Versi</span>
                {historyVersions.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded-full text-[10px]">
                    {historyVersions.length}
                  </span>
                )}
              </button>
            )}

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
                className="px-3.5 py-2 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition border border-amber-500/40"
                title="Input data dari penyimpanan lokal browser atau kelola backup"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-200" />
                <span>Input dari Storage</span>
              </button>
            )}

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 bg-red-800/60 hover:bg-red-700/80 text-red-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-red-700/50"
            >
              <Info className="w-3.5 h-3.5 text-red-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
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

      {/* Detected Local Data Alert Banner (Admin Only) */}
      {isAdmin && showLocalRestoreBanner && localBackupData && localBackupData.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-950">
                  Terdeteksi Data Input di Laptop Ini ({localBackupData.length} Objek Mandatory)
                </h4>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Tersimpan di Storage Browser
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1 max-w-2xl leading-relaxed">
                Browser di laptop ini menyimpan data Area Mandatory yang pernah diinput. Klik <strong>"Unggah ke Cloud"</strong> agar data ini aktif dan tersimpan permanen di Cloud server untuk seluruh tim, atau unduh sebagai file JSON cadangan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              onClick={handleUploadLocalToCloud}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Unggah ke Cloud</span>
            </button>
            <button
              onClick={() => handleDownloadBackupJson(localBackupData, 'data_area_mandatory_laptop.json')}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition"
              title="Unduh file cadangan JSON dari data laptop ini"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File JSON</span>
            </button>
            <button
              onClick={() => setShowLocalRestoreBanner(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition"
              title="Tutup banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
            <Info className="w-4 h-4 text-red-600" />
            PENJELASAN AREA PENGAWASAN MANDATORY (REGULASI)
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. Area Pengawasan Mandatory adalah pengawasan yang <strong>wajib dilakukan APIP</strong> berdasarkan perintah Undang-Undang, Peraturan Pemerintah, Permendagri, Perka BPKP, dll.</p>
            <p>2. Contoh Penugasan Mandatory: Reviu LKPD, Reviu LPPD, Reviu RKA/DPA APBD, Evaluasi Penyelenggaraan SPIP Terintegrasi, Penilaian Mandiri Reformasi Birokrasi (PMRB), Pemantauan TLHP, dll.</p>
            <p>3. Area mandatory langsung dialokasikan kebutuhan mandays-nya dan dimasukkan ke dalam Usulan PKPT (Lampiran 12 & Format PKPT 14) tanpa melalui seleksi faktor risiko.</p>
            <p>4. <strong>Fitur Penyimpanan (Storage):</strong> Data tersimpan secara ganda di Browser Laptop Anda dan Server Cloud Firestore secara <em>real-time</em>. Anda juga dapat mengekspor atau mengimpor file backup JSON kapan saja.</p>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Add Row, Storage Input, Reset */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama area, dasar hukum regulasi, atau jenis pengawasan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedHistoryVersion(historyVersions[0] || null);
                setShowHistoryModal(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              title="Buka Riwayat Versi & Audit Trail Pengisian (Khusus Administrator)"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Riwayat Versi</span>
              {historyVersions.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded-full text-[10px]">
                  {historyVersions.length}
                </span>
              )}
            </button>
          )}

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
            title="Tambah 5 baris kosong sekaligus"
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
      {showStorageModal && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">Data di Layar Saat Ini</span>
                <span className="text-xl font-black text-slate-900">{data.length} Objek</span>
                <p className="text-[11px] text-slate-500">Total {totalMandays} mandays pengawasan</p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1">
                <span className="text-xs font-semibold text-amber-800 block">Data Tersimpan di Laptop Ini</span>
                <span className="text-xl font-black text-amber-950">
                  {localBackupData ? `${localBackupData.length} Objek` : 'Belum Ada'}
                </span>
                <p className="text-[11px] text-amber-800/80">
                  {localBackupData && localBackupData.length > 0
                    ? `Total ${localBackupData.reduce((acc, c) => acc + (Number(c.alokasiMandays) || 0), 0)} mandays di storage browser`
                    : 'Tidak ada riwayat lokal'}
                </p>
              </div>
            </div>

            {/* Preview of storage data if available */}
            {localBackupData && localBackupData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Pratinjau Data di Storage Laptop:</span>
                  <span className="text-amber-700 font-semibold">{localBackupData.length} Baris Ditemukan</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2 w-8 text-center">No</th>
                        <th className="p-2">Area Pengawasan</th>
                        <th className="p-2">Jenis</th>
                        <th className="p-2 text-center">Mandays</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {localBackupData.slice(0, 10).map((d, i) => (
                        <tr key={d.id || i} className="hover:bg-slate-50">
                          <td className="p-2 text-center text-slate-400">{d.no || i + 1}</td>
                          <td className="p-2 font-medium text-slate-800">{d.areaPengawasan}</td>
                          <td className="p-2 text-slate-600">{d.jenisPengawasan}</td>
                          <td className="p-2 text-center font-bold text-amber-700">{d.alokasiMandays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {localBackupData.length > 10 && (
                    <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-50 border-t border-slate-100">
                      ... dan {localBackupData.length - 10} objek lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {localBackupData && localBackupData.length > 0 && (
                  <button
                    onClick={handleUploadLocalToCloud}
                    className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Gunakan Data Storage & Sinkronkan ke Cloud</span>
                  </button>
                )}

                <button
                  onClick={handleSaveCurrentToLocalStorage}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <span>Simpan Data Layar ke Storage Laptop</span>
                </button>
              </div>

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
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white shadow-xs"
                      >
                        <optgroup label="Standar Bentuk Pengawasan">
                          {DEFAULT_BENTUK_PENGAWASAN_MANDATORY.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                        {customBentukList.length > 0 && (
                          <optgroup label="Pilihan Tambahan / Kustom">
                            {customBentukList.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__CUSTOM__" className="font-bold text-red-600 bg-red-50">
                          ➕ Isi Sendiri (Ketik & Tambahkan ke Dropdown...)
                        </option>
                      </select>

                      {/* Quick Add Bar: Tambah langsung ke Dropdown */}
                      <div className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-xl">
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
                          placeholder="Ketik bentuk baru lalu klik Tambah ke Dropdown..."
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewCustomOptionDirectly(quickNewOptionAdd, 'add')}
                          disabled={!quickNewOptionAdd.trim()}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-xs"
                          title="Tambahkan opsi ini ke pilihan dropdown"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah ke Dropdown</span>
                        </button>
                      </div>

                      {/* Feedback message saat opsi berhasil ditambah */}
                      {optionSuccessMsg && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{optionSuccessMsg}</span>
                        </div>
                      )}

                      {/* Chips opsi kustom yang sudah ditambahkan user */}
                      {customBentukList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Opsi kustom di dropdown:</span>
                          {customBentukList.map(opt => (
                            <span
                              key={opt}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
                                newItem.jenisPengawasan === opt
                                  ? 'bg-red-100 text-red-900 border-red-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className="cursor-pointer"
                                onClick={() => setNewItem({ ...newItem, jenisPengawasan: opt })}
                                title="Pilih opsi ini"
                              >
                                {opt}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomOption(opt)}
                                className="text-slate-400 hover:text-red-700 ml-0.5"
                                title="Hapus opsi ini dari dropdown"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50/80 border-2 border-red-400 rounded-xl space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-red-950">
                        <span>✍️ Tulis Bentuk Pengawasan Baru (Isi Sendiri):</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomBentukAdd(false);
                            setNewItem({ ...newItem, jenisPengawasan: availableBentukOptions[0] || 'Monitoring' });
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline"
                        >
                          Kembali ke Dropdown
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={customBentukAddInput}
                        onChange={e => {
                          setCustomBentukAddInput(e.target.value);
                          setNewItem({ ...newItem, jenisPengawasan: e.target.value });
                        }}
                        placeholder="Contoh: Monitoring Dana Desa, Audit Investigasi Khusus, Pendampingan SPM..."
                        className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 shadow-xs"
                        autoFocus
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (customBentukAddInput.trim()) {
                              handleAddNewCustomOptionDirectly(customBentukAddInput, 'add');
                            }
                          }}
                          disabled={!customBentukAddInput.trim()}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Simpan ke Dropdown & Pilih</span>
                        </button>
                        <span className="text-[10px] text-slate-600 italic">
                          💡 Otomatis tersimpan ke pilihan dropdown laptop ini & Cloud.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari) *</label>
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
                  placeholder="Catatan / Waktu pelaksanaan"
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white shadow-xs"
                      >
                        <optgroup label="Standar Bentuk Pengawasan">
                          {DEFAULT_BENTUK_PENGAWASAN_MANDATORY.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </optgroup>
                        {customBentukList.length > 0 && (
                          <optgroup label="Pilihan Tambahan / Kustom">
                            {customBentukList.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__CUSTOM__" className="font-bold text-red-600 bg-red-50">
                          ➕ Isi Sendiri (Ketik & Tambahkan ke Dropdown...)
                        </option>
                      </select>

                      {/* Quick Add Bar: Tambah langsung ke Dropdown */}
                      <div className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-xl">
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
                          placeholder="Ketik bentuk baru lalu klik Tambah ke Dropdown..."
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewCustomOptionDirectly(quickNewOptionEdit, 'edit')}
                          disabled={!quickNewOptionEdit.trim()}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-xs"
                          title="Tambahkan opsi ini ke pilihan dropdown"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah ke Dropdown</span>
                        </button>
                      </div>

                      {/* Feedback message saat opsi berhasil ditambah */}
                      {optionSuccessMsg && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{optionSuccessMsg}</span>
                        </div>
                      )}

                      {/* Chips opsi kustom yang sudah ditambahkan user */}
                      {customBentukList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Opsi kustom di dropdown:</span>
                          {customBentukList.map(opt => (
                            <span
                              key={opt}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
                                editingItem.jenisPengawasan === opt
                                  ? 'bg-red-100 text-red-900 border-red-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className="cursor-pointer"
                                onClick={() => setEditingItem({ ...editingItem, jenisPengawasan: opt })}
                                title="Pilih opsi ini"
                              >
                                {opt}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomOption(opt)}
                                className="text-slate-400 hover:text-red-700 ml-0.5"
                                title="Hapus opsi ini dari dropdown"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50/80 border-2 border-red-400 rounded-xl space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-red-950">
                        <span>✍️ Tulis Bentuk Pengawasan Baru (Isi Sendiri):</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomBentukEdit(false);
                            setEditingItem({ ...editingItem, jenisPengawasan: availableBentukOptions[0] || 'Monitoring' });
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline"
                        >
                          Kembali ke Dropdown
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={customBentukEditInput}
                        onChange={e => {
                          setCustomBentukEditInput(e.target.value);
                          setEditingItem({ ...editingItem, jenisPengawasan: e.target.value });
                        }}
                        placeholder="Contoh: Monitoring Dana Desa, Audit Investigasi Khusus, Pendampingan SPM..."
                        className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 shadow-xs"
                        autoFocus
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (customBentukEditInput.trim()) {
                              handleAddNewCustomOptionDirectly(customBentukEditInput, 'edit');
                            }
                          }}
                          disabled={!customBentukEditInput.trim()}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Simpan ke Dropdown & Pilih</span>
                        </button>
                        <span className="text-[10px] text-slate-600 italic">
                          💡 Otomatis tersimpan ke pilihan dropdown laptop ini & Cloud.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alokasi Mandays (Hari) *</label>
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

      {/* Version History & Audit Trail Modal (Admin Only) */}
      {isAdmin && showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      Riwayat Versi & Audit Trail
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-400/30">
                      Khusus Administrator
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Menu 12: Area Pengawasan Mandatory ({currentYear}) — Rekam jejak pengisian & pemulihan data terhapus
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryVersion(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[440px]">
              {/* Left Column: List of versions */}
              <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
                <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Daftar Versi Waktu</span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {historyVersions.length} Rekaman
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-200 p-2 space-y-1.5">
                  {historyVersions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">Belum ada riwayat tercatat.</p>
                      <p className="text-[11px] text-slate-400">
                        Riwayat akan otomatis terisi saat data di tabel ini ditambah, diubah, atau dihapus.
                      </p>
                    </div>
                  ) : (
                    historyVersions.map((v, idx) => {
                      const isSelected = selectedHistoryVersion ? selectedHistoryVersion.id === v.id : idx === 0;
                      const isLatest = idx === 0;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedHistoryVersion(v)}
                          className={`p-3 rounded-2xl cursor-pointer transition border text-left space-y-1.5 ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-1 ring-amber-300'
                              : 'bg-white border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{v.formattedTime}</span>
                            </span>
                            {isLatest && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-bold">
                                Aktif
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                            <Laptop className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="truncate">Oleh: <strong>{v.operatorName}</strong></span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>{v.itemCount} objek • {v.totalMandays} mandays</span>
                            <span className="text-[10px] text-amber-800 font-semibold truncate max-w-[110px]" title={v.actionDescription}>
                              {v.actionDescription}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Version Details & Preview Table */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {(() => {
                  const targetVer = selectedHistoryVersion || historyVersions[0];
                  if (!targetVer) {
                    return (
                      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                        <div className="space-y-2">
                          <History className="w-10 h-10 mx-auto text-slate-300" />
                          <h4 className="font-bold text-sm text-slate-700">Pilih salah satu versi di sebelah kiri</h4>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Anda dapat melihat isi tabel pada tanggal dan jam tersebut, serta memulihkan data jika terhapus.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const isCurrentActive = targetVer.id === historyVersions[0]?.id;
                  const diffCount = targetVer.itemCount - data.length;

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Top Action Bar */}
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">
                              Versi: {targetVer.formattedTime}
                            </h4>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md text-[10px] font-bold">
                              {targetVer.itemCount} Objek ({targetVer.totalMandays} Mandays)
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>Disimpan oleh pemegang laptop:</span>
                            <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-teal-600" />
                              {targetVer.operatorName}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="italic text-slate-500">{targetVer.actionDescription}</span>
                          </div>
                        </div>

                        {/* Restore Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isCurrentActive ? (
                            <button
                              onClick={() => handleRestoreVersion(targetVer)}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                              title="Kembalikan tabel aktif saat ini ke data pada versi ini"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Pulihkan Versi Ini (Restore)</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Versi Aktif Saat Ini</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diff Warning Bar if data was deleted in current version */}
                      {diffCount > 0 && (
                        <div className="bg-amber-500/15 border-b border-amber-300/60 px-4 py-2 text-xs text-amber-950 flex items-center justify-between">
                          <span className="font-medium">
                            💡 Pada versi ini terdapat <strong>{diffCount} baris lebih banyak</strong> dibandingkan data tabel Anda saat ini.
                          </span>
                          <span className="text-[11px] font-bold text-amber-800">
                            Bisa dipulihkan dengan tombol di atas
                          </span>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="flex-1 overflow-auto p-4">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                              <th className="p-2.5 text-center w-10">No</th>
                              <th className="p-2.5">Area Pengawasan Mandatory</th>
                              <th className="p-2.5">Dasar Hukum Regulasi</th>
                              <th className="p-2.5">Bentuk Pengawasan</th>
                              <th className="p-2.5 text-center w-24">Mandays</th>
                              <th className="p-2.5">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {targetVer.items.map((item, idx) => {
                              const isMissingNow = !data.some(d => d.areaPengawasan?.trim().toLowerCase() === item.areaPengawasan?.trim().toLowerCase());
                              return (
                                <tr
                                  key={item.id || idx}
                                  className={`transition ${
                                    isMissingNow
                                      ? 'bg-amber-50/70 hover:bg-amber-100/70'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="p-2.5 text-center text-slate-500 font-medium">{item.no || idx + 1}</td>
                                  <td className="p-2.5 font-bold text-slate-800">
                                    <div className="flex items-center gap-1.5">
                                      {isMissingNow && (
                                        <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[9px] font-bold uppercase">
                                          Hilang Sekarang
                                        </span>
                                      )}
                                      <span>{item.areaPengawasan}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-slate-600 text-[11px] italic">{item.dasarHukum}</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                                      {item.jenisPengawasan}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-red-900">{item.alokasiMandays} Hari</td>
                                  <td className="p-2.5 text-slate-500 text-[11px]">{item.keterangan}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
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
