import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FaktorRisikoIsuTerkiniItem, 
  INITIAL_ISU_TERKINI,
  AuditUniverseItem,
  INITIAL_AUDIT_UNIVERSE
} from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { getScopedKey, getScopedPPBRDocId, getSelectedYear, DEFAULT_YEAR } from './ppbrYearHelper';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { 
  Flame, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Info, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  RotateCcw,
  RefreshCw,
  Building2,
  Layers,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Check,
  Cloud
} from 'lucide-react';

// Helper: Mengambil data Audit Universe dari Menu 1
const getAuditUniverseData = (targetYear?: string): AuditUniverseItem[] => {
  const currentY = targetYear || getSelectedYear();
  const saved = localStorage.getItem(getScopedKey('ppbr_audit_universe', currentY));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse ppbr_audit_universe', e);
    }
  }
  return currentY === DEFAULT_YEAR ? INITIAL_AUDIT_UNIVERSE : [];
};

// Helper: Mengambil daftar unik program RPJMD dan OPD pengampu langsung dari Menu 1
export interface Menu1ProgramItem {
  id: string;
  no: number;
  programRpjmd: string;
  opdPengampu: string;
  tujuanRpjmd?: string;
  sasaranRpjmd?: string;
  prioritasRpjmn?: string;
  sektorUnggulan?: string;
  anggaran?: number;
}

const getMenu1ProgramsList = (targetYear?: string): Menu1ProgramItem[] => {
  const auList = getAuditUniverseData(targetYear);
  const map = new Map<string, Menu1ProgramItem>();

  auList.forEach((item, idx) => {
    const prog = (item.programRpjmd || '').trim();
    if (!prog) return;

    const opd = (item.opdPengampu || '').trim();

    if (!map.has(prog)) {
      map.set(prog, {
        id: item.id || `au-${idx}`,
        no: idx + 1,
        programRpjmd: prog,
        opdPengampu: opd,
        tujuanRpjmd: item.tujuanRpjmd || '',
        sasaranRpjmd: item.sasaranRpjmd || '',
        prioritasRpjmn: item.prioritasRpjmn || '',
        sektorUnggulan: item.sektorUnggulan || '',
        anggaran: Number(item.anggaran) || 0
      });
    } else {
      const existing = map.get(prog)!;
      if (!existing.opdPengampu && opd) {
        existing.opdPengampu = opd;
      }
    }
  });

  return Array.from(map.values());
};

const calculateSkalaStatic = (val: number): number => {
  if (val < 0) return 0;
  if (val === 4) return 5;
  if (val === 3) return 4;
  if (val === 2) return 3;
  if (val === 1) return 2;
  return 1;
};

export interface FaktorRisikoIsuTerkiniViewProps {
  isAdmin?: boolean;
  year?: string;
}

