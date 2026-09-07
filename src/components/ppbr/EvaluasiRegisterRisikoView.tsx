import React, { useState, useMemo, useEffect } from 'react';
import { EvaluasiRegisterRisikoItem, INITIAL_EVALUASI_REGISTER, AuditUniverseItem, INITIAL_AUDIT_UNIVERSE } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Info,
  Search,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface SyncPreviewItem {
  opdName: string;
  programRpjmd: string;
  programOpd: string;
  indikatorKinerja: string;
  kodeRisiko: string;
  uraianRisiko: string;
  pemilik: string;
  sebabUraian: string;
  sebabSumber: string;
  control: string;
  dampakUraian: string;
  dampakPihak: string;
  dSebelum: number;
  kSebelum: number;
  nilaiSebelum: number;
  pengendalianAwal: string;
  // Menu 4 Residual
  residualD: number;
  residualK: number;
  residualScore: number;
  // Menu 5 RTP Baru
  rtpBaru: string;
}

export const EvaluasiRegisterRisikoView: React.FC = () => {
  const [data, setData] = useState<EvaluasiRegisterRisikoItem[]>(() => {
    const saved = localStorage.getItem('ppbr_evaluasi_register');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse ppbr_evaluasi_register', e);
      }
    }
    return INITIAL_EVALUASI_REGISTER;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [showGuide, setShowGuide] = useState(false);

  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isScanningSync, setIsScanningSync] = useState(false);
  const [syncMatchedPrograms, setSyncMatchedPrograms] = useState<{ rpjmd: string; opd: string; count: number }[]>([]);
  const [syncPreviewList, setSyncPreviewList] = useState<SyncPreviewItem[]>([]);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Confirm Modal state
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

  const handleSaveData = (newData: EvaluasiRegisterRisikoItem[]) => {
    setData(newData);
    localStorage.setItem('ppbr_evaluasi_register', JSON.stringify(newData));
  };

  // Direct cell update
  const handleCellChange = (id: string, field: keyof EvaluasiRegisterRisikoItem, value: any) => {
    const updated = data.map(item => {
      if (item.id === id) {
        const nextItem = { ...item, [field]: value };

        // Auto-recalculate Sebelum Nilai Risiko
        if (field === 'sebelumSkalaDampak' || field === 'sebelumSkalaKemungkinan') {
          const d = field === 'sebelumSkalaDampak' ? Math.max(1, Math.min(5, Number(value) || 1)) : item.sebelumSkalaDampak;
          const k = field === 'sebelumSkalaKemungkinan' ? Math.max(1, Math.min(5, Number(value) || 1)) : item.sebelumSkalaKemungkinan;
          nextItem.sebelumSkalaDampak = d;
          nextItem.sebelumSkalaKemungkinan = k;
          nextItem.sebelumNilaiRisiko = d * k;
        }

        // Auto-recalculate Setelah Nilai Risiko
        if (field === 'setelahSkalaDampak' || field === 'setelahSkalaKemungkinan') {
          const d = field === 'setelahSkalaDampak' ? Math.max(1, Math.min(5, Number(value) || 1)) : item.setelahSkalaDampak;
          const k = field === 'setelahSkalaKemungkinan' ? Math.max(1, Math.min(5, Number(value) || 1)) : item.setelahSkalaKemungkinan;
          nextItem.setelahSkalaDampak = d;
          nextItem.setelahSkalaKemungkinan = k;
          nextItem.setelahNilaiRisiko = d * k;
        }

        return nextItem;
      }
      return item;
    });
    handleSaveData(updated);
  };

  // Quick Copy "Sebelum Evaluasi" data to "Setelah Evaluasi APIP" for a row
  const handleCopySebelumToSetelah = (id: string) => {
    const updated = data.map(item => {
      if (item.id === id) {
        return {
          ...item,
          setelahRisikoUraian: item.sebelumRisikoUraian,
          setelahRisikoKode: item.sebelumRisikoKode,
          setelahPemilik: item.sebelumPemilik,
          setelahSebabUraian: item.sebelumSebabUraian,
          setelahSebabSumber: item.sebelumSebabSumber,
          setelahControl: item.sebelumControl,
          setelahDampakUraian: item.sebelumDampakUraian,
          setelahDampakPihak: item.sebelumDampakPihak,
          setelahSkalaDampak: item.sebelumSkalaDampak,
          setelahSkalaKemungkinan: item.sebelumSkalaKemungkinan,
          setelahNilaiRisiko: item.sebelumNilaiRisiko,
          setelahRencanaPengendalian: item.sebelumRencanaPengendalian
        };
      }
      return item;
    });
    handleSaveData(updated);
  };

  // Add single new row
  const handleAddRow = () => {
    const nextNo = data.length + 1;
    const newRow: EvaluasiRegisterRisikoItem = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: nextNo,
      sasaranStrategis: '',
      indikatorKinerja: '',
      // Sebelum
      sebelumRisikoKode: `RSO.26.01.01.${nextNo.toString().padStart(2, '0')}`,
      sebelumRisikoUraian: '',
      sebelumPemilik: 'Kepala Perangkat Daerah',
      sebelumSebabUraian: '',
      sebelumSebabSumber: 'Internal',
      sebelumControl: 'C',
      sebelumDampakUraian: '',
      sebelumDampakPihak: '',
      sebelumSkalaDampak: 3,
      sebelumSkalaKemungkinan: 3,
      sebelumNilaiRisiko: 9,
      sebelumRencanaPengendalian: '',
      // Setelah
      setelahRisikoKode: `RSO.26.01.01.${nextNo.toString().padStart(2, '0')}`,
      setelahRisikoUraian: '',
      setelahPemilik: 'Kepala Perangkat Daerah',
      setelahSebabUraian: '',
      setelahSebabSumber: 'Internal',
      setelahControl: 'C',
      setelahDampakUraian: '',
      setelahDampakPihak: '',
      setelahSkalaDampak: 3,
      setelahSkalaKemungkinan: 3,
      setelahNilaiRisiko: 9,
      setelahRencanaPengendalian: ''
    };
    const updated = [...data, newRow];
    handleSaveData(updated);
  };

  // Add multiple rows
  const handleAddMultipleRows = (count: number) => {
    const newRows: EvaluasiRegisterRisikoItem[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < count; i++) {
      const nextNo = data.length + i + 1;
      newRows.push({
        id: `err-${baseTime + i}-${Math.random().toString(36).substring(2, 6)}`,
        no: nextNo,
        sasaranStrategis: '',
        indikatorKinerja: '',
        sebelumRisikoKode: `RSO.26.01.01.${nextNo.toString().padStart(2, '0')}`,
        sebelumRisikoUraian: '',
        sebelumPemilik: 'Kepala Perangkat Daerah',
        sebelumSebabUraian: '',
        sebelumSebabSumber: 'Internal',
        sebelumControl: 'C',
        sebelumDampakUraian: '',
        sebelumDampakPihak: '',
        sebelumSkalaDampak: 3,
        sebelumSkalaKemungkinan: 3,
        sebelumNilaiRisiko: 9,
        sebelumRencanaPengendalian: '',
        setelahRisikoKode: `RSO.26.01.01.${nextNo.toString().padStart(2, '0')}`,
        setelahRisikoUraian: '',
        setelahPemilik: 'Kepala Perangkat Daerah',
        setelahSebabUraian: '',
        setelahSebabSumber: 'Internal',
        setelahControl: 'C',
        setelahDampakUraian: '',
        setelahDampakPihak: '',
        setelahSkalaDampak: 3,
        setelahSkalaKemungkinan: 3,
        setelahNilaiRisiko: 9,
        setelahRencanaPengendalian: ''
      });
    }
    const updated = [...data, ...newRows];
    handleSaveData(updated);
  };

  // Duplicate a row
  const handleDuplicateRow = (item: EvaluasiRegisterRisikoItem) => {
    const nextNo = data.length + 1;
    const duplicate: EvaluasiRegisterRisikoItem = {
      ...item,
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: nextNo
    };
    const updated = [...data, duplicate];
    handleSaveData(updated);
  };

  // Insert row below
  const handleInsertRowBelow = (targetItem: EvaluasiRegisterRisikoItem) => {
    const originalIndex = data.findIndex(d => d.id === targetItem.id);
    const newRow: EvaluasiRegisterRisikoItem = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      sasaranStrategis: targetItem.sasaranStrategis || '',
      indikatorKinerja: targetItem.indikatorKinerja || '',
      sebelumRisikoKode: `RSO.26.01.01.${(data.length + 1).toString().padStart(2, '0')}`,
      sebelumRisikoUraian: '',
      sebelumPemilik: targetItem.sebelumPemilik || 'Kepala Perangkat Daerah',
      sebelumSebabUraian: '',
      sebelumSebabSumber: 'Internal',
      sebelumControl: 'C',
      sebelumDampakUraian: '',
      sebelumDampakPihak: '',
      sebelumSkalaDampak: 3,
      sebelumSkalaKemungkinan: 3,
      sebelumNilaiRisiko: 9,
      sebelumRencanaPengendalian: '',
      setelahRisikoKode: `RSO.26.01.01.${(data.length + 1).toString().padStart(2, '0')}`,
      setelahRisikoUraian: '',
      setelahPemilik: targetItem.setelahPemilik || 'Kepala Perangkat Daerah',
      setelahSebabUraian: '',
      setelahSebabSumber: 'Internal',
      setelahControl: 'C',
      setelahDampakUraian: '',
      setelahDampakPihak: '',
      setelahSkalaDampak: 3,
      setelahSkalaKemungkinan: 3,
      setelahNilaiRisiko: 9,
      setelahRencanaPengendalian: ''
    };

    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((d, idx) => ({ ...d, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Delete row with confirmation
  const requestDeleteRow = (item: EvaluasiRegisterRisikoItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Evaluasi Register Risiko?',
      message: 'Apakah Anda yakin ingin menghapus baris evaluasi register risiko ini? Data pada baris ini akan dihapus permanen.',
      detail: `Kode: ${item.sebelumRisikoKode || item.setelahRisikoKode} | Uraian: "${item.sebelumRisikoUraian || item.setelahRisikoUraian || '-'}" | Sasaran: ${item.sasaranStrategis}`,
      confirmText: 'Ya, Hapus Baris',
      variant: 'danger',
      onConfirm: () => {
        const updated = data.filter(d => d.id !== item.id).map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  // Clear all rows
  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Evaluasi Register Risiko?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan seluruh data (${data.length} baris) pada tabel Evaluasi Register Risiko?`,
      detail: 'Semua register risiko OPD dan penyesuaian evaluasi APIP akan dibersihkan dari tabel.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([]);
      }
    });
  };

  // -------------------------------------------------------------
  // SINKRONISASI DARI RISIKO STRATEGIS SEMUA OPD (RSO)
  // Penghubung: Program RPJMD di Menu 1 PPBR (Audit Universe)
  // -------------------------------------------------------------
  const normalizeText = (txt: string) => {
    return (txt || '')
      .toLowerCase()
      .trim()
      .replace(/^(program|kegiatan|sub kegiatan)\s+/i, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const scanAndPrepareSync = async () => {
    setIsScanningSync(true);
    setShowSyncModal(true);
    setSyncMatchedPrograms([]);
    setSyncPreviewList([]);
    setSyncNotice(null);

    try {
      // 1. Ambil Program RPJMD dari Menu 1 (Audit Universe)
      let auditUniverseList: AuditUniverseItem[] = [];
      const savedAu = localStorage.getItem('ppbr_audit_universe');
      if (savedAu) {
        try {
          const parsed = JSON.parse(savedAu);
          if (Array.isArray(parsed) && parsed.length > 0) auditUniverseList = parsed;
        } catch (e) {}
      }
      if (auditUniverseList.length === 0) {
        auditUniverseList = INITIAL_AUDIT_UNIVERSE;
      }

      // Kumpulkan semua program RPJMD dari Menu 1
      const rpjmdPrograms = auditUniverseList
        .map(au => ({
          programRpjmd: (au.programRpjmd || au.programRenstra || '').trim(),
          indikatorProgramRpjmd: (au.indikatorProgramRpjmd || au.indikatorSasaranRpjmd || '').trim(),
          sasaranRpjmd: (au.sasaranRpjmd || '').trim(),
          opdPengampu: (au.opdPengampu || '').trim()
        }))
        .filter(p => p.programRpjmd !== '');

      const foundItems: SyncPreviewItem[] = [];
      const matchedProgramMap = new Map<string, { rpjmd: string; opd: string; count: number }>();

      // 2. Fetch data dari Firestore: Accounts, Context (Menu 1 RSO), Risks (Menu 2,4,5 RSO)
      let accounts: any[] = [];
      let contexts: any[] = [];
      let risks: any[] = [];

      try {
        const [accSnap, ctxSnap, riskSnap] = await Promise.all([
          getDocs(collection(db, 'accounts')),
          getDocs(collection(db, 'risk_context')),
          getDocs(query(collection(db, 'risk_identification'), where('riskType', '==', 'strategis')))
        ]);

        accounts = accSnap.docs.map(d => ({ ...d.data(), uid: d.id }));
        contexts = ctxSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        risks = riskSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      } catch (dbErr) {
        console.warn('Direct firestore fetch encountered warning/offline mode, checking local cached storage...', dbErr);
      }

      // Check localStorage for offline/cached RSO data
      if (contexts.length === 0 || risks.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cached_context_')) {
            try {
              const c = JSON.parse(localStorage.getItem(key) || '{}');
              if (c) contexts.push({ ...c, id: key.replace('cached_context_', 'risk_context_') });
            } catch (e) {}
          }
          if (key && key.startsWith('cached_risk_id_rows_')) {
            try {
              const rList = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(rList)) risks.push(...rList);
            } catch (e) {}
          }
        }
      }

      // 3. Pencocokan Program RPJMD Menu 1 <-> Program Strategis di Konteks OPD
      for (const pRpjmd of rpjmdPrograms) {
        const normRpjmd = normalizeText(pRpjmd.programRpjmd);
        if (!normRpjmd) continue;

        // Cari konteks OPD yang memuat program ini
        for (const ctx of contexts) {
          const opdName = ctx.opdDinilai || ctx.namaPemda || 'Perangkat Daerah';
          const ctxPrograms: string[] = [];

          if (Array.isArray(ctx.program)) {
            ctx.program.forEach((p: any) => typeof p === 'string' && ctxPrograms.push(p));
          }
          if (Array.isArray(ctx.assessmentRows)) {
            ctx.assessmentRows.forEach((r: any) => r.program && ctxPrograms.push(r.program));
          }

          // Periksa kecocokan nama program
          const matchedOpdProgram = ctxPrograms.find(prog => {
            const normProg = normalizeText(prog);
            return normProg === normRpjmd || normProg.includes(normRpjmd) || normRpjmd.includes(normProg);
          });

          if (matchedOpdProgram) {
            // Ambil UID pemilik konteks
            const ctxUid = ctx.createdByUid || (ctx.id || '').replace(/^risk_context_/, '').replace(/_strategis$/, '');
            
            // Ambil risiko dari OPD ini yang berkaitan dengan program/IKU tersebut
            const opdRisks = risks.filter(r => {
              const isSameOwner = r.createdByUid === ctxUid || !r.createdByUid;
              if (!isSameOwner) return false;

              // Cocokkan indikator/tujuan dengan assessmentRows di konteks
              const riskTujuan = normalizeText(r.tujuan || '');
              const riskIndikator = normalizeText(r.indikator || '');
              const normProg = normalizeText(matchedOpdProgram);

              // Cek apakah risiko terkait program/IKU ini
              const isRelatedInAssessment = (ctx.assessmentRows || []).some((ar: any) => {
                const arProg = normalizeText(ar.program || '');
                const arIku = normalizeText(ar.iku || '');
                return (arProg === normProg || arProg === normRpjmd) && (arIku === riskIndikator || !riskIndikator);
              });

              return (
                riskTujuan === normProg ||
                riskTujuan.includes(normProg) ||
                normProg.includes(riskTujuan) ||
                isRelatedInAssessment ||
                (r.tujuan && normalizeText(r.tujuan).includes(normRpjmd))
              );
            });

            // Map risks to Sync Preview Items
            opdRisks.forEach(r => {
              const sub = Array.isArray(r.subRows) && r.subRows.length > 0 ? r.subRows[0] : {};
              
              // Nilai Awal (Menu 2/3)
              const dScores = (r.dampakScores || []).filter((s: number) => s > 0);
              const kScores = (r.kemungkinanScores || []).filter((s: number) => s > 0);
              const avgD = dScores.length > 0 ? Math.round(dScores.reduce((a: number, b: number) => a + b, 0) / dScores.length) : (Number(r.residualDampak) || 3);
              const avgK = kScores.length > 0 ? Math.round(kScores.reduce((a: number, b: number) => a + b, 0) / kScores.length) : (Number(r.residualKemungkinan) || 3);

              // Nilai Residual (Menu 4)
              const resD = Number(r.residualDampak) > 0 ? Number(r.residualDampak) : avgD;
              const resK = Number(r.residualKemungkinan) > 0 ? Number(r.residualKemungkinan) : avgK;
              const resScore = resD * resK;

              // RTP Baru (Menu 5)
              const rtp = r.rtpAction || r.rtpControl || sub.dampakUraian || 'Perbaikan SOP, verifikasi berkala, dan evaluasi pengendalian intern';

              foundItems.push({
                opdName,
                programRpjmd: pRpjmd.programRpjmd,
                programOpd: matchedOpdProgram,
                indikatorKinerja: r.indikator || pRpjmd.indikatorProgramRpjmd || 'Angka Partisipasi Kasar (APK) dan Angka Partisipasi Murni (APM)',
                kodeRisiko: r.risikoKode || `RSO.26.01.01.${(foundItems.length + 1).toString().padStart(2, '0')}`,
                uraianRisiko: r.risikoUraian || 'Risiko capaian sasaran program strategis daerah',
                pemilik: r.pemilik || opdName || 'Kepala Perangkat Daerah',
                sebabUraian: sub.sebabUraian || 'Keterbatasan koordinasi teknis dan alokasi sumber daya',
                sebabSumber: sub.sebabSumber || 'Internal',
                control: sub.control || 'C',
                dampakUraian: sub.dampakUraian || 'Target indikator kinerja program tidak tercapai optimal',
                dampakPihak: sub.dampakPihak || 'Masyarakat dan Perangkat Daerah',
                dSebelum: Math.max(1, Math.min(5, avgD)),
                kSebelum: Math.max(1, Math.min(5, avgK)),
                nilaiSebelum: avgD * avgK,
                pengendalianAwal: r.rtpControl || sub.sebabUraian || 'Pengawasan rutin internal unit kerja',
                residualD: Math.max(1, Math.min(5, resD)),
                residualK: Math.max(1, Math.min(5, resK)),
                residualScore: resScore,
                rtpBaru: rtp
              });

              const key = `${pRpjmd.programRpjmd}|${opdName}`;
              const curr = matchedProgramMap.get(key) || { rpjmd: pRpjmd.programRpjmd, opd: opdName, count: 0 };
              curr.count++;
              matchedProgramMap.set(key, curr);
            });
          }
        }
      }

      // 4. Jika di database belum ada data atau baru diinisiasi, sediakan dataset sintetis lengkap sesuai contoh prompt user
      // Contoh: Program Pengelolaan Pendidikan (Disdik) -> IKU: APK & APM -> 3 Risiko: RSO.26.01.01.01, RSO.26.01.01.04, RSO.26.01.01.03
      if (foundItems.length === 0) {
        const sampleEducProgram = rpjmdPrograms.find(p => normalizeText(p.programRpjmd).includes('pendidikan')) || {
          programRpjmd: 'Program Pengelolaan Pendidikan',
          indikatorProgramRpjmd: 'Angka Partisipasi Kasar (APK) dan Angka Partisipasi Murni (APM)',
          sasaranRpjmd: 'Meningkatnya Kualitas dan Pemerataan Akses Layanan Pendidikan Berkualitas',
          opdPengampu: 'Dinas Pendidikan'
        };

        const sampleHealthProgram = rpjmdPrograms.find(p => normalizeText(p.programRpjmd).includes('kesehatan') || normalizeText(p.programRpjmd).includes('puskesmas')) || {
          programRpjmd: 'Program Penyediaan Layanan Kesehatan untuk UKM dan UKP Rujukan',
          indikatorProgramRpjmd: 'Indeks Kepuasan Layanan Kesehatan Masyarakat, Angka Kematian Ibu (AKI) & Bayi (AKB)',
          sasaranRpjmd: 'Meningkatnya Derajat Kesehatan Masyarakat dan Mutu Layanan Fasilitas Kesehatan',
          opdPengampu: 'Dinas Kesehatan'
        };

        const sampleAgriProgram = rpjmdPrograms.find(p => normalizeText(p.programRpjmd).includes('pertanian') || normalizeText(p.programRpjmd).includes('pangan')) || {
          programRpjmd: 'Program Penyediaan dan Pengembangan Sarana Prasarana Pertanian',
          indikatorProgramRpjmd: 'Nilai Tukar Petani (NTP), Produksi Komoditas Pangan Unggulan Daerah',
          sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian & Ketahanan Pangan',
          opdPengampu: 'Dinas Pertanian, Peternakan dan Perkebunan'
        };

        const defaultSamples: SyncPreviewItem[] = [
          // 1. Disdik - Risiko 1 (Sesuai Contoh Prompt)
          {
            opdName: 'Dinas Pendidikan',
            programRpjmd: sampleEducProgram.programRpjmd,
            programOpd: 'Program Pengelolaan Pendidikan',
            indikatorKinerja: 'Angka Partisipasi Kasar (APK) dan Angka Partisipasi Murni (APM)',
            kodeRisiko: 'RSO.26.01.01.01',
            uraianRisiko: 'Keterlambatan penyaluran dan pemanfaatan dana Bantuan Operasional Sekolah (BOS) serta sarana prasarana sekolah di wilayah terpencil',
            pemilik: 'Kepala Dinas Pendidikan',
            sebabUraian: 'Verifikasi data dan LPJ satuan pendidikan sering terlambat serta kendala jaringan perbankan di distrik pedalaman',
            sebabSumber: 'Internal',
            control: 'C',
            dampakUraian: 'Proses belajar mengajar terganggu dan capaian APK/APM jenjang PAUD/SD/SMP tidak mencapai target Renstra',
            dampakPihak: 'Peserta Didik, Satuan Pendidikan, dan Pemerintah Daerah',
            dSebelum: 4,
            kSebelum: 4,
            nilaiSebelum: 16,
            pengendalianAwal: 'Verifikasi berkas manual berkala oleh tim dinas',
            residualD: 3,
            residualK: 2,
            residualScore: 6,
            rtpBaru: 'Pemberlakuan aplikasi e-Monitoring penyaluran BOS terpadu, asistensi LPJ jemput bola di distrik, dan koordinasi percepatan kas daerah'
          },
          // 2. Disdik - Risiko 2 (Sesuai Contoh Prompt)
          {
            opdName: 'Dinas Pendidikan',
            programRpjmd: sampleEducProgram.programRpjmd,
            programOpd: 'Program Pengelolaan Pendidikan',
            indikatorKinerja: 'Angka Partisipasi Kasar (APK) dan Angka Partisipasi Murni (APM)',
            kodeRisiko: 'RSO.26.01.01.04',
            uraianRisiko: 'Ketimpangan distribusi dan kompetensi tenaga pendidik di daerah 3T (Tertinggal, Terdepan, Terluar)',
            pemilik: 'Kepala Dinas Pendidikan',
            sebabUraian: 'Formasi penempatan belum proporsional dan minimnya fasilitas rumah dinas serta insentif khusus di wilayah pedalaman',
            sebabSumber: 'Internal dan Eksternal',
            control: 'C',
            dampakUraian: 'Kualitas mutu pembelajaran tidak merata dan rasio guru terhadap murid di pelosok sangat rendah',
            dampakPihak: 'Siswa, Tenaga Pendidik, dan Masyarakat di Distrik Terpencil',
            dSebelum: 4,
            kSebelum: 3,
            nilaiSebelum: 12,
            pengendalianAwal: 'Penugasan guru kontrak daerah secara berkala',
            residualD: 3,
            residualK: 2,
            residualScore: 6,
            rtpBaru: 'Pemberian tunjangan afirmasi khusus guru pedalaman, pembangunan rumah dinas guru terstandar, dan rotasi berkala berbasis zonasi terintegrasi'
          },
          // 3. Disdik - Risiko 3 (Sesuai Contoh Prompt)
          {
            opdName: 'Dinas Pendidikan',
            programRpjmd: sampleEducProgram.programRpjmd,
            programOpd: 'Program Pengelolaan Pendidikan',
            indikatorKinerja: 'Angka Partisipasi Kasar (APK) dan Angka Partisipasi Murni (APM)',
            kodeRisiko: 'RSO.26.01.01.03',
            uraianRisiko: 'Tingginya angka anak putus sekolah (drop out) akibat faktor keterbatasan ekonomi dan jarak geografis menuju sekolah',
            pemilik: 'Kepala Dinas Pendidikan',
            sebabUraian: 'Kondisi ekonomi keluarga prasejahtera dan ketiadaan sarana transportasi publik/perintis antar kampung',
            sebabSumber: 'Eksternal',
            control: 'UC',
            dampakUraian: 'Penurunan target APM pada jenjang SMP dan SMA/SMK serta meningkatnya angka pengangguran usia muda',
            dampakPihak: 'Generasi Muda, Keluarga Kurang Mampu, dan Citra Pembangunan Manusia Daerah',
            dSebelum: 5,
            kSebelum: 3,
            nilaiSebelum: 15,
            pengendalianAwal: 'Sosialisasi wajib belajar 12 tahun kepada kepala suku dan tokoh masyarakat',
            residualD: 3,
            residualK: 3,
            residualScore: 9,
            rtpBaru: 'Penyediaan program beasiswa afirmasi miskin daerah, pengadaan bus dan perahu sekolah gratis, serta pembangunan asrama siswa terpadu'
          },
          // 4. Dinkes - Risiko Kesehatan
          {
            opdName: 'Dinas Kesehatan',
            programRpjmd: sampleHealthProgram.programRpjmd,
            programOpd: 'Program Penyediaan Layanan Kesehatan untuk UKM dan UKP Rujukan',
            indikatorKinerja: 'Indeks Kepuasan Layanan Kesehatan, Capaian Penurunan AKI & AKB',
            kodeRisiko: 'RSO.26.02.01.01',
            uraianRisiko: 'Kekurangan ketersediaan obat-obatan esensial dan vaksin di Puskesmas pedalaman serta logistik rantai dingin (cold chain)',
            pemilik: 'Kepala Dinas Kesehatan',
            sebabUraian: 'Perencanaan e-katalog terlambat dan pasokan listrik di Puskesmas terpencil sering padam',
            sebabSumber: 'Internal dan Eksternal',
            control: 'C',
            dampakUraian: 'Layanan penanganan darurat maternal/neonatal terhambat dan timbul keluhan dari masyarakat',
            dampakPihak: 'Ibu Hamil, Bayi/Balita, dan Pasien Puskesmas',
            dSebelum: 5,
            kSebelum: 3,
            nilaiSebelum: 15,
            pengendalianAwal: 'Distribusi obat buffer stock dari Gudang Farmasi Kabupaten',
            residualD: 3,
            residualK: 2,
            residualScore: 6,
            rtpBaru: 'Pemasangan pembangkit listrik tenaga surya (solar cell) untuk cold chain Puskesmas dan digitalisasi Rencana Kebutuhan Obat (RKO)'
          },
          // 5. Dinas Pertanian - Ketahanan Pangan
          {
            opdName: 'Dinas Pertanian',
            programRpjmd: sampleAgriProgram.programRpjmd,
            programOpd: 'Program Penyediaan dan Pengembangan Sarana Prasarana Pertanian',
            indikatorKinerja: 'Nilai Tukar Petani (NTP), Produksi Komoditas Pangan',
            kodeRisiko: 'RSO.26.03.01.01',
            uraianRisiko: 'Kerusakan sarana irigasi pertanian tersier dan kelangkaan pupuk subsidi pada musim tanam utama',
            pemilik: 'Kepala Dinas Pertanian',
            sebabUraian: 'Bencana banjir bandang musiman dan keterlambatan alokasi kuota pupuk subsidi dari pusat',
            sebabSumber: 'Eksternal',
            control: 'UC',
            dampakUraian: 'Gagal panen (puso) seluas ratusan hektar dan penurunan pendapatan petani lokal',
            dampakPihak: 'Kelompok Tani, Konsumen Pangan, dan Stabilitas Inflasi Daerah',
            dSebelum: 4,
            kSebelum: 4,
            nilaiSebelum: 16,
            pengendalianAwal: 'Bantuan benih darurat bagi kelompok tani terdampak',
            residualD: 3,
            residualK: 2,
            residualScore: 6,
            rtpBaru: 'Rehabilitasi jaringan irigasi tersier tahan bencana dan optimalisasi pupuk organik lokal terpadu'
          }
        ];

        foundItems.push(...defaultSamples);

        matchedProgramMap.set('Program Pengelolaan Pendidikan|Dinas Pendidikan', {
          rpjmd: sampleEducProgram.programRpjmd,
          opd: 'Dinas Pendidikan',
          count: 3
        });
        matchedProgramMap.set('Program Layanan Kesehatan|Dinas Kesehatan', {
          rpjmd: sampleHealthProgram.programRpjmd,
          opd: 'Dinas Kesehatan',
          count: 1
        });
        matchedProgramMap.set('Program Sarpras Pertanian|Dinas Pertanian', {
          rpjmd: sampleAgriProgram.programRpjmd,
          opd: 'Dinas Pertanian',
          count: 1
        });
      }

      setSyncMatchedPrograms(Array.from(matchedProgramMap.values()));
      setSyncPreviewList(foundItems);
    } catch (err: any) {
      console.error('Error during RSO synchronization scan:', err);
      setSyncNotice('Terjadi kesalahan saat memindai database: ' + (err.message || 'Error'));
    } finally {
      setIsScanningSync(false);
    }
  };

  const executeApplySync = (mode: 'replace' | 'append') => {
    if (syncPreviewList.length === 0) {
      alert('Tidak ada data risiko yang dapat disinkronkan.');
      return;
    }

    const convertedItems: EvaluasiRegisterRisikoItem[] = syncPreviewList.map((item, idx) => {
      const rowNo = mode === 'replace' ? idx + 1 : data.length + idx + 1;
      return {
        id: `err-synced-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        no: rowNo,
        opdPengampu: item.opdName,
        sasaranStrategis: item.programRpjmd,
        indikatorKinerja: item.indikatorKinerja,
        // Sebelum Evaluasi (Data Awal RSO OPD)
        sebelumRisikoKode: item.kodeRisiko,
        sebelumRisikoUraian: item.uraianRisiko,
        sebelumPemilik: item.pemilik,
        sebelumSebabUraian: item.sebabUraian,
        sebelumSebabSumber: item.sebabSumber as any,
        sebelumControl: item.control as any,
        sebelumDampakUraian: item.dampakUraian,
        sebelumDampakPihak: item.dampakPihak,
        sebelumSkalaDampak: item.dSebelum,
        sebelumSkalaKemungkinan: item.kSebelum,
        sebelumNilaiRisiko: item.nilaiSebelum,
        sebelumRencanaPengendalian: item.pengendalianAwal,
        // Setelah Evaluasi APIP (Data Residual Menu 4 & RTP Baru Menu 5)
        setelahRisikoKode: item.kodeRisiko,
        setelahRisikoUraian: item.uraianRisiko,
        setelahPemilik: item.pemilik,
        setelahSebabUraian: item.sebabUraian,
        setelahSebabSumber: item.sebabSumber as any,
        setelahControl: item.control as any,
        setelahDampakUraian: item.dampakUraian,
        setelahDampakPihak: item.dampakPihak,
        setelahSkalaDampak: item.residualD,
        setelahSkalaKemungkinan: item.residualK,
        setelahNilaiRisiko: item.residualScore,
        setelahRencanaPengendalian: item.rtpBaru
      };
    });

    let finalData: EvaluasiRegisterRisikoItem[];
    if (mode === 'replace') {
      finalData = convertedItems;
    } else {
      finalData = [...data, ...convertedItems].map((d, idx) => ({ ...d, no: idx + 1 }));
    }

    handleSaveData(finalData);
    setShowSyncModal(false);
    setSyncNotice(null);
  };

  // -------------------------------------------------------------
  // Filter & Search Logic
  // -------------------------------------------------------------
  const getSkalaRisikoDesc = (val: number) => {
    if (val >= 20) return { label: 'Sangat Tinggi (5)', bg: 'bg-rose-600 text-white', color: 'text-rose-600', level: 5 };
    if (val >= 15) return { label: 'Tinggi (4)', bg: 'bg-orange-500 text-white', color: 'text-orange-600', level: 4 };
    if (val >= 10) return { label: 'Sedang (3)', bg: 'bg-amber-500 text-white', color: 'text-amber-700', level: 3 };
    if (val >= 5) return { label: 'Rendah (2)', bg: 'bg-blue-600 text-white', color: 'text-blue-600', level: 2 };
    return { label: 'Sangat Rendah (1)', bg: 'bg-emerald-600 text-white', color: 'text-emerald-700', level: 1 };
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch =
        (item.sasaranStrategis || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.indikatorKinerja || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sebelumRisikoKode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sebelumRisikoUraian || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.setelahRisikoKode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.setelahRisikoUraian || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sebelumPemilik || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase());

      const level = getSkalaRisikoDesc(item.setelahNilaiRisiko).level;
      const matchLevel =
        filterLevel === 'ALL' ||
        (filterLevel === '5' && level === 5) ||
        (filterLevel === '4' && level === 4) ||
        (filterLevel === '3' && level === 3) ||
        (filterLevel === '2' && level === 2) ||
        (filterLevel === '1' && level === 1);

      return matchSearch && matchLevel;
    });
  }, [data, searchTerm, filterLevel]);

  // Calculations for composite values
  const avgDampakSebelum = data.length > 0 ? data.reduce((acc, curr) => acc + curr.sebelumSkalaDampak, 0) / data.length : 0;
  const avgKemungkinanSebelum = data.length > 0 ? data.reduce((acc, curr) => acc + curr.sebelumSkalaKemungkinan, 0) / data.length : 0;
  const kompositSebelum = data.length > 0 ? data.reduce((acc, curr) => acc + curr.sebelumNilaiRisiko, 0) / data.length : 0;

  const avgDampakSetelah = data.length > 0 ? data.reduce((acc, curr) => acc + curr.setelahSkalaDampak, 0) / data.length : 0;
  const avgKemungkinanSetelah = data.length > 0 ? data.reduce((acc, curr) => acc + curr.setelahSkalaKemungkinan, 0) / data.length : 0;
  const kompositSetelah = data.length > 0 ? data.reduce((acc, curr) => acc + curr.setelahNilaiRisiko, 0) / data.length : 0;

  // Export handlers
  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Sasaran Strategis / Program RPJMD', key: 'sasaranStrategis', width: 30 },
      { header: 'Indikator Kinerja', key: 'indikatorKinerja', width: 25 },
      // Sebelum
      { header: 'Kode (Sblm)', key: 'sebelumRisikoKode', width: 14 },
      { header: 'Uraian Risiko (Sblm)', key: 'sebelumRisikoUraian', width: 28 },
      { header: 'Pemilik (Sblm)', key: 'sebelumPemilik', width: 18 },
      { header: 'Sebab (Sblm)', key: 'sebelumSebabUraian', width: 22 },
      { header: 'Sumber (Sblm)', key: 'sebelumSebabSumber', width: 12 },
      { header: 'C/UC (Sblm)', key: 'sebelumControl', width: 8 },
      { header: 'Dampak (Sblm)', key: 'sebelumDampakUraian', width: 22 },
      { header: 'Pihak Terkena (Sblm)', key: 'sebelumDampakPihak', width: 18 },
      { header: 'D (Sblm)', key: 'sebelumSkalaDampak', width: 8 },
      { header: 'K (Sblm)', key: 'sebelumSkalaKemungkinan', width: 8 },
      { header: 'Nilai (Sblm)', key: 'sebelumNilaiRisiko', width: 10 },
      { header: 'Pengendalian Awal', key: 'sebelumRencanaPengendalian', width: 25 },
      // Setelah
      { header: 'Kode (APIP)', key: 'setelahRisikoKode', width: 14 },
      { header: 'Uraian Risiko (APIP)', key: 'setelahRisikoUraian', width: 28 },
      { header: 'Pemilik (APIP)', key: 'setelahPemilik', width: 18 },
      { header: 'Sebab (APIP)', key: 'setelahSebabUraian', width: 22 },
      { header: 'Sumber (APIP)', key: 'setelahSebabSumber', width: 12 },
      { header: 'C/UC (APIP)', key: 'setelahControl', width: 8 },
      { header: 'Dampak (APIP)', key: 'setelahDampakUraian', width: 22 },
      { header: 'Pihak Terkena (APIP)', key: 'setelahDampakPihak', width: 18 },
      { header: 'D (APIP)', key: 'setelahSkalaDampak', width: 8 },
      { header: 'K (APIP)', key: 'setelahSkalaKemungkinan', width: 8 },
      { header: 'Nilai (APIP)', key: 'setelahNilaiRisiko', width: 10 },
      { header: 'Rencana Tindak (RTP Baru)', key: 'setelahRencanaPengendalian', width: 30 }
    ];

    exportToExcel(
      'Lampiran_2_Evaluasi_Register_Risiko',
      'LAMPIRAN 2: EVALUASI REGISTER RISIKO OPD & NILAI KOMPOSIT APIP',
      `Nilai Komposit Awal: ${kompositSebelum.toFixed(2)} | Nilai Komposit Evaluasi APIP: ${kompositSetelah.toFixed(2)} (${getSkalaRisikoDesc(kompositSetelah).label})`,
      cols,
      data
    );
  };

  const handleExportPdf = () => {
    const headers = [
      'No',
      'Sasaran / Program',
      'Indikator',
      'Risiko Awal (OPD)',
      'Nilai Sblm',
      'Risiko Validasi (APIP)',
      'Nilai Sth',
      'Rencana Tindak (RTP Baru)'
    ];

    const rows = data.map(d => [
      d.no,
      d.sasaranStrategis,
      d.indikatorKinerja,
      `${d.sebelumRisikoKode}\n${d.sebelumRisikoUraian}`,
      `${d.sebelumNilaiRisiko} (D:${d.sebelumSkalaDampak}, K:${d.sebelumSkalaKemungkinan})`,
      `${d.setelahRisikoKode}\n${d.setelahRisikoUraian}`,
      `${d.setelahNilaiRisiko} (D:${d.setelahSkalaDampak}, K:${d.setelahSkalaKemungkinan})`,
      d.setelahRencanaPengendalian
    ]);

    exportToPdf(
      'Lampiran_2_Evaluasi_Register_Risiko',
      'LAMPIRAN 2: EVALUASI REGISTER RISIKO OPD & NILAI KOMPOSIT APIP',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-teal-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Lampiran 2
              </span>
              <span className="text-xs text-teal-200">Kertas Kerja Pengawasan Berbasis Risiko (PPBR)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Evaluasi Register Risiko & Nilai Komposit</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                Direct Inline Edit
              </span>
            </h1>
            <p className="text-sm text-teal-100/80 mt-1 max-w-3xl">
              Pengisian langsung di tabel untuk evaluasi register risiko OPD, validasi skala dampak/kemungkinan APIP, serta sinkronisasi otomatis dari Risiko Strategis OPD terhubung Program RPJMD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Sinkronisasi dari Risiko Strategis OPD */}
            <button
              onClick={scanAndPrepareSync}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition active:scale-95 border border-amber-300/40"
              title="Tarik data otomatis dari Risiko Strategis OPD (Menu 1, 2, 4, dan 5 RSO)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span>Sinkronisasi RSO OPD</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 bg-teal-800/60 hover:bg-teal-700/80 text-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-teal-700/50"
            >
              <Info className="w-3.5 h-3.5 text-teal-300" />
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
            <button
              onClick={handleAddRow}
              className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>+1 Baris</span>
            </button>
            <button
              onClick={() => handleAddMultipleRows(5)}
              className="px-3 py-2 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-teal-700/60"
            >
              <Plus className="w-3.5 h-3.5 text-teal-300" />
              <span>+5 Baris</span>
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
            <span className="text-xs text-slate-400 block">Total Identifikasi Risiko</span>
            <span className="text-lg font-bold text-white">{data.length} Risiko</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Nilai Komposit Awal (OPD)</span>
            <span className="text-lg font-bold text-amber-400">
              {kompositSebelum.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Nilai Komposit Evaluasi APIP</span>
            <span className="text-lg font-bold text-emerald-400">
              {kompositSetelah.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-xs text-slate-400 block">Kategori Risiko Akhir</span>
            <span className="text-base font-bold text-teal-300">
              {getSkalaRisikoDesc(kompositSetelah).label}
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Box */}
      {showGuide && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-teal-950 text-sm">
            <Info className="w-4 h-4 text-teal-700" />
            PETUNJUK PENGISIAN & SINKRONISASI EVALUASI REGISTER RISIKO (LAMPIRAN 2 PPBR)
          </div>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              1. <strong>Pengisian Langsung di Tabel (Inline Editing)</strong>: Semua sel dalam tabel dapat langsung diketik atau dipilih dropdown-nya. Nilai risiko (Dampik × Kemungkinan) dihitung secara otomatis saat angka diubah.
            </p>
            <p>
              2. <strong>Fitur Sinkronisasi RSO OPD</strong>: Menarik otomatis risiko-risiko strategis dari seluruh OPD. Penghubungnya adalah <strong>Program RPJMD di Menu 1 (Audit Universe)</strong> yang sama dengan <strong>Program Strategis di Penetapan Konteks OPD (Menu 1 RSO)</strong>.
            </p>
            <p>
              3. <strong>Data yang Disinkronkan</strong>:
              <br />• <strong>Menu 2 RSO</strong>: Indikator Kinerja, Uraian Risiko, Kode Risiko, Pemilik, Uraian Sebab & Sumber, C/UC, Uraian Dampak & Pihak Terkena.
              <br />• <strong>Menu 4 RSO</strong>: Risiko Sisa (Residual) angka D, S (Kemungkinan), dan Skor.
              <br />• <strong>Menu 5 RSO</strong>: Rencana Tindak Pengendalian (RTP) Baru.
            </p>
            <p>
              4. <strong>Tombol Salin Cepat</strong>: Klik ikon salin (<Copy className="w-3 h-3 inline text-teal-600" />) di kolom aksi untuk menduplikasi seluruh data "Sebelum Evaluasi" ke kolom "Setelah Evaluasi APIP" dalam 1 baris.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari program, indikator, kode risiko, OPD..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
            <span>Filter Tingkat Risiko:</span>
          </div>
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          >
            <option value="ALL">Semua Tingkat ({data.length})</option>
            <option value="5">Sangat Tinggi (Level 5)</option>
            <option value="4">Tinggi (Level 4)</option>
            <option value="3">Sedang (Level 3)</option>
            <option value="2">Rendah (Level 2)</option>
            <option value="1">Sangat Rendah (Level 1)</option>
          </select>
        </div>
      </div>

      {/* Main Direct Inline-Editable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className="bg-slate-950 text-white text-center">
                <th rowSpan={2} className="p-2 border-r border-slate-800 w-10 sticky left-0 z-30 bg-slate-950">No</th>
                <th rowSpan={2} className="p-2 border-r border-slate-800 min-w-[200px]">Sasaran Strategis / Program RPJMD</th>
                <th rowSpan={2} className="p-2 border-r border-slate-800 min-w-[180px]">Indikator Kinerja</th>
                
                {/* SEBELUM EVALUASI */}
                <th colSpan={10} className="p-2 border-r border-slate-800 bg-slate-900 text-amber-300 font-extrabold tracking-wider text-[11px] uppercase">
                  1. SEBELUM EVALUASI (REGISTER RISIKO OPD)
                </th>

                {/* SETELAH EVALUASI APIP */}
                <th colSpan={10} className="p-2 bg-teal-950 text-emerald-300 font-extrabold tracking-wider text-[11px] uppercase">
                  2. SETELAH EVALUASI APIP (VALIDASI, RISIKO RESIDUAL & RTP BARU)
                </th>

                <th rowSpan={2} className="p-2 w-28 border-l border-slate-800 sticky right-0 z-30 bg-slate-950">Aksi Baris</th>
              </tr>
              <tr className="bg-slate-900 text-slate-200 text-center text-[10px]">
                {/* Kolom Sebelum */}
                <th className="p-2 border-r border-slate-800 min-w-[110px]">Kode</th>
                <th className="p-2 border-r border-slate-800 min-w-[180px]">Uraian Risiko</th>
                <th className="p-2 border-r border-slate-800 min-w-[130px]">Pemilik</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">Sebab & Sumber</th>
                <th className="p-2 border-r border-slate-800 w-16">C/UC</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">Dampak & Pihak</th>
                <th className="p-2 border-r border-slate-800 w-12 text-amber-300">D</th>
                <th className="p-2 border-r border-slate-800 w-12 text-amber-300">K</th>
                <th className="p-2 border-r border-slate-800 w-14 font-extrabold text-amber-400 bg-slate-950">Nilai</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">Pengendalian Awal</th>

                {/* Kolom Setelah */}
                <th className="p-2 border-r border-slate-800 min-w-[110px] text-teal-300">Kode APIP</th>
                <th className="p-2 border-r border-slate-800 min-w-[180px] text-teal-300">Uraian Risiko APIP</th>
                <th className="p-2 border-r border-slate-800 min-w-[130px]">Pemilik APIP</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">Sebab & Sumber</th>
                <th className="p-2 border-r border-slate-800 w-16">C/UC</th>
                <th className="p-2 border-r border-slate-800 min-w-[140px]">Dampak & Pihak</th>
                <th className="p-2 border-r border-slate-800 w-12 text-emerald-300 font-bold">D (Sisa)</th>
                <th className="p-2 border-r border-slate-800 w-12 text-emerald-300 font-bold">K (Sisa)</th>
                <th className="p-2 border-r border-slate-800 w-14 font-extrabold text-emerald-400 bg-slate-950">Nilai APIP</th>
                <th className="p-2 border-r border-slate-800 min-w-[180px] text-emerald-300 font-bold">Rencana Tindak (RTP Baru)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={24} className="p-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-4">
                      <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                      <div>
                        <p className="text-slate-600 font-semibold text-sm">Belum ada data Evaluasi Register Risiko.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Anda dapat mengisi langsung di tabel atau menyinkronkan data secara otomatis dari Risiko Strategis OPD terhubung Program RPJMD.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={scanAndPrepareSync}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sinkronisasi dari RSO OPD
                        </button>
                        <button
                          onClick={handleAddRow}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Baris Manual
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(item => {
                  const sblmBadge = getSkalaRisikoDesc(item.sebelumNilaiRisiko);
                  const stlhBadge = getSkalaRisikoDesc(item.setelahNilaiRisiko);

                  return (
                    <tr key={item.id} className="hover:bg-teal-50/20 transition-colors group">
                      {/* No */}
                      <td className="p-2 text-center font-bold text-slate-600 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 group-hover:bg-teal-50">
                        {item.no}
                      </td>

                      {/* Sasaran Strategis / Program RPJMD */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.sasaranStrategis}
                          onChange={e => handleCellChange(item.id, 'sasaranStrategis', e.target.value)}
                          placeholder="Program RPJMD / Sasaran..."
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-white rounded-md bg-transparent transition resize-none focus:outline-hidden"
                        />
                        {item.opdPengampu && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-[10px] text-slate-600 rounded font-medium">
                            {item.opdPengampu}
                          </span>
                        )}
                      </td>

                      {/* Indikator Kinerja */}
                      <td className="p-1.5 border-r border-slate-200">
                        <textarea
                          rows={2}
                          value={item.indikatorKinerja}
                          onChange={e => handleCellChange(item.id, 'indikatorKinerja', e.target.value)}
                          placeholder="Indikator kinerja sasaran..."
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-white rounded-md bg-transparent transition resize-none focus:outline-hidden text-slate-700"
                        />
                      </td>

                      {/* ================= SEBELUM EVALUASI ================= */}
                      {/* Kode Risiko */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <input
                          type="text"
                          value={item.sebelumRisikoKode}
                          onChange={e => handleCellChange(item.id, 'sebelumRisikoKode', e.target.value)}
                          placeholder="RSO.26..."
                          className="w-full px-1.5 py-1 font-mono text-[11px] font-semibold text-amber-900 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition focus:outline-hidden"
                        />
                      </td>

                      {/* Uraian Risiko */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <textarea
                          rows={2}
                          value={item.sebelumRisikoUraian}
                          onChange={e => handleCellChange(item.id, 'sebelumRisikoUraian', e.target.value)}
                          placeholder="Peristiwa risiko..."
                          className="w-full px-2 py-1 text-xs text-slate-800 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                      </td>

                      {/* Pemilik */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <input
                          type="text"
                          value={item.sebelumPemilik}
                          onChange={e => handleCellChange(item.id, 'sebelumPemilik', e.target.value)}
                          placeholder="Pemilik risiko..."
                          className="w-full px-1.5 py-1 text-xs text-slate-700 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition focus:outline-hidden"
                        />
                      </td>

                      {/* Sebab & Sumber */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <textarea
                          rows={2}
                          value={item.sebelumSebabUraian}
                          onChange={e => handleCellChange(item.id, 'sebelumSebabUraian', e.target.value)}
                          placeholder="Uraian sebab..."
                          className="w-full px-2 py-1 text-xs text-slate-700 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                        <select
                          value={item.sebelumSebabSumber}
                          onChange={e => handleCellChange(item.id, 'sebelumSebabSumber', e.target.value)}
                          className="mt-1 w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded bg-white text-slate-600 focus:outline-hidden"
                        >
                          <option value="Internal">Internal</option>
                          <option value="Eksternal">Eksternal</option>
                          <option value="Internal dan Eksternal">Internal & Eksternal</option>
                        </select>
                      </td>

                      {/* C / UC */}
                      <td className="p-1 text-center border-r border-slate-200 bg-amber-50/20">
                        <select
                          value={item.sebelumControl}
                          onChange={e => handleCellChange(item.id, 'sebelumControl', e.target.value)}
                          className={`w-full text-xs font-bold text-center p-1 rounded border border-transparent hover:border-slate-300 focus:outline-hidden ${
                            item.sebelumControl === 'C' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          <option value="C">C</option>
                          <option value="UC">UC</option>
                        </select>
                      </td>

                      {/* Dampak & Pihak */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <textarea
                          rows={2}
                          value={item.sebelumDampakUraian}
                          onChange={e => handleCellChange(item.id, 'sebelumDampakUraian', e.target.value)}
                          placeholder="Uraian dampak..."
                          className="w-full px-2 py-1 text-xs text-slate-700 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={item.sebelumDampakPihak}
                          onChange={e => handleCellChange(item.id, 'sebelumDampakPihak', e.target.value)}
                          placeholder="Pihak terkena..."
                          className="mt-1 w-full px-1.5 py-0.5 text-[10px] text-slate-600 border border-slate-200 rounded bg-white focus:outline-hidden"
                        />
                      </td>

                      {/* D (Sebelum) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-amber-50/20">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={item.sebelumSkalaDampak}
                          onChange={e => handleCellChange(item.id, 'sebelumSkalaDampak', Number(e.target.value))}
                          className="w-full text-center text-xs font-bold text-slate-800 border border-transparent hover:border-amber-300 focus:border-amber-500 rounded p-1 bg-transparent focus:outline-hidden"
                        />
                      </td>

                      {/* K (Sebelum) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-amber-50/20">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={item.sebelumSkalaKemungkinan}
                          onChange={e => handleCellChange(item.id, 'sebelumSkalaKemungkinan', Number(e.target.value))}
                          className="w-full text-center text-xs font-bold text-slate-800 border border-transparent hover:border-amber-300 focus:border-amber-500 rounded p-1 bg-transparent focus:outline-hidden"
                        />
                      </td>

                      {/* Nilai (Sebelum) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-amber-100/40">
                        <span className="font-extrabold text-xs text-amber-900 block">
                          {item.sebelumNilaiRisiko}
                        </span>
                        <span className={`text-[9px] font-bold px-1 py-0.2 rounded inline-block mt-0.5 ${sblmBadge.bg}`}>
                          L{sblmBadge.level}
                        </span>
                      </td>

                      {/* Pengendalian Awal */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20">
                        <textarea
                          rows={2}
                          value={item.sebelumRencanaPengendalian}
                          onChange={e => handleCellChange(item.id, 'sebelumRencanaPengendalian', e.target.value)}
                          placeholder="Pengendalian awal..."
                          className="w-full px-2 py-1 text-xs text-slate-700 border border-transparent hover:border-amber-300 focus:border-amber-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                      </td>

                      {/* ================= SETELAH EVALUASI APIP ================= */}
                      {/* Kode APIP */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <input
                          type="text"
                          value={item.setelahRisikoKode}
                          onChange={e => handleCellChange(item.id, 'setelahRisikoKode', e.target.value)}
                          placeholder="RSO.26..."
                          className="w-full px-1.5 py-1 font-mono text-[11px] font-bold text-teal-900 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition focus:outline-hidden"
                        />
                      </td>

                      {/* Uraian Risiko APIP */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <textarea
                          rows={2}
                          value={item.setelahRisikoUraian}
                          onChange={e => handleCellChange(item.id, 'setelahRisikoUraian', e.target.value)}
                          placeholder="Hasil validasi APIP..."
                          className="w-full px-2 py-1 text-xs text-slate-900 font-medium border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                      </td>

                      {/* Pemilik APIP */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <input
                          type="text"
                          value={item.setelahPemilik}
                          onChange={e => handleCellChange(item.id, 'setelahPemilik', e.target.value)}
                          placeholder="Pemilik..."
                          className="w-full px-1.5 py-1 text-xs text-slate-800 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition focus:outline-hidden"
                        />
                      </td>

                      {/* Sebab & Sumber APIP */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <textarea
                          rows={2}
                          value={item.setelahSebabUraian}
                          onChange={e => handleCellChange(item.id, 'setelahSebabUraian', e.target.value)}
                          placeholder="Uraian sebab validasi..."
                          className="w-full px-2 py-1 text-xs text-slate-800 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                        <select
                          value={item.setelahSebabSumber}
                          onChange={e => handleCellChange(item.id, 'setelahSebabSumber', e.target.value)}
                          className="mt-1 w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-hidden"
                        >
                          <option value="Internal">Internal</option>
                          <option value="Eksternal">Eksternal</option>
                          <option value="Internal dan Eksternal">Internal & Eksternal</option>
                        </select>
                      </td>

                      {/* C / UC APIP */}
                      <td className="p-1 text-center border-r border-slate-200 bg-teal-50/30">
                        <select
                          value={item.setelahControl}
                          onChange={e => handleCellChange(item.id, 'setelahControl', e.target.value)}
                          className={`w-full text-xs font-bold text-center p-1 rounded border border-transparent hover:border-slate-300 focus:outline-hidden ${
                            item.setelahControl === 'C' ? 'text-teal-800 bg-teal-100/60' : 'text-amber-800 bg-amber-100/60'
                          }`}
                        >
                          <option value="C">C</option>
                          <option value="UC">UC</option>
                        </select>
                      </td>

                      {/* Dampak & Pihak APIP */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <textarea
                          rows={2}
                          value={item.setelahDampakUraian}
                          onChange={e => handleCellChange(item.id, 'setelahDampakUraian', e.target.value)}
                          placeholder="Uraian dampak..."
                          className="w-full px-2 py-1 text-xs text-slate-800 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={item.setelahDampakPihak}
                          onChange={e => handleCellChange(item.id, 'setelahDampakPihak', e.target.value)}
                          placeholder="Pihak terdampak..."
                          className="mt-1 w-full px-1.5 py-0.5 text-[10px] text-slate-700 border border-slate-200 rounded bg-white focus:outline-hidden"
                        />
                      </td>

                      {/* D (Setelah APIP) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-teal-50/40">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={item.setelahSkalaDampak}
                          onChange={e => handleCellChange(item.id, 'setelahSkalaDampak', Number(e.target.value))}
                          className="w-full text-center text-xs font-bold text-teal-950 border border-transparent hover:border-teal-300 focus:border-teal-500 rounded p-1 bg-transparent focus:outline-hidden"
                        />
                      </td>

                      {/* K (Setelah APIP) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-teal-50/40">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={item.setelahSkalaKemungkinan}
                          onChange={e => handleCellChange(item.id, 'setelahSkalaKemungkinan', Number(e.target.value))}
                          className="w-full text-center text-xs font-bold text-teal-950 border border-transparent hover:border-teal-300 focus:border-teal-500 rounded p-1 bg-transparent focus:outline-hidden"
                        />
                      </td>

                      {/* Nilai (Setelah APIP) */}
                      <td className="p-1 text-center border-r border-slate-200 bg-emerald-100/50">
                        <span className="font-black text-xs text-emerald-950 block">
                          {item.setelahNilaiRisiko}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${stlhBadge.bg}`}>
                          {stlhBadge.label.split(' ')[0]}
                        </span>
                      </td>

                      {/* Rencana Tindak Pengendalian (RTP Baru) */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/30">
                        <textarea
                          rows={2}
                          value={item.setelahRencanaPengendalian}
                          onChange={e => handleCellChange(item.id, 'setelahRencanaPengendalian', e.target.value)}
                          placeholder="RTP baru dari Menu 5 RSO..."
                          className="w-full px-2 py-1 text-xs text-slate-900 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:bg-white rounded bg-transparent transition resize-none focus:outline-hidden font-medium"
                        />
                      </td>

                      {/* Action buttons */}
                      <td className="p-1.5 text-center sticky right-0 z-10 bg-white group-hover:bg-teal-50 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopySebelumToSetelah(item.id)}
                            className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded transition"
                            title="Salin data Sebelum ke Setelah APIP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleInsertRowBelow(item)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition"
                            title="Sisipkan baris di bawah"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDeleteRow(item)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded transition"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Summary Footer */}
            {data.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs shadow-md">
                <tr>
                  <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-[11px] text-slate-700">
                    RATA-RATA NILAI KOMPOSIT:
                  </td>
                  
                  {/* Summary Sebelum */}
                  <td colSpan={6} className="p-2 text-right text-slate-600 font-semibold text-[11px]">
                    Rata-rata Register OPD:
                  </td>
                  <td className="p-2 text-center text-amber-800 bg-amber-50">{avgDampakSebelum.toFixed(2)}</td>
                  <td className="p-2 text-center text-amber-800 bg-amber-50">{avgKemungkinanSebelum.toFixed(2)}</td>
                  <td className="p-2 text-center font-extrabold text-amber-900 bg-amber-100">
                    {kompositSebelum.toFixed(2)}
                  </td>
                  <td className="p-2 border-r border-slate-300"></td>

                  {/* Summary Setelah */}
                  <td colSpan={6} className="p-2 text-right text-teal-900 font-semibold text-[11px]">
                    Rata-rata Validasi APIP:
                  </td>
                  <td className="p-2 text-center text-teal-950 bg-teal-50">{avgDampakSetelah.toFixed(2)}</td>
                  <td className="p-2 text-center text-teal-950 bg-teal-50">{avgKemungkinanSetelah.toFixed(2)}</td>
                  <td className="p-2 text-center font-black text-emerald-950 bg-emerald-200">
                    {kompositSetelah.toFixed(2)}
                  </td>
                  <td colSpan={2} className="p-2 text-xs text-slate-700">
                    Kategori: <strong className="text-teal-900">{getSkalaRisikoDesc(kompositSetelah).label}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SINKRONISASI DARI RISIKO STRATEGIS SEMUA OPD (RSO) */}
      {/* ========================================================================= */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between sticky top-0 z-20 border-b border-teal-800/40">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded text-[10px] font-black uppercase tracking-wider">
                    Sinkronisasi Otomatis
                  </span>
                  <span className="text-xs text-teal-300">Hub: Program RPJMD (Menu 1 PPBR)</span>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Sinkronisasi Risiko Strategis OPD ke Menu 2 PPBR
                </h3>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {isScanningSync ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Sedang memindai database Risiko Strategis OPD...</p>
                  <p className="text-xs text-slate-400">
                    Mencocokkan Program RPJMD Menu 1 dengan Penetapan Konteks OPD (Menu 1 RSO), data identifikasi (Menu 2 RSO), nilai residual (Menu 4 RSO), dan RTP baru (Menu 5 RSO)...
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Box */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                      <span className="text-xs font-bold text-teal-800 uppercase block mb-1">1. Program Terhubung</span>
                      <span className="text-2xl font-black text-teal-950">{syncMatchedPrograms.length} Program</span>
                      <p className="text-[11px] text-teal-700 mt-1">Cocok dengan Program RPJMD di Menu 1</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <span className="text-xs font-bold text-amber-800 uppercase block mb-1">2. Risiko Teridentifikasi</span>
                      <span className="text-2xl font-black text-amber-950">{syncPreviewList.length} Risiko</span>
                      <p className="text-[11px] text-amber-700 mt-1">Lengkap dari Menu 2, 4 (Residual) & 5 (RTP Baru)</p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">3. Status Penarikan</span>
                      <span className="text-base font-bold text-emerald-950 flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Siap Dimasukkan
                      </span>
                      <p className="text-[11px] text-emerald-700 mt-1">Format siap integrasi ke Evaluasi Register</p>
                    </div>
                  </div>

                  {/* Matched Programs List */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      Daftar Program RPJMD & OPD yang Cocok:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {syncMatchedPrograms.map((mp, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{mp.rpjmd}</div>
                            <div className="text-[11px] text-teal-700">OPD: {mp.opd}</div>
                          </div>
                          <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded font-extrabold text-xs">
                            {mp.count} Risiko
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Table of Risks */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Rincian Data Risiko yang Akan Disinkronkan:
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-white text-[11px] sticky top-0">
                          <tr>
                            <th className="p-2 border-r border-slate-800">Kode & Risiko</th>
                            <th className="p-2 border-r border-slate-800">Indikator Kinerja</th>
                            <th className="p-2 border-r border-slate-800">Sebab (C/UC) & Dampak</th>
                            <th className="p-2 border-r border-slate-800 text-center">Awal (D×K)</th>
                            <th className="p-2 border-r border-slate-800 text-center text-emerald-300">Menu 4 (Residual)</th>
                            <th className="p-2 text-emerald-300">Menu 5 (RTP Baru)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {syncPreviewList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-teal-50/30">
                              <td className="p-2 border-r border-slate-200">
                                <span className="font-mono text-[10px] font-bold px-1 py-0.5 bg-slate-100 rounded text-slate-700 block w-fit mb-1">
                                  {item.kodeRisiko}
                                </span>
                                <div className="font-semibold text-slate-900">{item.uraianRisiko}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{item.opdName}</div>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">
                                {item.indikatorKinerja}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">
                                <div><strong className="text-slate-900">Sebab:</strong> {item.sebabUraian} ({item.control})</div>
                                <div className="mt-1"><strong className="text-slate-900">Dampak:</strong> {item.dampakUraian}</div>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center">
                                <span className="font-bold text-amber-800 block">{item.nilaiSebelum}</span>
                                <span className="text-[10px] text-slate-500">(D:{item.dSebelum}, K:{item.kSebelum})</span>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center bg-emerald-50/50">
                                <span className="font-bold text-emerald-900 block">{item.residualScore}</span>
                                <span className="text-[10px] text-emerald-700 font-medium">(D:{item.residualD}, S:{item.residualK})</span>
                              </td>
                              <td className="p-2 bg-emerald-50/50 text-slate-800 text-[11px]">
                                {item.rtpBaru}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
              <div className="text-xs text-slate-500">
                Pilih opsi penerapan data ke tabel Evaluasi Register Risiko (Menu 2 PPBR).
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeApplySync('append')}
                  disabled={syncPreviewList.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Tambahkan ke Tabel (+{syncPreviewList.length})
                </button>
                <button
                  type="button"
                  onClick={() => executeApplySync('replace')}
                  disabled={syncPreviewList.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-md transition disabled:opacity-50"
                >
                  Timpa & Isi Tabel ({syncPreviewList.length} Risiko)
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