export const FaktorRisikoIsuTerkiniView: React.FC<FaktorRisikoIsuTerkiniViewProps> = ({ isAdmin: isAdminProp, year }) => {
  const currentYear = year || getSelectedYear();
  const storageKey = getScopedKey('ppbr_faktor_isu_terkini', currentYear);
  const docId = getScopedPPBRDocId('isu_terkini', currentYear);

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

  // Cloud Real-time Synchronization States
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'offline' | 'error'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inisialisasi data: Jika belum ada di localStorage, otomatis ambil dari Program RPJMD & OPD di Menu 1
  const [data, setData] = useState<FaktorRisikoIsuTerkiniItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ' + storageKey, e);
      }
    }

    if (currentYear !== DEFAULT_YEAR) {
      return [];
    }

    // Auto-populate dari Program RPJMD dan OPD Menu 1 dengan kriteria awal Belum Diisi (-1)
    const menu1List = getMenu1ProgramsList(currentYear);
    if (menu1List.length > 0) {
      return menu1List.map((item, idx) => ({
        id: `fit-${idx + 1}-${Date.now()}`,
        no: idx + 1,
        program: item.programRpjmd,
        namaOPD: item.opdPengampu || '',
        sorotanMasyarakat: -1,
        isuNasional: -1,
        layananPublik: -1,
        hajatHidup: -1,
        nilai: -1,
        skala: 0
      }));
    }

    return INITIAL_ISU_TERKINI;
  });

  // Firestore Real-time Listener (Semua laptop terhubung ke Cloud yang sama)
  useEffect(() => {
    const docRef = doc(db, 'ppbr_data', docId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const snapData = snap.data();
        if (snapData && Array.isArray(snapData.items)) {
          isRemoteUpdateRef.current = true;
          setData(snapData.items);
          localStorage.setItem(storageKey, JSON.stringify(snapData.items));
          setCloudStatus('synced');
          if (snapData.updatedAt) {
            try {
              setLastSyncedTime(new Date(snapData.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (_) {
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
            }
          }
          setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
        }
      } else {
        if (data.length > 0) {
          setDoc(docRef, {
            items: data,
            updatedAt: new Date().toISOString(),
            title: `Isu Terkini ${currentYear}`
          }, { merge: true }).catch(() => {});
        }
      }
    }, (err) => {
      console.warn('Firestore Isu Terkini listener warning:', err);
      setCloudStatus('offline');
    });

    return () => {
      unsub();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [docId, currentYear, storageKey]);

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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FaktorRisikoIsuTerkiniItem | null>(null);

  // Form Tambah
  const [isManualInput, setIsManualInput] = useState(false);
  const [selectedMenu1Program, setSelectedMenu1Program] = useState('');
  const [newItem, setNewItem] = useState<{
    program: string;
    namaOPD: string;
    sorotanMasyarakat: 0 | 1;
    isuNasional: 0 | 1;
    layananPublik: 0 | 1;
    hajatHidup: 0 | 1;
  }>({
    program: '',
    namaOPD: '',
    sorotanMasyarakat: 1,
    isuNasional: 1,
    layananPublik: 1,
    hajatHidup: 1
  });

  // Modal Sinkronisasi State
  const [syncSearch, setSyncSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'NEW' | 'DIFF_OPD'>('ALL');
  const [selectedSyncPrograms, setSelectedSyncPrograms] = useState<string[]>([]);

  const calculateSkala = (val: number): number => {
    return calculateSkalaStatic(val);
  };

  const handleSaveData = (newData: FaktorRisikoIsuTerkiniItem[], immediateCloud = false) => {
    setData(newData);
    localStorage.setItem(storageKey, JSON.stringify(newData));

    if (isRemoteUpdateRef.current) return;
    setCloudStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const doSave = async () => {
      try {
        const nowIso = new Date().toISOString();
        await setDoc(doc(db, 'ppbr_data', docId), {
          items: newData,
          updatedAt: nowIso,
          title: `Isu Terkini ${currentYear}`
        }, { merge: true });
        setCloudStatus('synced');
        setLastSyncedTime(new Date(nowIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {
        console.warn('Cloud save Isu Terkini error:', e);
        setCloudStatus('offline');
      }
    };

    if (immediateCloud) doSave();
    else saveTimeoutRef.current = setTimeout(doSave, 800);
  };

  const handleManualCloudSync = async () => {
    setIsManualSyncing(true);
    try {
      const snap = await getDoc(doc(db, 'ppbr_data', docId));
      if (snap.exists() && Array.isArray(snap.data()?.items)) {
        setData(snap.data().items);
        localStorage.setItem(storageKey, JSON.stringify(snap.data().items));
        setCloudStatus('synced');
      }
    } catch (_) {
      setCloudStatus('offline');
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Daftar program dari Menu 1 terkini
  const menu1Programs = useMemo(() => {
    return getMenu1ProgramsList(currentYear);
  }, [showAddModal, showEditModal, showSyncModal, currentYear]);

  // Saat memilih program RPJMD dari Menu 1 di Modal Tambah:
  const handleSelectProgramFromMenu1 = (progName: string) => {
    setSelectedMenu1Program(progName);
    if (!progName) {
      setNewItem({
        program: '',
        namaOPD: '',
        sorotanMasyarakat: -1,
        isuNasional: -1,
        layananPublik: -1,
        hajatHidup: -1
      });
      return;
    }

    const found = menu1Programs.find(p => p.programRpjmd === progName);
    if (found) {
      setNewItem({
        program: found.programRpjmd,
        namaOPD: found.opdPengampu || '',
        sorotanMasyarakat: -1,
        isuNasional: -1,
        layananPublik: -1,
        hajatHidup: -1
      });
    }
  };

  const handleOpenAddModal = () => {
    setIsManualInput(false);
    setSelectedMenu1Program('');
    setNewItem({
      program: '',
      namaOPD: '',
      sorotanMasyarakat: -1,
      isuNasional: -1,
      layananPublik: -1,
      hajatHidup: -1
    });
    setShowAddModal(true);
  };

  const handleToggleCriteria = (id: string, field: 'sorotanMasyarakat' | 'isuNasional' | 'layananPublik' | 'hajatHidup') => {
    const updated = data.map(item => {
      if (item.id === id) {
        // Siklus tri-state: -1 (Belum Diisi) -> 1 (Ya) -> 0 (Tidak) -> -1 (Belum Diisi)
        const cur = item[field];
        let newVal: 0 | 1 | -1 = 1;
        if (cur === 1) {
          newVal = 0;
        } else if (cur === 0) {
          newVal = -1;
        } else {
          newVal = 1;
        }

        const updatedItem = { ...item, [field]: newVal };
        const isComplete = updatedItem.sorotanMasyarakat !== -1 && 
                           updatedItem.isuNasional !== -1 && 
                           updatedItem.layananPublik !== -1 && 
                           updatedItem.hajatHidup !== -1;
        const totalNilai = isComplete 
          ? (updatedItem.sorotanMasyarakat + updatedItem.isuNasional + updatedItem.layananPublik + updatedItem.hajatHidup) 
          : -1;
        return {
          ...updatedItem,
          nilai: totalNilai,
          skala: isComplete ? calculateSkala(totalNilai) : 0
        };
      }
      return item;
    });
    handleSaveData(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.program.trim()) return;

    const isComplete = newItem.sorotanMasyarakat !== -1 && 
                       newItem.isuNasional !== -1 && 
                       newItem.layananPublik !== -1 && 
                       newItem.hajatHidup !== -1;

    const totalNilai = isComplete 
      ? (newItem.sorotanMasyarakat + newItem.isuNasional + newItem.layananPublik + newItem.hajatHidup)
      : -1;

    const item: FaktorRisikoIsuTerkiniItem = {
      id: `fit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      program: newItem.program.trim(),
      namaOPD: newItem.namaOPD.trim(),
      sorotanMasyarakat: newItem.sorotanMasyarakat,
      isuNasional: newItem.isuNasional,
      layananPublik: newItem.layananPublik,
      hajatHidup: newItem.hajatHidup,
      nilai: totalNilai,
      skala: isComplete ? calculateSkala(totalNilai) : 0
    };
    const updated = [...data, item];
    handleSaveData(updated);
    setShowAddModal(false);
    setNewItem({ program: '', namaOPD: '', sorotanMasyarakat: -1, isuNasional: -1, layananPublik: -1, hajatHidup: -1 });
  };

  const handleOpenEdit = (item: FaktorRisikoIsuTerkiniItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const isComplete = editingItem.sorotanMasyarakat !== -1 && 
                       editingItem.isuNasional !== -1 && 
                       editingItem.layananPublik !== -1 && 
                       editingItem.hajatHidup !== -1;

    const totalNilai = isComplete 
      ? (editingItem.sorotanMasyarakat + editingItem.isuNasional + editingItem.layananPublik + editingItem.hajatHidup)
      : -1;

    const updatedItem: FaktorRisikoIsuTerkiniItem = {
      ...editingItem,
      program: editingItem.program.trim(),
      namaOPD: editingItem.namaOPD.trim(),
      nilai: totalNilai,
      skala: isComplete ? calculateSkala(totalNilai) : 0
    };
    const updated = data.map(d => d.id === updatedItem.id ? updatedItem : d);
    handleSaveData(updated);
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Helper untuk mengambil OPD terbaru dari Menu 1 saat edit baris
  const handleFetchLatestOpdForEdit = () => {
    if (!editingItem) return;
    const match = menu1Programs.find(
      p => p.programRpjmd.toLowerCase() === editingItem.program.trim().toLowerCase()
    );
    if (match) {
      setEditingItem({
        ...editingItem,
        namaOPD: match.opdPengampu || editingItem.namaOPD
      });
    }
  };

  const requestResetPenilaian = (item: FaktorRisikoIsuTerkiniItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Penilaian Isu Terkini & Dampak Sosial?',
      message: 'Apakah Anda yakin ingin menghapus/mereset penilaian dampak sosial & isu terkini untuk program ini? Nama program dan OPD akan tetap ada di tabel.',
      detail: `Program: "${item.program}" | OPD: ${item.namaOPD || '(Belum diisi)'} | Kriteria saat ini: ${item.nilai} (Skala ${item.skala})`,
      confirmText: 'Ya, Hapus Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d =>
          d.id === item.id
            ? {
                ...d,
                sorotanMasyarakat: 0 as const,
                isuNasional: 0 as const,
                layananPublik: 0 as const,
                hajatHidup: 0 as const,
                nilai: 0,
                skala: 1
              }
            : d
        );
        handleSaveData(updated);
      }
    });
  };

  const requestResetAllPenilaian = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Seluruh Penilaian Isu Terkini?',
      message: `Apakah Anda yakin ingin mereset penilaian untuk seluruh program (${data.length} program)?`,
      detail: 'Seluruh checklist kriteria sorotan masyarakat, isu nasional, layanan publik, dan hajat hidup orang banyak akan di-reset menjadi status "Belum Diisi" (-1) sehingga evaluator harus menilai ulang secara nyata. Nama program dan OPD tetap aman di tabel.',
      confirmText: 'Ya, Reset Semua Penilaian',
      variant: 'warning',
      onConfirm: () => {
        const updated = data.map(d => ({
          ...d,
          sorotanMasyarakat: -1 as const,
          isuNasional: -1 as const,
          layananPublik: -1 as const,
          hajatHidup: -1 as const,
          nilai: -1,
          skala: 0
        }));
        handleSaveData(updated);
      }
    });
  };

  // --- LOGIKA SINKRONISASI DARI MENU 1 ---
  const handleOpenSyncModal = () => {
    const list = getMenu1ProgramsList(currentYear);
    setSelectedSyncPrograms(list.map(p => p.programRpjmd));
    setSyncSearch('');
    setSyncFilter('ALL');
    setShowSyncModal(true);
  };

  // Sinkronisasi Penuh (Mempertahankan checklist kriteria yang sudah diatur)
  const handleApplyFullSync = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronisasi Penuh dari Menu 1?',
      message: 'Seluruh Program RPJMD dan nama OPD pengampu di Menu 7 akan diselaraskan dengan data Menu 1 (Audit Universe).',
      detail: 'Pilihan checklist kriteria isu strategis & dampak sosial yang sudah diatur sebelumnya akan tetap dipertahankan.',
      confirmText: 'Ya, Sinkronisasikan',
      variant: 'warning',
      onConfirm: () => {
        const menu1List = getMenu1ProgramsList(currentYear).filter(p => selectedSyncPrograms.includes(p.programRpjmd));

        const existingMap = new Map<string, FaktorRisikoIsuTerkiniItem>();
        data.forEach(d => {
          existingMap.set(d.program.toLowerCase().trim(), d);
        });

        const synced: FaktorRisikoIsuTerkiniItem[] = menu1List.map((item, idx) => {
          const matchExisting = existingMap.get(item.programRpjmd.toLowerCase().trim());
          
          let sorotanMasyarakat: 0 | 1 | -1 = 1;
          let isuNasional: 0 | 1 | -1 = 1;
          let layananPublik: 0 | 1 | -1 = 1;
          let hajatHidup: 0 | 1 | -1 = 1;

          if (matchExisting) {
            sorotanMasyarakat = matchExisting.sorotanMasyarakat;
            isuNasional = matchExisting.isuNasional;
            layananPublik = matchExisting.layananPublik;
            hajatHidup = matchExisting.hajatHidup;
          }

          const isComplete = sorotanMasyarakat !== -1 && 
                             isuNasional !== -1 && 
                             layananPublik !== -1 && 
                             hajatHidup !== -1;

          const totalNilai = isComplete 
            ? (sorotanMasyarakat + isuNasional + layananPublik + hajatHidup)
            : -1;

          return {
            id: matchExisting?.id || `fit-sync-${idx + 1}-${Date.now()}`,
            no: idx + 1,
            program: item.programRpjmd,
            namaOPD: item.opdPengampu || '',
            sorotanMasyarakat,
            isuNasional,
            layananPublik,
            hajatHidup,
            nilai: totalNilai,
            skala: isComplete ? calculateSkala(totalNilai) : 0
          };
        });

        handleSaveData(synced);
        setShowSyncModal(false);
      }
    });
  };

  // Perbarui Nama OPD saja dari Menu 1
  const handleApplyUpdateOpdOnly = () => {
    const menu1List = getMenu1ProgramsList();
    const menu1Map = new Map<string, Menu1ProgramItem>();
    menu1List.forEach(p => {
      menu1Map.set(p.programRpjmd.toLowerCase().trim(), p);
    });

    const updatedData = data.map(d => {
      const match = menu1Map.get(d.program.toLowerCase().trim());
      if (match && match.opdPengampu && match.opdPengampu !== d.namaOPD) {
        return {
          ...d,
          namaOPD: match.opdPengampu
        };
      }
      return d;
    });

    handleSaveData(updatedData);
    setShowSyncModal(false);
  };

  // Tambahkan hanya program baru yang belum ada di Menu 7
  const handleApplyAddNewOnly = () => {
    const existingNames = new Set(data.map(d => d.program.toLowerCase().trim()));
    const newItemsFromMenu1 = menu1Programs.filter(
      p => selectedSyncPrograms.includes(p.programRpjmd) && !existingNames.has(p.programRpjmd.toLowerCase().trim())
    );

    if (newItemsFromMenu1.length === 0) {
      alert('Tidak ada program baru dari Menu 1 yang dapat ditambahkan.');
      return;
    }

    const startNo = data.length;
    const additions: FaktorRisikoIsuTerkiniItem[] = newItemsFromMenu1.map((item, idx) => {
      const sorotanMasyarakat: 0 | 1 = 1;
      const isuNasional: 0 | 1 = 1;
      const layananPublik: 0 | 1 = 1;
      const hajatHidup: 0 | 1 = 1;
      const totalNilai = sorotanMasyarakat + isuNasional + layananPublik + hajatHidup;

      return {
        id: `fit-new-${Date.now()}-${idx}`,
        no: startNo + idx + 1,
        program: item.programRpjmd,
        namaOPD: item.opdPengampu || '',
        sorotanMasyarakat,
        isuNasional,
        layananPublik,
        hajatHidup,
        nilai: totalNilai,
        skala: calculateSkala(totalNilai)
      };
    });

    handleSaveData([...data, ...additions]);
    setShowSyncModal(false);
  };

  const filteredData = data.filter(d =>
    (d.program || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.namaOPD || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Perbandingan status dengan Menu 1
  const syncComparison = useMemo(() => {
    const existingNamesMap = new Map<string, FaktorRisikoIsuTerkiniItem>();
    data.forEach(d => existingNamesMap.set(d.program.toLowerCase().trim(), d));

    let countNew = 0;
    let countDiffOpd = 0;
    let countSame = 0;

    const listWithStatus = menu1Programs.map(p => {
      const existing = existingNamesMap.get(p.programRpjmd.toLowerCase().trim());
      let status: 'NEW' | 'DIFF_OPD' | 'SAME' = 'NEW';
      if (!existing) {
        status = 'NEW';
        countNew++;
      } else if (p.opdPengampu && existing.namaOPD !== p.opdPengampu) {
        status = 'DIFF_OPD';
        countDiffOpd++;
      } else {
        status = 'SAME';
        countSame++;
      }
      return {
        ...p,
        status,
        currentOpdInMenu: existing ? existing.namaOPD : undefined
      };
    });

    return {
      listWithStatus,
      countNew,
      countDiffOpd,
      countSame,
      totalMenu1: menu1Programs.length
    };
  }, [data, menu1Programs]);

  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Program RPJMD', key: 'program', width: 38 },
      { header: 'OPD Pengampu (Menu 1)', key: 'namaOPD', width: 30 },
      { header: 'Sorotan Masyarakat (1/0)', key: 'sorotanMasyarakat', width: 22 },
      { header: 'Isu Prioritas Nasional (1/0)', key: 'isuNasional', width: 24 },
      { header: 'Layanan Publik Dasar (1/0)', key: 'layananPublik', width: 24 },
      { header: 'Hajat Hidup Orang Banyak (1/0)', key: 'hajatHidup', width: 24 },
      { header: 'Total Nilai (0-4)', key: 'nilai', width: 16 },
      { header: 'Skala Risiko (1-5)', key: 'skala', width: 16 }
    ];

    exportToExcel(
      'Lampiran_7_Faktor_Isu_Terkini',
      'LAMPIRAN 7: PERTIMBANGAN MANAJEMEN - ISU TERKINI & DAMPAK SOSIAL',
      'Penetapan Skala Risiko Berdasarkan Sorotan Publik, Isu Nasional & Pelayanan Dasar (Audit Universe)',
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Program RPJMD', 'OPD Pengampu', 'Sorotan Publik', 'Isu Nasional', 'Layanan Publik', 'Hajat Hidup', 'Nilai', 'Skala'];
    const rows = filteredData.map(d => [
      d.no,
      d.program,
      d.namaOPD || '-',
      d.sorotanMasyarakat ? 'Ya (1)' : 'Tidak (0)',
      d.isuNasional ? 'Ya (1)' : 'Tidak (0)',
      d.layananPublik ? 'Ya (1)' : 'Tidak (0)',
      d.hajatHidup ? 'Ya (1)' : 'Tidak (0)',
      d.nilai,
      `Skala ${d.skala}`
    ]);

    exportToPdf(
      'Lampiran_7_Faktor_Isu_Terkini',
      'LAMPIRAN 7: PERTIMBANGAN MANAJEMEN - ISU TERKINI & DAMPAK SOSIAL',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 rounded-2xl p-6 text-white shadow-xl border border-orange-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 7
              </span>
              <span className="text-xs text-orange-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Terintegrasi Menu 1
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Faktor Dampak Sosial, Pelayanan Dasar & Isu Terkini
            </h1>
            <p className="text-sm text-orange-100/80 mt-1 max-w-3xl">
              Nama program diambil langsung dari <strong className="text-orange-200">Program RPJMD</strong> dan nama OPD dari <strong className="text-orange-200">OPD/Unit Pengampu</strong> pada <strong className="text-orange-200">Menu 1 (Audit Universe)</strong>. Pertimbangan manajemen atas intensitas sorotan publik/media massa, keterkaitan kebijakan prioritas nasional, pemenuhan Standar Pelayanan Minimal (SPM), dan kepentingan hajat hidup masyarakat luas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Cloud Sync Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              cloudStatus === 'synced'
                ? 'bg-orange-950/70 border-orange-500/40 text-orange-300'
                : cloudStatus === 'saving'
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 animate-pulse'
                : 'bg-slate-900/70 border-slate-700 text-slate-300'
            }`}>
              {cloudStatus === 'synced' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Cloud className="w-3.5 h-3.5 text-orange-400" />
                  <span>Cloud Terhubung {lastSyncedTime ? `(${lastSyncedTime})` : ''}</span>
                </>
              ) : cloudStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Tersimpan Lokal</span>
                </>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={handleManualCloudSync}
                disabled={isManualSyncing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                title="Tarik perubahan terbaru dari Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{isManualSyncing ? 'Sinkronisasi...' : 'Tarik Cloud'}</span>
              </button>
            )}

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 bg-orange-800/60 hover:bg-orange-700/80 text-orange-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-orange-700/50"
            >
              <Info className="w-3.5 h-3.5 text-orange-300" />
              <span>Petunjuk</span>
            </button>
            <button
              onClick={handleOpenSyncModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition border border-indigo-400/40"
              title="Sinkronisasikan Program RPJMD dan OPD dari Menu 1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronisasi dari Menu 1</span>
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
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
            {isAdmin && data.length > 0 && (
              <button
                onClick={requestResetAllPenilaian}
                className="px-3 py-2 bg-slate-800 hover:bg-orange-900/60 text-slate-300 hover:text-orange-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                title="Hapus / Reset Seluruh Penilaian Isu Terkini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Penilaian</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-orange-800/40">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Total Objek Pengawasan</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-white">{data.length}</span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Sorotan Publik Tinggi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-orange-400">
                {data.filter(d => d.sorotanMasyarakat === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Pelayanan Publik Dasar</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-cyan-400">
                {data.filter(d => d.layananPublik === 1).length}
              </span>
              <span className="text-xs text-slate-400">Program</span>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Tingkat Risiko Sangat Tinggi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-amber-300">
                {data.filter(d => d.skala === 5).length}
              </span>
              <span className="text-xs text-slate-400">Skala 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Petunjuk Accordion */}
      {showGuide && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-orange-900 text-sm">
            <Info className="w-4 h-4 text-orange-600" />
            KETENTUAN SKORING FAKTOR ISU TERKINI & DAMPAK SOSIAL
          </div>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>1. <strong>Sumber Program & OPD</strong>: Nama program diambil dari kolom <strong>Program RPJMD</strong> dan OPD dari <strong>OPD/Unit Pengampu</strong> pada <strong>Menu 1 (Audit Universe)</strong>.</p>
            <p>2. <strong>Sorotan Masyarakat / Media</strong>: Beri nilai 1 jika program mendapat atensi tinggi publik, laporan pengaduan masyarakat (SP4N-LAPOR!), atau kritik media massa.</p>
            <p>3. <strong>Isu Prioritas Nasional</strong>: Beri nilai 1 jika program terkait langsung dengan program strategis nasional seperti penurunan stunting, inflasi daerah, kemiskinan ekstrem, P3DN, atau Stranas PK.</p>
            <p>4. <strong>Pelayanan Publik Dasar</strong>: Beri nilai 1 jika program berkaitan langsung dengan SPM (Standar Pelayanan Minimal) bidang pendidikan, kesehatan, pekerjaan umum, perumahan, ketenteraman, atau sosial.</p>
            <p>5. <strong>Hajat Hidup Orang Banyak</strong>: Beri nilai 1 jika kegagalan program berdampak luas terhadap keselamatan, air bersih, transportasi, pangan, atau ketertiban umum.</p>
            <p>6. <strong>Konversi Skala</strong>: Total Nilai 4 = <strong>Skala 5</strong>, Nilai 3 = <strong>Skala 4</strong>, Nilai 2 = <strong>Skala 3</strong>, Nilai 1 = <strong>Skala 2</strong>, Nilai 0 = <strong>Skala 1</strong>.</p>
            <p>7. <strong>Sinkronisasi</strong>: Gunakan tombol <em>Sinkronisasi dari Menu 1</em> jika ada penambahan program RPJMD baru atau perubahan OPD pengampu di Menu 1.</p>
          </div>
        </div>
      )}

      {/* Search Toolbar & Status Koneksi */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari program atau OPD..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>Tersinkron dengan <strong>{menu1Programs.length}</strong> Program RPJMD di Menu 1</span>
          </div>
          {syncComparison.countDiffOpd > 0 && (
            <button
              onClick={handleOpenSyncModal}
              className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 font-semibold flex items-center gap-1.5 transition"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{syncComparison.countDiffOpd} OPD berbeda di Menu 1</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-center">
                <th rowSpan={2} className="p-3 w-12 font-semibold">No</th>
                <th rowSpan={2} className="p-3 min-w-[240px] text-left font-semibold">
                  Program RPJMD (Menu 1)
                </th>
                <th rowSpan={2} className="p-3 min-w-[200px] text-left font-semibold">
                  Perangkat Daerah (OPD Pengampu)
                </th>
                <th colSpan={4} className="p-2 bg-slate-800 text-orange-300 font-bold border-b border-slate-700">
                  KRITERIA ISU STRATEGIS & SOSIAL (KLIK UNTUK UBAH)
                </th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Total Skor</th>
                <th rowSpan={2} className="p-3 w-32 font-semibold">Skala Risiko</th>
                <th rowSpan={2} className="p-3 w-24 font-semibold">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-center">
                <th className="p-2 w-32">Sorotan Publik</th>
                <th className="p-2 w-32">Isu Nasional</th>
                <th className="p-2 w-32">Layanan Publik</th>
                <th className="p-2 w-32">Hajat Hidup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-slate-600 font-medium">Belum ada data Faktor Isu Terkini & Dampak Sosial.</p>
                      <p className="text-xs text-slate-400">
                        Klik tombol di bawah untuk langsung mengimpor daftar Program RPJMD dan OPD dari Menu 1.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenSyncModal}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sinkronisasi dari Menu 1
                        </button>
                        <button
                          onClick={handleOpenAddModal}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Manual
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition">
                    <td className="p-3 text-center font-bold text-slate-600 bg-slate-50">{item.no}</td>
                    
                    {/* Program RPJMD */}
                    <td className="p-3 font-semibold text-slate-900">
                      <div className="flex items-start gap-1.5">
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded mt-0.5 shrink-0">
                          RPJMD
                        </span>
                        <span>{item.program}</span>
                      </div>
                    </td>

                    {/* Perangkat Daerah (OPD Pengampu) */}
                    <td className="p-3 text-slate-700">
                      {item.namaOPD ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{item.namaOPD}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs italic">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          Belum diisi di Menu 1
                        </span>
                      )}
                    </td>

                    {/* Criteria Toggles: Sorotan Publik */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'sorotanMasyarakat')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.sorotanMasyarakat === 1
                            ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                            : item.sorotanMasyarakat === 0
                            ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-800 border border-dashed border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah: Belum Diisi -> Ya -> Tidak -> Belum Diisi"
                      >
                        {item.sorotanMasyarakat === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" /> Ya (1)
                          </>
                        ) : item.sorotanMasyarakat === 0 ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Belum Diisi (-)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: Isu Nasional */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'isuNasional')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.isuNasional === 1
                            ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                            : item.isuNasional === 0
                            ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-800 border border-dashed border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah: Belum Diisi -> Ya -> Tidak -> Belum Diisi"
                      >
                        {item.isuNasional === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" /> Ya (1)
                          </>
                        ) : item.isuNasional === 0 ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Belum Diisi (-)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: Layanan Publik */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'layananPublik')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.layananPublik === 1
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 hover:bg-cyan-200'
                            : item.layananPublik === 0
                            ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-800 border border-dashed border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah: Belum Diisi -> Ya -> Tidak -> Belum Diisi"
                      >
                        {item.layananPublik === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> Ya (1)
                          </>
                        ) : item.layananPublik === 0 ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Belum Diisi (-)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Criteria Toggles: Hajat Hidup */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleToggleCriteria(item.id, 'hajatHidup')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          item.hajatHidup === 1
                            ? 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                            : item.hajatHidup === 0
                            ? 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-800 border border-dashed border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah: Belum Diisi -> Ya -> Tidak -> Belum Diisi"
                      >
                        {item.hajatHidup === 1 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Ya (1)
                          </>
                        ) : item.hajatHidup === 0 ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Tidak (0)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Belum Diisi (-)
                          </>
                        )}
                      </button>
                    </td>

                    {/* Total Skor */}
                    <td className="p-3 text-center font-extrabold text-orange-900 bg-orange-50/40 text-sm">
                      {item.nilai >= 0 && item.sorotanMasyarakat !== -1 && item.isuNasional !== -1 && item.layananPublik !== -1 && item.hajatHidup !== -1 ? (
                        `${item.nilai} / 4`
                      ) : (
                        <span className="text-slate-400 italic font-semibold text-xs">-</span>
                      )}
                    </td>

                    {/* Skala Risiko */}
                    <td className="p-3 text-center">
                      {item.skala > 0 && item.nilai >= 0 && item.sorotanMasyarakat !== -1 && item.isuNasional !== -1 && item.layananPublik !== -1 && item.hajatHidup !== -1 ? (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                          item.skala >= 4
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.skala === 3
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          Skala {item.skala}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Belum Dinilai
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                          title="Edit Penilaian"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => requestResetPenilaian(item)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition"
                            title="Hapus / Reset Penilaian (Set Kriteria = 0, Skala 1)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH DATA (Pilih Program RPJMD dari Menu 1) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-600" />
                Tambah Faktor Isu & Dampak Sosial
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Pemilihan: Dari Menu 1 vs Input Manual */}
            <div className="flex items-center gap-2 pt-4 pb-2">
              <button
                type="button"
                onClick={() => setIsManualInput(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !isManualInput 
                    ? 'bg-orange-100 text-orange-800 border border-orange-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                Pilih Program RPJMD (Menu 1)
              </button>
              <button
                type="button"
                onClick={() => setIsManualInput(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isManualInput 
                    ? 'bg-orange-100 text-orange-800 border border-orange-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                Input Manual
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-2">
              {!isManualInput ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Program RPJMD (dari Menu 1) *
                  </label>
                  <select
                    value={selectedMenu1Program}
                    onChange={e => handleSelectProgramFromMenu1(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Pilih Program RPJMD --</option>
                    {menu1Programs.map((p, idx) => (
                      <option key={`${p.programRpjmd}-${idx}`} value={p.programRpjmd}>
                        {p.programRpjmd} {p.opdPengampu ? `(${p.opdPengampu})` : '(OPD belum diisi)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nama OPD dan program diambil otomatis dari kolom RPJMD Menu 1.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Program *</label>
                  <input
                    type="text"
                    required
                    value={newItem.program}
                    onChange={e => setNewItem({ ...newItem, program: e.target.value })}
                    placeholder="Contoh: Program Peningkatan Kualitas Layanan Kesehatan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perangkat Daerah (OPD Pengampu) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newItem.namaOPD}
                    onChange={e => setNewItem({ ...newItem, namaOPD: e.target.value })}
                    placeholder="Contoh: Dinas Kesehatan"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
                  />
                  {!isManualInput && newItem.namaOPD && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      Terkoneksi Menu 1
                    </span>
                  )}
                </div>
                {!isManualInput && !newItem.namaOPD && selectedMenu1Program && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    * OPD untuk program ini belum diisi di Menu 1. Anda dapat mengetiknya di sini atau melengkapinya di Menu 1.
                  </p>
                )}
              </div>

              {/* Kriteria Checklist / Tri-State */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800">Indikator Kriteria Isu & Dampak Sosial:</span>

                {/* Kriteria 1 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">1. Mendapat Sorotan Publik / Media Massa</span>
                      <span className="text-[11px] text-slate-500">Keluhan publik, pengaduan SP4N-LAPOR, liputan pers</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      newItem.sorotanMasyarakat === 1 ? 'bg-orange-100 text-orange-800' : newItem.sorotanMasyarakat === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {newItem.sorotanMasyarakat === 1 ? 'Ya (1)' : newItem.sorotanMasyarakat === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, sorotanMasyarakat: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.sorotanMasyarakat === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, sorotanMasyarakat: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.sorotanMasyarakat === 1 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, sorotanMasyarakat: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.sorotanMasyarakat === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 2 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">2. Terkait Isu Prioritas Nasional / Stranas PK</span>
                      <span className="text-[11px] text-slate-500">Stunting, kemiskinan ekstrem, inflasi daerah, P3DN</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      newItem.isuNasional === 1 ? 'bg-orange-100 text-orange-800' : newItem.isuNasional === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {newItem.isuNasional === 1 ? 'Ya (1)' : newItem.isuNasional === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, isuNasional: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.isuNasional === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, isuNasional: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.isuNasional === 1 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, isuNasional: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.isuNasional === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 3 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">3. Pelayanan Publik Dasar (SPM)</span>
                      <span className="text-[11px] text-slate-500">Kesehatan, pendidikan, sosial, PU, perumahan rakyat</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      newItem.layananPublik === 1 ? 'bg-cyan-100 text-cyan-800' : newItem.layananPublik === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {newItem.layananPublik === 1 ? 'Ya (1)' : newItem.layananPublik === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, layananPublik: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.layananPublik === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, layananPublik: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.layananPublik === 1 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, layananPublik: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.layananPublik === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 4 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">4. Menyangkut Hajat Hidup Orang Banyak</span>
                      <span className="text-[11px] text-slate-500">Keselamatan, kebutuhan air bersih, pangan, ketertiban</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      newItem.hajatHidup === 1 ? 'bg-purple-100 text-purple-800' : newItem.hajatHidup === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {newItem.hajatHidup === 1 ? 'Ya (1)' : newItem.hajatHidup === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, hajatHidup: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.hajatHidup === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, hajatHidup: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.hajatHidup === 1 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, hajatHidup: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        newItem.hajatHidup === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Preview Nilai & Skala */}
                <div className="bg-orange-50 p-2.5 rounded-lg border border-orange-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-orange-900 font-medium">Hasil Penilaian Awal:</span>
                  <div className="flex items-center gap-2">
                    {newItem.sorotanMasyarakat !== -1 && newItem.isuNasional !== -1 && newItem.layananPublik !== -1 && newItem.hajatHidup !== -1 ? (
                      <>
                        <span className="font-bold text-orange-900">
                          Skor: {newItem.sorotanMasyarakat + newItem.isuNasional + newItem.layananPublik + newItem.hajatHidup}/4
                        </span>
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-900 font-extrabold rounded">
                          Skala {calculateSkala(newItem.sorotanMasyarakat + newItem.isuNasional + newItem.layananPublik + newItem.hajatHidup)}
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded border border-amber-300">
                        Belum Lengkap (Skor Belum Muncul)
                      </span>
                    )}
                  </div>
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
                  disabled={!newItem.program.trim()}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-600" />
                Edit Faktor Isu & Dampak Sosial (#{editingItem.no})
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Nama Program (RPJMD)</label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari RPJMD
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={editingItem.program}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Perangkat Daerah (OPD Pengampu)</label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Terkunci dari Menu 1
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={editingItem.namaOPD || '(Belum diisi di Menu 1)'}
                    className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Kriteria Checklist / Tri-State Edit */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800">Indikator Kriteria:</span>

                {/* Kriteria 1 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">1. Mendapat Sorotan Publik / Media Massa</span>
                      <span className="text-[11px] text-slate-500">Keluhan publik, pengaduan SP4N-LAPOR, liputan pers</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      editingItem.sorotanMasyarakat === 1 ? 'bg-orange-100 text-orange-800' : editingItem.sorotanMasyarakat === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {editingItem.sorotanMasyarakat === 1 ? 'Ya (1)' : editingItem.sorotanMasyarakat === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, sorotanMasyarakat: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.sorotanMasyarakat === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, sorotanMasyarakat: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.sorotanMasyarakat === 1 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, sorotanMasyarakat: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.sorotanMasyarakat === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 2 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">2. Terkait Isu Prioritas Nasional / Stranas PK</span>
                      <span className="text-[11px] text-slate-500">Stunting, kemiskinan ekstrem, inflasi daerah, P3DN</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      editingItem.isuNasional === 1 ? 'bg-orange-100 text-orange-800' : editingItem.isuNasional === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {editingItem.isuNasional === 1 ? 'Ya (1)' : editingItem.isuNasional === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, isuNasional: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.isuNasional === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, isuNasional: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.isuNasional === 1 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, isuNasional: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.isuNasional === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 3 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">3. Pelayanan Publik Dasar (SPM)</span>
                      <span className="text-[11px] text-slate-500">Kesehatan, pendidikan, sosial, PU, perumahan rakyat</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      editingItem.layananPublik === 1 ? 'bg-cyan-100 text-cyan-800' : editingItem.layananPublik === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {editingItem.layananPublik === 1 ? 'Ya (1)' : editingItem.layananPublik === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, layananPublik: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.layananPublik === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, layananPublik: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.layananPublik === 1 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, layananPublik: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.layananPublik === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Kriteria 4 */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 block">4. Menyangkut Hajat Hidup Orang Banyak</span>
                      <span className="text-[11px] text-slate-500">Keselamatan, kebutuhan air bersih, pangan, ketertiban</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      editingItem.hajatHidup === 1 ? 'bg-purple-100 text-purple-800' : editingItem.hajatHidup === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {editingItem.hajatHidup === 1 ? 'Ya (1)' : editingItem.hajatHidup === 0 ? 'Tidak (0)' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, hajatHidup: -1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.hajatHidup === -1 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, hajatHidup: 1 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.hajatHidup === 1 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ya (1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, hajatHidup: 0 })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        editingItem.hajatHidup === 0 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tidak (0)
                    </button>
                  </div>
                </div>

                {/* Preview Hasil Edit */}
                <div className="bg-orange-50 p-2.5 rounded-lg border border-orange-200 flex items-center justify-between text-xs mt-2">
                  <span className="text-orange-900 font-medium">Hasil Penilaian:</span>
                  <div className="flex items-center gap-2">
                    {editingItem.sorotanMasyarakat !== -1 && editingItem.isuNasional !== -1 && editingItem.layananPublik !== -1 && editingItem.hajatHidup !== -1 ? (
                      <>
                        <span className="font-bold text-orange-900">
                          Skor: {editingItem.sorotanMasyarakat + editingItem.isuNasional + editingItem.layananPublik + editingItem.hajatHidup}/4
                        </span>
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-900 font-extrabold rounded">
                          Skala {calculateSkala(editingItem.sorotanMasyarakat + editingItem.isuNasional + editingItem.layananPublik + editingItem.hajatHidup)}
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded border border-amber-300">
                        Belum Lengkap (Skor Belum Muncul)
                      </span>
                    )}
                  </div>
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
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SINKRONISASI DARI MENU 1 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Sinkronisasi Program & OPD dari Menu 1
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menyelaraskan daftar Program RPJMD dan OPD Pengampu dari Audit Universe (Menu 1)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Summary Cards */}
            <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
              <div 
                onClick={() => setSyncFilter('ALL')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Total Program Menu 1
                </span>
                <span className="text-lg font-bold">{syncComparison.totalMenu1}</span>
              </div>

              <div 
                onClick={() => setSyncFilter('NEW')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'NEW' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'NEW' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                  Program Baru (Belum ada)
                </span>
                <span className="text-lg font-bold">{syncComparison.countNew}</span>
              </div>

              <div 
                onClick={() => setSyncFilter('DIFF_OPD')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  syncFilter === 'DIFF_OPD' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className={`text-[11px] block ${syncFilter === 'DIFF_OPD' ? 'text-amber-100' : 'text-amber-600'}`}>
                  Perbedaan OPD Pengampu
                </span>
                <span className="text-lg font-bold">{syncComparison.countDiffOpd}</span>
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program dalam daftar Menu 1..."
                  value={syncSearch}
                  onChange={e => setSyncSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedSyncPrograms(menu1Programs.map(p => p.programRpjmd))}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSyncPrograms([])}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            {/* Comparison Program List */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {syncComparison.listWithStatus
                .filter(item => {
                  if (syncFilter === 'NEW') return item.status === 'NEW';
                  if (syncFilter === 'DIFF_OPD') return item.status === 'DIFF_OPD';
                  return true;
                })
                .filter(item => 
                  (item.programRpjmd || '').toLowerCase().includes(syncSearch.toLowerCase()) ||
                  (item.opdPengampu || '').toLowerCase().includes(syncSearch.toLowerCase())
                )
                .map(item => {
                  const isChecked = selectedSyncPrograms.includes(item.programRpjmd);
                  return (
                    <div 
                      key={item.programRpjmd} 
                      className="p-2.5 flex items-start gap-3 hover:bg-slate-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedSyncPrograms([...selectedSyncPrograms, item.programRpjmd]);
                          } else {
                            setSelectedSyncPrograms(selectedSyncPrograms.filter(p => p !== item.programRpjmd));
                          }
                        }}
                        className="rounded text-orange-600 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.programRpjmd}
                          </span>
                          {item.status === 'NEW' && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                              Program Baru
                            </span>
                          )}
                          {item.status === 'DIFF_OPD' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              OPD Berbeda
                            </span>
                          )}
                          {item.status === 'SAME' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Sudah Sesuai
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            OPD di Menu 1: <strong className="text-slate-700">{item.opdPengampu || '(Belum diisi)'}</strong>
                          </span>
                          {item.status === 'DIFF_OPD' && (
                            <span className="text-amber-700">
                              (Di Menu 7 saat ini: {item.currentOpdInMenu || '-'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Sync Actions Footer */}
            <div className="pt-4 mt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500">
                Terpilih: <strong>{selectedSyncPrograms.length}</strong> dari {menu1Programs.length} Program
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {syncComparison.countDiffOpd > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyUpdateOpdOnly}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    title="Hanya memperbarui nama OPD di Menu 7 tanpa mengubah status checklist kriteria"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Perbarui OPD Saja</span>
                  </button>
                )}

                {syncComparison.countNew > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAddNewOnly}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    title="Hanya menambahkan program yang belum ada di tabel Menu 7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Program Baru ({syncComparison.countNew})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyFullSync}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Sinkronisasi Penuh</span>
                </button>
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
