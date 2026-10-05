import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuditUniverseItem, INITIAL_AUDIT_UNIVERSE } from './ppbrData';
import { exportToExcel, exportToPdf } from './ppbrExport';
import { ConfirmModal } from '../common/ConfirmModal';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getScopedKey, getScopedPPBRDocId, getSelectedYear, DEFAULT_YEAR } from './ppbrYearHelper';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  Layers,
  GitMerge,
  Split,
  Settings,
  Building2,
  X,
  Check,
  Cloud,
  RefreshCw,
  AlertCircle,
  Upload,
  Download,
  Sparkles
} from 'lucide-react';

const DEFAULT_INDIKATOR_TUJUAN: Record<string, string> = {
  'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia': 'Indeks Pembangunan Manusia (IPM)',
  'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing': 'Laju Pertumbuhan Ekonomi (LPE)',
  'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani': 'Indeks Reformasi Birokrasi (IRB)',
  'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup': 'Indeks Kualitas Lingkungan Hidup (IKLH) & Indeks Infrastruktur',
  'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial': 'Tingkat Kemiskinan & Indeks Ketenteraman dan Ketertiban'
};

const DEFAULT_IRBAN_LIST = ['Irban I', 'Irban II', 'Irban III', 'Irban IV', 'Irbansus'];

// Deteksi apakah suatu nama program bersifat umum (generic), seperti "Program Penunjang Urusan Pemerintahan"
// Program generic ada di hampir semua dinas/badan sehingga TIDAK BOLEH ditebak sembarangan
export const isGenericProgram = (programName: string): boolean => {
  const lower = (programName || '').toLowerCase().trim();
  if (!lower) return true;
  if (lower.includes('penunjang urusan')) return true;
  if (lower.includes('program penunjang')) return true;
  if (lower.includes('administrasi perkantoran') && !lower.includes('dprd')) return true;
  return false;
};

// Aturan pemetaan nama program spesifik ke OPD pengampu (Permendagri 90/2019 & Kepmendagri 050/2020)
export const SPECIFIC_PROGRAM_OPD_RULES: Array<{
  keywords: string[];
  opd: string;
}> = [
  // 1. Pendidikan
  {
    keywords: ['pengelolaan pendidikan', 'kurikulum', 'pendidik dan tenaga kependidikan', 'pengendalian perizinan pendidikan', 'peserta didik', 'paud', 'sekolah dasar', 'sekolah menengah'],
    opd: 'Dinas Pendidikan'
  },
  // 2. Kesehatan
  {
    keywords: ['upaya kesehatan', 'sediaan farmasi', 'pemberdayaan masyarakat bidang kesehatan', 'pelayanan kesehatan', 'kesehatan perorangan', 'kesehatan masyarakat', 'fasilitas pelayanan kesehatan', 'puskesmas'],
    opd: 'Dinas Kesehatan'
  },
  // 3. Pekerjaan Umum dan Penataan Ruang (PUPR)
  {
    keywords: ['sumber daya air', 'penyelenggaraan jalan', 'penataan ruang', 'sistem penyediaan air minum', 'spam', 'penataan bangunan gedung', 'jasa konstruksi', 'drainase perkotaan', 'pengelolaan sda'],
    opd: 'Dinas Pekerjaan Umum dan Penataan Ruang'
  },
  // 4. Perumahan Rakyat & Kawasan Permukiman
  {
    keywords: ['pengembangan perumahan', 'kawasan permukiman', 'prasarana, sarana dan utilitas umum', 'psu perumahan', 'rumah tidak layak huni', 'rtlh', 'permukiman kumuh'],
    opd: 'Dinas Perumahan Rakyat dan Kawasan Permukiman'
  },
  // 5. Ketenteraman, Ketertiban Umum & Pol PP
  {
    keywords: ['ketenteraman dan ketertiban umum', 'tramtibum', 'penegakan peraturan daerah', 'penegakan perda', 'polisi pamong praja'],
    opd: 'Satuan Polisi Pamong Praja'
  },
  // 6. Pemadam Kebakaran & Penyelamatan
  {
    keywords: ['penanggulangan kebakaran', 'penyelamatan kebakaran', 'pemadam kebakaran', 'damkar'],
    opd: 'Dinas Pemadam Kebakaran dan Penyelamatan'
  },
  // 7. Penanggulangan Bencana
  {
    keywords: ['penanggulangan bencana', 'mitigasi bencana', 'prabencana', 'kedaruratan bencana'],
    opd: 'Badan Penanggulangan Bencana Daerah'
  },
  // 8. Sosial
  {
    keywords: ['pemberdayaan sosial', 'perlindungan dan jaminan sosial', 'rehabilitasi sosial', 'penanganan bencana sosial', 'fakir miskin', 'pemerlu pelayanan kesejahteraan'],
    opd: 'Dinas Sosial'
  },
  // 9. Ketenagakerjaan
  {
    keywords: ['pelatihan kerja dan produktivitas', 'penempatan tenaga kerja', 'hubungan industrial', 'ketenagakerjaan', 'transmigrasi'],
    opd: 'Dinas Tenaga Kerja'
  },
  // 10. Pemberdayaan Perempuan & Perlindungan Anak
  {
    keywords: ['pengarusutamaan gender', 'perlindungan khusus anak', 'pemenuhan hak anak', 'pemberdayaan perempuan', 'kekerasan terhadap perempuan'],
    opd: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak'
  },
  // 11. Ketahanan Pangan
  {
    keywords: ['kedaulatan dan kemandirian pangan', 'ketersediaan dan cadangan pangan', 'kerawanan pangan', 'ketahanan pangan', 'keamanan pangan daerah'],
    opd: 'Dinas Ketahanan Pangan'
  },
  // 12. Lingkungan Hidup
  {
    keywords: ['pengendalian pencemaran', 'kerusakan lingkungan', 'keanekaragaman hayati', 'pengelolaan persampahan', 'izin lingkungan', 'lingkungan hidup', 'b3 dan limbah b3'],
    opd: 'Dinas Lingkungan Hidup'
  },
  // 13. Kependudukan dan Pencatatan Sipil
  {
    keywords: ['pendaftaran penduduk', 'pencatatan sipil', 'administrasi kependudukan', 'adminduk', 'informasi administrasi kependudukan', 'dokumen kependudukan'],
    opd: 'Dinas Kependudukan dan Pencatatan Sipil'
  },
  // 14. Pemberdayaan Masyarakat dan Desa (DPMD)
  {
    keywords: ['penataan desa', 'administrasi pemerintahan desa', 'kerjasama desa', 'masyarakat dan desa', 'pemberdayaan lembaga kemasyarakatan', 'pemberdayaan desa', 'dana desa'],
    opd: 'Dinas Pemberdayaan Masyarakat dan Desa'
  },
  // 15. Pengendalian Penduduk & KB
  {
    keywords: ['pengendalian penduduk', 'keluarga berencana', 'pembinaan keluarga berencana', 'pelayanan kb'],
    opd: 'Dinas Pengendalian Penduduk dan Keluarga Berencana'
  },
  // 16. Perhubungan
  {
    keywords: ['lalu lintas dan angkutan', 'llaj', 'pelayaran', 'perkeretaapian', 'keselamatan lalu lintas', 'terminal', 'rambu lalu lintas'],
    opd: 'Dinas Perhubungan'
  },
  // 17. Komunikasi dan Informatika
  {
    keywords: ['informasi dan komunikasi publik', 'aplikasi informatika', 'statistik sektoral', 'persandian', 'nama domain', 'spbe', 'e-government'],
    opd: 'Dinas Komunikasi dan Informatika'
  },
  // 18. Koperasi dan Usaha Kecil Menengah
  {
    keywords: ['pengawasan koperasi', 'penilaian kesehatan ksp', 'pendidikan perkoperasian', 'pemberdayaan usaha mikro', 'koperasi dan ukm', 'umkm'],
    opd: 'Dinas Koperasi dan Usaha Kecil Menengah'
  },
  // 19. Penanaman Modal & PTSP
  {
    keywords: ['penanaman modal', 'pelayanan penanaman modal', 'pelayanan terpadu satu pintu', 'ptsp', 'perizinan berusaha', 'investasi daerah'],
    opd: 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu'
  },
  // 20. Kepemudaan dan Olahraga
  {
    keywords: ['daya saing kepemudaan', 'daya saing keolahragaan', 'pembinaan dan pengembangan olahraga', 'prestasi olahraga', 'pemuda dan olahraga'],
    opd: 'Dinas Pemuda dan Olahraga'
  },
  // 21. Kebudayaan & Pariwisata
  {
    keywords: ['daya tarik destinasi pariwisata', 'pemasaran pariwisata', 'pengembangan ekonomi kreatif', 'kesenian tradisional', 'cagar budaya', 'kebudayaan daerah'],
    opd: 'Dinas Pariwisata dan Kebudayaan'
  },
  // 22. Perpustakaan dan Kearsipan
  {
    keywords: ['pembinaan perpustakaan', 'pelestarian naskah kuno', 'pengelolaan arsip', 'kearsipan daerah', 'koleksi perpustakaan'],
    opd: 'Dinas Perpustakaan dan Kearsipan'
  },
  // 23. Kelautan dan Perikanan
  {
    keywords: ['perikanan tangkap', 'perikanan budidaya', 'pengolahan dan pemasaran hasil perikanan', 'kelautan dan perikanan', 'nelayan kecil'],
    opd: 'Dinas Kelautan dan Perikanan'
  },
  // 24. Pertanian, Peternakan & Perkebunan
  {
    keywords: ['sarana pertanian', 'prasarana pertanian', 'tanaman pangan', 'hortikultura', 'kesehatan hewan', 'peternakan', 'perkebunan', 'bencana pertanian'],
    opd: 'Dinas Pertanian'
  },
  // 25. Perdagangan dan Perindustrian
  {
    keywords: ['sarana distribusi perdagangan', 'stabilisasi harga barang', 'pengembangan ekspor', 'perlindungan konsumen dan tertib niaga', 'pembangunan industri', 'metrologi legal'],
    opd: 'Dinas Perindustrian dan Perdagangan'
  },
  // 26. Inspektorat
  {
    keywords: ['pengawasan internal', 'pembinaan pengawasan', 'pengawasan penyelenggaraan pemerintahan daerah', 'reformasi birokrasi internal'],
    opd: 'Inspektorat Daerah'
  },
  // 27. Bappeda
  {
    keywords: ['perencanaan, pengendalian dan evaluasi pembangunan', 'koordinasi dan sinkronisasi perencanaan pembangunan', 'penelitian dan pengembangan daerah', 'litbang bappeda'],
    opd: 'Badan Perencanaan Pembangunan Daerah'
  },
  // 28. BPKAD
  {
    keywords: ['pengelolaan keuangan daerah', 'pengelolaan barang milik daerah', 'bmd', 'aset daerah', 'perbendaharaan daerah'],
    opd: 'Badan Pengelolaan Keuangan dan Aset Daerah'
  },
  // 29. Bapenda
  {
    keywords: ['pengelolaan pendapatan daerah', 'pajak daerah', 'retribusi daerah', 'pajak dan retribusi'],
    opd: 'Badan Pendapatan Daerah'
  },
  // 30. BKPSDM
  {
    keywords: ['kepegawaian, pendidikan dan pelatihan', 'pengadaan, pemberhentian dan informasi kepegawaian', 'mutasi dan promosi asn', 'pengembangan kompetensi asn', 'bkpsdm', 'bkd'],
    opd: 'Badan Kepegawaian dan Pengembangan SDM'
  },
  // 31. Bakesbangpol
  {
    keywords: ['pembinaan kesatuan bangsa', 'ketahanan ekonomi, sosial, budaya, agama', 'kesatuan bangsa dan politik', 'ormas dan wawasan kebangsaan'],
    opd: 'Badan Kesatuan Bangsa dan Politik'
  },
  // 32. Sekretariat DPRD
  {
    keywords: ['tugas dan fungsi dprd', 'layanan administrasi dan keprotokolan dprd'],
    opd: 'Sekretariat DPRD'
  }
];

// Fungsi cerdas: Mencocokkan nama program spesifik dengan nama OPD
// Prioritas 1: Dokumen Konteks RSO/ROO OPD
// Prioritas 2: Nomenklatur Program Spesifik Standar Daerah (Permendagri 90/2019)
export const detectOPDForProgram = (
  programName: string,
  rsoContexts: any[] = []
): { opd: string; source: 'RSO' | 'ROO' | 'STANDAR' } | null => {
  const normProg = (programName || '').toLowerCase().trim();
  if (!normProg) return null;
  // Jangan tebak program umum/generic (hanya untuk nama program spesifik)
  if (isGenericProgram(normProg)) return null;

  // 1. Cek dari dokumen Konteks Risiko Strategis OPD (RSO) & Risiko Operasional OPD (ROO) yang tersimpan
  for (const ctx of rsoContexts) {
    const opdName = (ctx.opdDinilai || ctx.namaPemda || ctx.namaOpd || ctx.organization || '').trim();
    if (!opdName) continue;

    const ctxPrograms: string[] = [];
    if (Array.isArray(ctx.program)) {
      ctx.program.forEach((p: any) => typeof p === 'string' && ctxPrograms.push(p));
    } else if (typeof ctx.program === 'string') {
      ctxPrograms.push(ctx.program);
    }
    if (Array.isArray(ctx.assessmentRows)) {
      ctx.assessmentRows.forEach((r: any) => r.program && ctxPrograms.push(r.program));
    }

    const matched = ctxPrograms.some(p => {
      const pNorm = (p || '').toLowerCase().trim();
      return pNorm && (pNorm === normProg || pNorm.includes(normProg) || normProg.includes(pNorm));
    });

    if (matched) {
      const isRoo = ctx.riskType === 'operasional' || (ctx.id || '').includes('operasional');
      return { opd: opdName, source: isRoo ? 'ROO' : 'RSO' };
    }
  }

  // 2. Cek aturan Permendagri 90/2019 berdasarkan kata kunci program spesifik
  for (const rule of SPECIFIC_PROGRAM_OPD_RULES) {
    const match = rule.keywords.some(kw => normProg.includes(kw));
    if (match) {
      return { opd: rule.opd, source: 'STANDAR' };
    }
  }

  return null;
};

// Helper: Normalisasi data Audit Universe (Forward-fill Program & OPD untuk baris indikator tanpa nama program)
export const normalizeAuditUniverseData = (
  items: AuditUniverseItem[],
  rsoContexts: any[] = [],
  allowAutoFillOPD: boolean = true
): { normalized: AuditUniverseItem[]; hasChanges: boolean } => {
  if (!items || items.length === 0) return { normalized: [], hasChanges: false };
  let hasChanges = false;
  const result: AuditUniverseItem[] = items.map(item => ({
    ...item,
    irbanPengampu: item.irbanPengampu === 'Irban Khusus' ? 'Irbansus' : (item.irbanPengampu || ''),
    indikatorSasaranRpjmd: item.indikatorSasaranRpjmd || '',
    indikatorTujuanRpjmd: item.indikatorTujuanRpjmd || DEFAULT_INDIKATOR_TUJUAN[item.tujuanRpjmd] || ''
  }));

  // Step 1: Forward fill programRpjmd & OPD & Renstra & Faktor Risiko untuk baris yang program-nya kosong tapi merupakan indikator di bawahnya
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    const prevProg = (prev.programRpjmd || '').trim();
    const currProg = (curr.programRpjmd || '').trim();

    if (prevProg !== '' && currProg === '') {
      const prevTujuan = (prev.tujuanRpjmd || '').trim();
      const currTujuan = (curr.tujuanRpjmd || '').trim();
      const prevSasaran = (prev.sasaranRpjmd || '').trim();
      const currSasaran = (curr.sasaranRpjmd || '').trim();

      const sameTujuan = !currTujuan || currTujuan === prevTujuan;
      const sameSasaran = !currSasaran || currSasaran === prevSasaran;

      if (sameTujuan && sameSasaran) {
        curr.programRpjmd = prev.programRpjmd;
        if (!curr.tujuanRpjmd && prev.tujuanRpjmd) curr.tujuanRpjmd = prev.tujuanRpjmd;
        if (!curr.indikatorTujuanRpjmd && prev.indikatorTujuanRpjmd) curr.indikatorTujuanRpjmd = prev.indikatorTujuanRpjmd;
        if (!curr.sasaranRpjmd && prev.sasaranRpjmd) curr.sasaranRpjmd = prev.sasaranRpjmd;
        if (!curr.indikatorSasaranRpjmd && prev.indikatorSasaranRpjmd) curr.indikatorSasaranRpjmd = prev.indikatorSasaranRpjmd;
        if (!curr.opdPengampu && prev.opdPengampu) curr.opdPengampu = prev.opdPengampu;
        if (!curr.irbanPengampu && prev.irbanPengampu) curr.irbanPengampu = prev.irbanPengampu;
        if (!curr.tujuanSasaranRenstra && prev.tujuanSasaranRenstra) curr.tujuanSasaranRenstra = prev.tujuanSasaranRenstra;
        if (!curr.indikatorRenstra && prev.indikatorRenstra) curr.indikatorRenstra = prev.indikatorRenstra;
        if (!curr.programRenstra && prev.programRenstra) curr.programRenstra = prev.programRenstra;
        if ((!curr.anggaran || curr.anggaran === 0) && prev.anggaran) curr.anggaran = prev.anggaran;
        if (!curr.prioritasRpjmn && prev.prioritasRpjmn) curr.prioritasRpjmn = prev.prioritasRpjmn;
        if ((!curr.sektorUnggulan || curr.sektorUnggulan === 'Bukan sektor unggulan daerah') && prev.sektorUnggulan && prev.sektorUnggulan !== 'Bukan sektor unggulan daerah') {
          curr.sektorUnggulan = prev.sektorUnggulan;
        }
        if (!curr.temuanFraudHukum && prev.temuanFraudHukum) curr.temuanFraudHukum = prev.temuanFraudHukum;
        if (!curr.isuTerkini && prev.isuTerkini) curr.isuTerkini = prev.isuTerkini;
        hasChanges = true;
      }
    }
  }

  // Step 1.5: Auto-fill OPD untuk nama program spesifik yang belum memiliki OPD (hanya jika diizinkan / Admin)
  if (allowAutoFillOPD) {
    result.forEach(item => {
      const prog = (item.programRpjmd || '').trim();
      if (prog && (!item.opdPengampu || item.opdPengampu.trim() === '')) {
        const detected = detectOPDForProgram(prog, rsoContexts);
        if (detected) {
          item.opdPengampu = detected.opd;
          hasChanges = true;
        }
      }
    });
  }

  // Step 2: Unify OPD, Irban, Renstra & Faktor Risiko untuk setiap Program RPJMD yang sama
  interface ProgramCanonicalData {
    opdPengampu?: string;
    irbanPengampu?: string;
    tujuanSasaranRenstra?: string;
    indikatorRenstra?: string;
    programRenstra?: string;
    anggaran?: number;
    prioritasRpjmn?: string;
    sektorUnggulan?: string;
    temuanFraudHukum?: string;
    isuTerkini?: string;
  }
  const programCanonicalMap = new Map<string, ProgramCanonicalData>();

  result.forEach(item => {
    const prog = (item.programRpjmd || '').trim().toLowerCase();
    if (!prog) return;

    let canon = programCanonicalMap.get(prog);
    if (!canon) {
      canon = {};
      programCanonicalMap.set(prog, canon);
    }

    if (!canon.opdPengampu && (item.opdPengampu || '').trim()) canon.opdPengampu = item.opdPengampu.trim();
    if (!canon.irbanPengampu && (item.irbanPengampu || '').trim()) canon.irbanPengampu = item.irbanPengampu.trim();
    if (!canon.tujuanSasaranRenstra && (item.tujuanSasaranRenstra || '').trim()) canon.tujuanSasaranRenstra = item.tujuanSasaranRenstra.trim();
    if (!canon.indikatorRenstra && (item.indikatorRenstra || '').trim()) canon.indikatorRenstra = item.indikatorRenstra.trim();
    if (!canon.programRenstra && (item.programRenstra || '').trim()) canon.programRenstra = item.programRenstra.trim();
    if ((!canon.anggaran || canon.anggaran === 0) && item.anggaran) canon.anggaran = Number(item.anggaran);
    if (!canon.prioritasRpjmn && (item.prioritasRpjmn || '').trim()) canon.prioritasRpjmn = item.prioritasRpjmn.trim();
    if ((!canon.sektorUnggulan || canon.sektorUnggulan === 'Bukan sektor unggulan daerah') && item.sektorUnggulan && item.sektorUnggulan !== 'Bukan sektor unggulan daerah') {
      canon.sektorUnggulan = item.sektorUnggulan;
    }
    if (!canon.temuanFraudHukum && (item.temuanFraudHukum || '').trim()) canon.temuanFraudHukum = item.temuanFraudHukum.trim();
    if (!canon.isuTerkini && (item.isuTerkini || '').trim()) canon.isuTerkini = item.isuTerkini.trim();
  });

  result.forEach(item => {
    const prog = (item.programRpjmd || '').trim().toLowerCase();
    if (!prog) return;
    const canon = programCanonicalMap.get(prog);
    if (!canon) return;

    if (canon.opdPengampu && (item.opdPengampu || '').trim() !== canon.opdPengampu) {
      item.opdPengampu = canon.opdPengampu;
      hasChanges = true;
    }
    if (canon.irbanPengampu && (item.irbanPengampu || '').trim() !== canon.irbanPengampu) {
      item.irbanPengampu = canon.irbanPengampu;
      hasChanges = true;
    }
    if (canon.tujuanSasaranRenstra && (item.tujuanSasaranRenstra || '').trim() !== canon.tujuanSasaranRenstra) {
      item.tujuanSasaranRenstra = canon.tujuanSasaranRenstra;
      hasChanges = true;
    }
    if (canon.indikatorRenstra && (item.indikatorRenstra || '').trim() !== canon.indikatorRenstra) {
      item.indikatorRenstra = canon.indikatorRenstra;
      hasChanges = true;
    }
    if (canon.programRenstra && (item.programRenstra || '').trim() !== canon.programRenstra) {
      item.programRenstra = canon.programRenstra;
      hasChanges = true;
    }
    if (canon.anggaran !== undefined && (item.anggaran || 0) !== canon.anggaran) {
      item.anggaran = canon.anggaran;
      hasChanges = true;
    }
    if (canon.prioritasRpjmn && (item.prioritasRpjmn || '').trim() !== canon.prioritasRpjmn) {
      item.prioritasRpjmn = canon.prioritasRpjmn;
      hasChanges = true;
    }
    if (canon.sektorUnggulan && item.sektorUnggulan !== canon.sektorUnggulan) {
      item.sektorUnggulan = canon.sektorUnggulan;
      hasChanges = true;
    }
    if (canon.temuanFraudHukum && (item.temuanFraudHukum || '').trim() !== canon.temuanFraudHukum) {
      item.temuanFraudHukum = canon.temuanFraudHukum;
      hasChanges = true;
    }
    if (canon.isuTerkini && (item.isuTerkini || '').trim() !== canon.isuTerkini) {
      item.isuTerkini = canon.isuTerkini;
      hasChanges = true;
    }
  });

  return { normalized: result, hasChanges };
};

export interface AuditUniverseViewProps {
  isAdmin?: boolean;
  year?: string;
}

export const AuditUniverseView: React.FC<AuditUniverseViewProps> = ({ isAdmin: isAdminProp, year }) => {
  const currentYear = year || getSelectedYear();
  const storageKey = getScopedKey('ppbr_audit_universe', currentYear);
  const docId = getScopedPPBRDocId('audit_universe', currentYear);

  const isAdmin = isAdminProp !== undefined ? isAdminProp : (() => {
    try {
      const saved = localStorage.getItem('isman_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'Operator') return false;
        return !u.role || u.role === 'Administrator' || u.role === 'Admin' || u.username?.toLowerCase() === 'admin';
      }
    } catch (_) {}
    return true; // Default to true in standalone PPBR mode so user can access cleanup tools
  })();

  const [data, setData] = useState<AuditUniverseItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const { normalized } = normalizeAuditUniverseData(parsed);
          return normalized;
        }
      } catch (e) {
        console.error('Failed to parse ' + storageKey, e);
      }
    }
    // Only return initial demo/seed data for 2026. For 2027 and other years, start empty!
    const base = currentYear === DEFAULT_YEAR ? INITIAL_AUDIT_UNIVERSE : [];
    const { normalized } = normalizeAuditUniverseData(base);
    return normalized;
  });

  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIrban, setFilterIrban] = useState('ALL');
  const [filterOPD, setFilterOPD] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [mergeViewMode, setMergeViewMode] = useState<boolean>(true);

  // RSO & ROO Contexts (untuk deteksi otomatis OPD dan program terkait)
  const [rsoContexts, setRsoContexts] = useState<any[]>([]);

  // Cloud Real-time Synchronization State
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'offline' | 'error'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safely preserve any existing local data on laptop before cloud can overwrite it
  const [localBackupData, setLocalBackupData] = useState<AuditUniverseItem[] | null>(() => {
    try {
      const saved = localStorage.getItem('ppbr_audit_universe');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!localStorage.getItem('ppbr_audit_universe_local_backup')) {
            localStorage.setItem('ppbr_audit_universe_local_backup', saved);
          }
          return parsed;
        }
      }
      const existingBackup = localStorage.getItem('ppbr_audit_universe_local_backup');
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

  // Irban List state with local persistence & Firestore sync (Single Source of Truth)
  const [irbanList, setIrbanList] = useState<string[]>(() => {
    const saved = localStorage.getItem('ppbr_irban_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse ppbr_irban_list', e);
      }
    }
    return DEFAULT_IRBAN_LIST;
  });

  // Load RSO dan ROO contexts dari Firestore & LocalStorage untuk auto-fill nama dinas
  useEffect(() => {
    let isMounted = true;
    const loadContexts = async () => {
      const loaded: any[] = [];
      // 1. Ambil dari localStorage cached_context_*
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cached_context_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const c = JSON.parse(raw);
              if (c && (c.opdDinilai || c.namaPemda || c.program || c.assessmentRows)) {
                loaded.push({ ...c, id: key.replace('cached_context_', 'risk_context_') });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Load local cached context warning:', e);
      }

      // 2. Ambil dari Firestore collection risk_context
      try {
        const snap = await getDocs(collection(db, 'risk_context'));
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (d && (d.opdDinilai || d.namaPemda || d.program || d.assessmentRows)) {
            loaded.push({ ...d, id: docSnap.id });
          }
        });
      } catch (e) {
        console.warn('Load firestore risk_context warning:', e);
      }

      if (isMounted) {
        setRsoContexts(loaded);
        // Langsung auto-fill dan normalisasi seluruh baris data yang ada tanpa perlu klik manual
        setData(prevData => {
          const { normalized, hasChanges } = normalizeAuditUniverseData(prevData, loaded);
          if (hasChanges) {
            handleSaveData(normalized, true);
          }
          return normalized;
        });
      }
    };

    loadContexts();
    return () => {
      isMounted = false;
    };
  }, [currentYear]);

  // Real-time listener: Listen to Firestore Cloud Database updates
  useEffect(() => {
    // 1. Subscribe to Audit Universe in Firestore
    const auDocRef = doc(db, 'ppbr_data', docId);
    const unsubAU = onSnapshot(auDocRef, (snap) => {
      if (snap.exists()) {
        const snapData = snap.data();
        if (snapData && Array.isArray(snapData.items)) {
          isRemoteUpdateRef.current = true;
          const { normalized, hasChanges } = normalizeAuditUniverseData(snapData.items);
          setData(normalized);
          localStorage.setItem(storageKey, JSON.stringify(normalized));
          setCloudStatus('synced');
          if (snapData.updatedAt) {
            try {
              setLastSyncedTime(new Date(snapData.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (_) {
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
          }
          if (hasChanges) {
            setDoc(auDocRef, {
              items: normalized,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(err => console.warn('Auto-save normalized data to cloud:', err));
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      } else {
        // If not in Firestore yet, automatically push current data so all users see it
        setDoc(auDocRef, {
          items: data,
          updatedAt: new Date().toISOString(),
          title: `Audit Universe Master ${currentYear}`
        }, { merge: true }).catch(err => {
          console.warn('Initial push to cloud error:', err);
        });
      }
    }, (err) => {
      console.warn('Firestore Audit Universe listener warning:', err?.message || err);
      setCloudStatus('offline');
    });

    // 2. Subscribe to Irban List in Firestore
    const irbanDocRef = doc(db, 'ppbr_data', 'irban_list');
    const unsubIrban = onSnapshot(irbanDocRef, (snap) => {
      if (snap.exists()) {
        const listData = snap.data()?.list;
        if (Array.isArray(listData) && listData.length > 0) {
          setIrbanList(listData);
          localStorage.setItem('ppbr_irban_list', JSON.stringify(listData));
        }
      } else {
        setDoc(irbanDocRef, {
          list: irbanList,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          console.warn('Initial irban push error:', err);
        });
      }
    }, (err) => {
      console.warn('Firestore Irban listener warning:', err?.message || err);
    });

    return () => {
      unsubAU();
      unsubIrban();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveIrbanList = (newList: string[]) => {
    setIrbanList(newList);
    localStorage.setItem('ppbr_irban_list', JSON.stringify(newList));
    // Sync to Firestore
    setDoc(doc(db, 'ppbr_data', 'irban_list'), {
      list: newList,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(e => {
      console.warn('Failed to sync irban list to cloud:', e);
    });
  };

  // Active Irbans from irbanList (single source of truth - no ghost items from old rows)
  const allIrbanOptions = useMemo(() => {
    return irbanList.length > 0 ? irbanList : ['Irban I'];
  }, [irbanList]);

  // Modal state for adding a new Irban
  const [addIrbanModal, setAddIrbanModal] = useState<{
    isOpen: boolean;
    nameInput: string;
    source: 'filter' | 'row' | 'manage';
    targetRowId?: string;
  }>({
    isOpen: false,
    nameInput: '',
    source: 'filter'
  });

  // Modal state for managing Irban list
  const [isManageIrbanOpen, setIsManageIrbanOpen] = useState(false);
  const [manageNewIrbanInput, setManageNewIrbanInput] = useState('');

  const openAddIrban = (source: 'filter' | 'row' | 'manage', targetRowId?: string) => {
    setAddIrbanModal({
      isOpen: true,
      nameInput: '',
      source,
      targetRowId
    });
  };

  const handleConfirmAddIrban = () => {
    const trimmed = addIrbanModal.nameInput.trim();
    if (!trimmed) return;

    if (!irbanList.includes(trimmed)) {
      const updatedList = [...irbanList, trimmed];
      handleSaveIrbanList(updatedList);
    }

    if (addIrbanModal.source === 'filter') {
      setFilterIrban(trimmed);
    } else if (addIrbanModal.source === 'row' && addIrbanModal.targetRowId) {
      handleCellChange(addIrbanModal.targetRowId, 'irbanPengampu', trimmed);
    }

    setAddIrbanModal(prev => ({ ...prev, isOpen: false, nameInput: '' }));
  };

  const handleQuickAddIrbanInManage = () => {
    const trimmed = manageNewIrbanInput.trim();
    if (!trimmed) return;
    if (!irbanList.includes(trimmed)) {
      handleSaveIrbanList([...irbanList, trimmed]);
    }
    setManageNewIrbanInput('');
  };

  const handleDeleteIrban = (irbanToDelete: string, usageCount: number) => {
    const updated = irbanList.filter(i => i !== irbanToDelete);
    const fallbackIrban = updated.length > 0 ? updated[0] : 'Irban I';
    const finalUpdated = updated.length > 0 ? updated : [fallbackIrban];

    const applyDeletion = () => {
      // 1. Save new list locally and to Cloud
      handleSaveIrbanList(finalUpdated);

      // 2. Re-assign any row using this deleted Irban to the fallback Irban so no ghost references remain
      if (usageCount > 0) {
        const updatedData = data.map(item => {
          if (
            item.irbanPengampu === irbanToDelete ||
            (irbanToDelete === 'Irbansus' && item.irbanPengampu === 'Irban Khusus')
          ) {
            return { ...item, irbanPengampu: fallbackIrban };
          }
          return item;
        });
        handleSaveData(updatedData, true);
      }

      // 3. Reset filter if the deleted Irban was currently selected
      if (filterIrban === irbanToDelete) {
        setFilterIrban('ALL');
      }
    };

    if (usageCount > 0) {
      setConfirmModal({
        isOpen: true,
        title: `Hapus ${irbanToDelete}?`,
        message: `Irban ini saat ini digunakan pada ${usageCount} baris di Audit Universe. Menghapus Irban ini akan mengalihkan ${usageCount} baris tersebut ke "${fallbackIrban}" dan menghapusnya dari seluruh pilihan dropdown.`,
        confirmText: `Ya, Hapus & Alihkan ke ${fallbackIrban}`,
        variant: 'warning',
        onConfirm: applyDeletion
      });
    } else {
      applyDeletion();
    }
  };

  const handleResetIrbanToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Daftar Irban ke Standar?',
      message: 'Daftar pilihan Irban akan dikembalikan ke standar awal (Irban I, Irban II, Irban III, Irban IV, Irbansus).',
      confirmText: 'Ya, Kembalikan ke Standar',
      variant: 'info',
      onConfirm: () => {
        handleSaveIrbanList(DEFAULT_IRBAN_LIST);
      }
    });
  };

  const defaultNewRowIrban = filterIrban !== 'ALL' && filterIrban !== 'UNASSIGNED' ? filterIrban : '';

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

  // Dual Persistence: Save to local state + localStorage + Firestore Cloud
  const handleSaveData = (newData: AuditUniverseItem[], immediateCloud = false) => {
    setData(newData);
    localStorage.setItem(storageKey, JSON.stringify(newData));

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
          updatedAt: nowIso
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

  // Manual Trigger: Pull latest data or Push current data to Firestore
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setCloudStatus('saving');
    try {
      const snap = await getDoc(doc(db, 'ppbr_data', docId));
      if (snap.exists() && Array.isArray(snap.data()?.items)) {
        const mapped = snap.data().items.map((item: any) => ({
          ...item,
          irbanPengampu: item.irbanPengampu === 'Irban Khusus' ? 'Irbansus' : (item.irbanPengampu || ''),
          indikatorSasaranRpjmd: item.indikatorSasaranRpjmd || '',
          indikatorTujuanRpjmd: item.indikatorTujuanRpjmd || DEFAULT_INDIKATOR_TUJUAN[item.tujuanRpjmd] || ''
        }));
        const { normalized } = normalizeAuditUniverseData(mapped);
        setData(normalized);
        localStorage.setItem(storageKey, JSON.stringify(normalized));
      } else {
        await setDoc(doc(db, 'ppbr_data', docId), {
          items: data,
          updatedAt: new Date().toISOString()
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
      message: `Terdapat ${localBackupData.length} baris data yang tersimpan di laptop ini. Mengunggahnya akan menjadikan data ini sebagai data utama Cloud server dan langsung terlihat oleh rekan-rekan Anda.`,
      confirmText: 'Ya, Unggah ke Cloud',
      variant: 'info',
      onConfirm: () => {
        handleSaveData(localBackupData, true);
        setShowLocalRestoreBanner(false);
      }
    });
  };

  // Export current data or local backup as a JSON file
  const handleDownloadBackupJson = (itemsToDownload: AuditUniverseItem[], filename = 'audit_universe_backup.json') => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(itemsToDownload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportJson = () => {
    handleDownloadBackupJson(data, `audit_universe_backup_${new Date().toISOString().split('T')[0]}.json`);
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
            title: 'Impor Data Audit Universe?',
            message: `File ini berisi ${parsed.length} baris program. Apakah Anda ingin mengimpor data ini dan menyinkronkannya ke Cloud untuk seluruh tim? Data di tabel saat ini akan digantikan.`,
            confirmText: 'Ya, Impor & Sinkronkan',
            variant: 'info',
            onConfirm: () => {
              const mapped = parsed.map((item: any, idx: number) => ({
                id: item.id || `au-${Date.now()}-${idx}`,
                no: idx + 1,
                tujuanRpjmd: item.tujuanRpjmd || '',
                indikatorTujuanRpjmd: item.indikatorTujuanRpjmd || '',
                sasaranRpjmd: item.sasaranRpjmd || '',
                indikatorSasaranRpjmd: item.indikatorSasaranRpjmd || '',
                programRpjmd: item.programRpjmd || '',
                indikatorProgramRpjmd: item.indikatorProgramRpjmd || '',
                opdPengampu: item.opdPengampu || '',
                irbanPengampu: item.irbanPengampu === 'Irban Khusus' ? 'Irbansus' : (item.irbanPengampu || ''),
                tujuanSasaranRenstra: item.tujuanSasaranRenstra || '',
                indikatorRenstra: item.indikatorRenstra || '',
                programRenstra: item.programRenstra || '',
                indikatorProgramRenstra: item.indikatorProgramRenstra || '',
                anggaran: Number(item.anggaran) || 0,
                prioritasRpjmn: item.prioritasRpjmn || '',
                sektorUnggulan: item.sektorUnggulan || 'Bukan sektor unggulan daerah',
                temuanFraudHukum: item.temuanFraudHukum || '',
                isuTerkini: item.isuTerkini || ''
              }));
              handleSaveData(mapped, true);
              setShowLocalRestoreBanner(false);
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse JSON file', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Direct cell update
  const handleCellChange = (id: string, field: keyof AuditUniverseItem, value: any) => {
    let detectedOpdName: string | null = null;
    const updated = data.map(item => {
      if (item.id === id) {
        const next: AuditUniverseItem = {
          ...item,
          [field]: field === 'anggaran' ? Number(value) || 0 : value
        };
        // Auto-detect OPD jika nama program spesifik diinput/diubah dan OPD belum terisi (Khusus Admin)
        if (isAdmin && field === 'programRpjmd' && (!item.opdPengampu || item.opdPengampu.trim() === '')) {
          const detected = detectOPDForProgram(value, rsoContexts);
          if (detected) {
            next.opdPengampu = detected.opd;
            detectedOpdName = detected.opd;
            // Wariskan juga Irban jika OPD ini sudah pernah dipetakan ke Irban tertentu di baris lain
            if (!next.irbanPengampu) {
              const matchWithIrban = data.find(d => (d.opdPengampu || '').trim().toLowerCase() === detected.opd.toLowerCase() && d.irbanPengampu);
              if (matchWithIrban) next.irbanPengampu = matchWithIrban.irbanPengampu;
            }
          }
        }
        return next;
      }
      return item;
    });
    handleSaveData(updated);
    if (detectedOpdName) {
      setToastNotice(`OPD otomatis terisi: "${detectedOpdName}"`);
      setTimeout(() => setToastNotice(null), 3000);
    }
  };

  // Update merged cell across identical group
  const handleMergedCellChange = (
    field: keyof AuditUniverseItem,
    groupIndices: number[],
    value: any
  ) => {
    const idsToUpdate = new Set(groupIndices.map(idx => filteredData[idx]?.id).filter(Boolean));
    let detectedOpdName: string | null = null;
    const updated = data.map(item => {
      if (idsToUpdate.has(item.id)) {
        const next: AuditUniverseItem = {
          ...item,
          [field]: field === 'anggaran' ? Number(value) || 0 : value
        };
        // Auto-detect OPD jika nama program spesifik diinput/diubah dan OPD belum terisi (Khusus Admin)
        if (isAdmin && field === 'programRpjmd' && (!item.opdPengampu || item.opdPengampu.trim() === '')) {
          const detected = detectOPDForProgram(value, rsoContexts);
          if (detected) {
            next.opdPengampu = detected.opd;
            detectedOpdName = detected.opd;
            if (!next.irbanPengampu) {
              const matchWithIrban = data.find(d => (d.opdPengampu || '').trim().toLowerCase() === detected.opd.toLowerCase() && d.irbanPengampu);
              if (matchWithIrban) next.irbanPengampu = matchWithIrban.irbanPengampu;
            }
          }
        }
        return next;
      }
      return item;
    });
    handleSaveData(updated);
    if (detectedOpdName) {
      setToastNotice(`OPD otomatis terisi: "${detectedOpdName}"`);
      setTimeout(() => setToastNotice(null), 3000);
    }
  };

  // Add new single row
  const handleAddRow = () => {
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: '',
      indikatorTujuanRpjmd: '',
      sasaranRpjmd: '',
      indikatorSasaranRpjmd: '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: defaultNewRowIrban,
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const updated = [...data, newRow];
    handleSaveData(updated);
  };

  // Add a new Indikator Tujuan under an existing Tujuan (Tujuan will remain merged)
  const handleAddIndikatorUnderTujuan = (
    tujuan: string,
    afterIndex: number
  ) => {
    const targetItem = filteredData[afterIndex];
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: '',
      sasaranRpjmd: '',
      indikatorSasaranRpjmd: '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: targetItem?.irbanPengampu || defaultNewRowIrban,
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Add a new Sasaran under an existing Indikator Tujuan (Tujuan & Indikator Tujuan will merge)
  const handleAddSasaranUnderIndikatorTujuan = (
    tujuan: string,
    indTujuan: string,
    afterIndex: number
  ) => {
    const targetItem = filteredData[afterIndex];
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: indTujuan || '',
      sasaranRpjmd: '',
      indikatorSasaranRpjmd: '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: targetItem?.irbanPengampu || defaultNewRowIrban,
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Add a new Indikator Sasaran under an existing Sasaran (Tujuan & Sasaran will be merged)
  const handleAddIndikatorUnderSasaran = (
    tujuan: string,
    sasaran: string,
    indTujuan: string,
    afterIndex: number
  ) => {
    const targetItem = filteredData[afterIndex];
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: indTujuan || '',
      sasaranRpjmd: sasaran,
      indikatorSasaranRpjmd: '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: targetItem?.irbanPengampu || defaultNewRowIrban,
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Add program under an existing Indikator Sasaran (Tujuan, Sasaran, and Indikator Sasaran will merge)
  const handleAddProgramUnderIndikator = (
    tujuan: string,
    sasaran: string,
    indSasaran: string,
    indTujuan: string,
    afterIndex: number
  ) => {
    const targetItem = filteredData[afterIndex];
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: indTujuan || '',
      sasaranRpjmd: sasaran,
      indikatorSasaranRpjmd: indSasaran || '',
      programRpjmd: '',
      indikatorProgramRpjmd: '',
      opdPengampu: '',
      irbanPengampu: targetItem?.irbanPengampu || defaultNewRowIrban,
      tujuanSasaranRenstra: '',
      indikatorRenstra: '',
      programRenstra: '',
      indikatorProgramRenstra: '',
      anggaran: 0,
      prioritasRpjmn: '',
      sektorUnggulan: 'Bukan sektor unggulan daerah',
      temuanFraudHukum: '',
      isuTerkini: ''
    };
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
  };

  // Add a new Indicator row under an existing Program RPJMD (Program and OPD and Renstra remain merged)
  const handleAddIndikatorUnderProgram = (
    tujuan: string,
    sasaran: string,
    indSasaran: string,
    indTujuan: string,
    program: string,
    opd: string,
    irban: string,
    afterIndex: number
  ) => {
    const targetItem = filteredData[afterIndex];
    const newRow: AuditUniverseItem = {
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1,
      tujuanRpjmd: tujuan,
      indikatorTujuanRpjmd: indTujuan || '',
      sasaranRpjmd: sasaran,
      indikatorSasaranRpjmd: indSasaran || '',
      programRpjmd: program,
      indikatorProgramRpjmd: '',
      opdPengampu: opd,
      irbanPengampu: irban || targetItem?.irbanPengampu || defaultNewRowIrban,
      tujuanSasaranRenstra: targetItem?.tujuanSasaranRenstra || '',
      indikatorRenstra: targetItem?.indikatorRenstra || '',
      programRenstra: targetItem?.programRenstra || '',
      indikatorProgramRenstra: '',
      anggaran: targetItem?.anggaran ?? 0,
      prioritasRpjmn: targetItem?.prioritasRpjmn || '',
      sektorUnggulan: targetItem?.sektorUnggulan || 'Bukan sektor unggulan daerah',
      temuanFraudHukum: targetItem?.temuanFraudHukum || '',
      isuTerkini: targetItem?.isuTerkini || ''
    };
    const originalIndex = data.findIndex(d => d.id === targetItem?.id);
    const updated = [...data];
    if (originalIndex !== -1) {
      updated.splice(originalIndex + 1, 0, newRow);
    } else {
      updated.push(newRow);
    }
    const renumbered = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
    handleSaveData(renumbered);
    setToastNotice(`Berhasil menambahkan baris indikator baru untuk program "${program || targetItem?.programRenstra || 'RPJMD'}"`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Hapus hanya satu baris indikator dalam program yang dimerge
  const handleDeleteIndicatorRow = (item: AuditUniverseItem) => {
    const indicatorName = item.indikatorProgramRpjmd || item.indikatorProgramRenstra || `Baris No. ${item.no}`;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Baris Indikator Ini?',
      message: `Apakah Anda yakin ingin menghapus baris indikator: "${indicatorName}"? Baris indikator lain pada program ini akan tetap tersimpan.`,
      confirmText: 'Ya, Hapus Indikator',
      variant: 'danger',
      onConfirm: () => {
        const updated = data
          .filter(d => d.id !== item.id)
          .map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  // Hapus seluruh program beserta seluruh indikatornya
  const requestDeleteProgram = (indices: number[], programName: string) => {
    const itemsToDelete = indices.map(idx => filteredData[idx]).filter(Boolean);
    const idsToDelete = new Set(itemsToDelete.map(d => d.id));
    setConfirmModal({
      isOpen: true,
      title: `Hapus Seluruh Program (${idsToDelete.size} Baris)?`,
      message: `Apakah Anda yakin ingin menghapus program "${programName}" beserta seluruh ${idsToDelete.size} baris indikator di dalamnya?`,
      confirmText: 'Ya, Hapus Program',
      variant: 'danger',
      onConfirm: () => {
        const updated = data
          .filter(d => !idsToDelete.has(d.id))
          .map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  // Merge Program & OPD otomatis untuk baris indikator tanpa nama program di bawahnya
  const handleRunNormalizeAndMerge = () => {
    const { normalized, hasChanges } = normalizeAuditUniverseData(data, rsoContexts);
    if (!hasChanges) {
      setToastNotice('Data Program & OPD sudah optimal dan terorganisir rapi.');
      setTimeout(() => setToastNotice(null), 3000);
      return;
    }
    handleSaveData(normalized, true);
    setToastNotice('Berhasil merapikan & mengisi otomatis Program dan OPD!');
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Fitur Khusus: Isi otomatis nama Dinas/OPD yang masih kosong berdasarkan RSO/ROO & Nomenklatur Program
  const handleAutoFillOPDFromRSO = () => {
    let filledCount = 0;
    const updated = data.map(item => {
      const curProg = (item.programRpjmd || '').trim();
      const curOpd = (item.opdPengampu || '').trim();
      if (curProg && !curOpd) {
        const detected = detectOPDForProgram(curProg, rsoContexts);
        if (detected) {
          filledCount++;
          const next = {
            ...item,
            opdPengampu: detected.opd
          };
          if (!next.irbanPengampu) {
            const matchWithIrban = data.find(d => (d.opdPengampu || '').trim().toLowerCase() === detected.opd.toLowerCase() && d.irbanPengampu);
            if (matchWithIrban) next.irbanPengampu = matchWithIrban.irbanPengampu;
          }
          return next;
        }
      }
      return item;
    });

    if (filledCount === 0) {
      setToastNotice('Seluruh nama OPD untuk program spesifik sudah terisi dengan baik.');
      setTimeout(() => setToastNotice(null), 3500);
      return;
    }

    const { normalized } = normalizeAuditUniverseData(updated, rsoContexts);
    handleSaveData(normalized, true);
    setToastNotice(`Berhasil mengisi otomatis ${filledCount} nama Dinas/OPD berdasarkan RSO/ROO!`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Add multiple rows
  const handleAddMultipleRows = (count: number) => {
    const newRows: AuditUniverseItem[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `au-${baseTime + i}-${Math.random().toString(36).substring(2, 6)}`,
        no: data.length + i + 1,
        tujuanRpjmd: '',
        indikatorTujuanRpjmd: '',
        sasaranRpjmd: '',
        indikatorSasaranRpjmd: '',
        programRpjmd: '',
        indikatorProgramRpjmd: '',
        opdPengampu: '',
        irbanPengampu: defaultNewRowIrban,
        tujuanSasaranRenstra: '',
        indikatorRenstra: '',
        programRenstra: '',
        indikatorProgramRenstra: '',
        anggaran: 0,
        prioritasRpjmn: '',
        sektorUnggulan: 'Bukan sektor unggulan daerah',
        temuanFraudHukum: '',
        isuTerkini: ''
      });
    }
    const updated = [...data, ...newRows];
    handleSaveData(updated);
  };

  // Duplicate a row
  const handleDuplicateRow = (item: AuditUniverseItem) => {
    const duplicate: AuditUniverseItem = {
      ...item,
      id: `au-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      no: data.length + 1
    };
    const updated = [...data, duplicate];
    handleSaveData(updated);
  };

  // Request Delete row with confirmation dialog
  const requestDeleteRow = (item: AuditUniverseItem) => {
    const programName = item.programRpjmd || item.programRenstra || `Baris No. ${item.no}`;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Baris Program?',
      message: `Apakah Anda yakin ingin menghapus baris program ini dari tabel Audit Universe? Data pada baris ini akan dihapus secara permanen.`,
      detail: `Program: "${programName}" ${item.opdPengampu ? `| OPD: ${item.opdPengampu}` : ''} ${item.irbanPengampu ? `| Irban: ${item.irbanPengampu}` : ''}`,
      confirmText: 'Ya, Hapus Baris',
      variant: 'danger',
      onConfirm: () => {
        const updated = data
          .filter(d => d.id !== item.id)
          .map((d, idx) => ({ ...d, no: idx + 1 }));
        handleSaveData(updated);
      }
    });
  };

  // Request Clear all data with confirmation dialog
  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Tabel Audit Universe?',
      message: `Apakah Anda yakin ingin menghapus/mengosongkan semua data (${data.length} baris program) pada tabel Audit Universe? Tindakan ini tidak dapat dibatalkan.`,
      detail: 'Seluruh entri Tujuan RPJMD, Sasaran, Program, Pemetaan OPD, Anggaran, dan Faktor Risiko yang ada di tabel ini akan terhapus.',
      confirmText: 'Ya, Kosongkan Semua',
      variant: 'danger',
      onConfirm: () => {
        handleSaveData([], true);
      }
    });
  };

  // Daftar OPD Unik dari data
  const allOpdOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => {
      const opd = (d.opdPengampu || '').trim();
      if (opd) set.add(opd);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Daftar Program Unik dari data
  const allProgramOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => {
      const prog = (d.programRpjmd || '').trim();
      if (prog) set.add(prog);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Deteksi baris kosong (tanpa Program RPJMD, tanpa OPD, tanpa Program Renstra)
  const isRowEmpty = (item: AuditUniverseItem) => {
    const hasProgram = Boolean(item.programRpjmd && item.programRpjmd.trim().length > 0);
    const hasOpd = Boolean(item.opdPengampu && item.opdPengampu.trim().length > 0);
    const hasRenstra = Boolean(item.programRenstra && item.programRenstra.trim().length > 0);
    return !hasProgram && !hasOpd && !hasRenstra;
  };

  const emptyRowsCount = useMemo(() => {
    return data.filter(isRowEmpty).length;
  }, [data]);

  // Fitur Admin: Hapus baris-baris kosong sekaligus
  const handleCleanEmptyRows = () => {
    if (emptyRowsCount === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Tidak Ada Baris Kosong',
        message: 'Tabel Audit Universe saat ini tidak memiliki baris kosong. Seluruh baris telah memiliki data Program atau OPD.',
        confirmText: 'Tutup',
        variant: 'info',
        onConfirm: () => {}
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Hapus ${emptyRowsCount} Baris Kosong?`,
      message: `Sistem mendeteksi ada ${emptyRowsCount} baris kosong (tanpa nama Program dan tanpa OPD pengampu). Apakah Anda yakin ingin menghapus seluruh baris kosong tersebut sekaligus?`,
      detail: 'Seluruh baris yang telah terisi data akan tetap aman dan nomor urut akan dirapikan kembali secara otomatis.',
      confirmText: `Ya, Hapus ${emptyRowsCount} Baris Kosong`,
      variant: 'danger',
      onConfirm: () => {
        const cleaned = data
          .filter(item => !isRowEmpty(item))
          .map((item, idx) => ({ ...item, no: idx + 1 }));
        handleSaveData(cleaned, true);
      }
    });
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch =
        (item.tujuanRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sasaranRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.programRpjmd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.opdPengampu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.programRenstra || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.irbanPengampu || '').toLowerCase().includes(searchTerm.toLowerCase());

      const rowIrban = item.irbanPengampu === 'Irban Khusus' ? 'Irbansus' : (item.irbanPengampu || '').trim();
      const matchIrban = filterIrban === 'ALL'
        ? true
        : filterIrban === 'UNASSIGNED'
          ? (!rowIrban || rowIrban === 'Belum Diisi')
          : (item.irbanPengampu === filterIrban || rowIrban === filterIrban);

      const rowOpd = (item.opdPengampu || '').trim();
      const matchOPD = filterOPD === 'ALL'
        ? true
        : filterOPD === 'UNASSIGNED'
          ? !rowOpd
          : rowOpd === filterOPD;

      const rowProg = (item.programRpjmd || '').trim();
      const matchProgram = filterProgram === 'ALL'
        ? true
        : filterProgram === 'UNASSIGNED'
          ? !rowProg
          : rowProg === filterProgram;

      return matchSearch && matchIrban && matchOPD && matchProgram;
    });
  }, [data, searchTerm, filterIrban, filterOPD, filterProgram]);

  // Compute Spans for Merging Identical Cells
  const spanInfo = useMemo(() => {
    const tujuanSpan: { [index: number]: number } = {};
    const tujuanIndices: { [index: number]: number[] } = {};
    const indikatorTujuanSpan: { [index: number]: number } = {};
    const indikatorTujuanIndices: { [index: number]: number[] } = {};
    const sasaranSpan: { [index: number]: number } = {};
    const sasaranIndices: { [index: number]: number[] } = {};
    const indikatorSpan: { [index: number]: number } = {};
    const indikatorIndices: { [index: number]: number[] } = {};
    const programSpan: { [index: number]: number } = {};
    const programIndices: { [index: number]: number[] } = {};

    if (!mergeViewMode) {
      return {
        tujuanSpan,
        tujuanIndices,
        indikatorTujuanSpan,
        indikatorTujuanIndices,
        sasaranSpan,
        sasaranIndices,
        indikatorSpan,
        indikatorIndices,
        programSpan,
        programIndices
      };
    }

    let i = 0;
    while (i < filteredData.length) {
      const currentTujuan = (filteredData[i].tujuanRpjmd || '').trim();
      let j = i + 1;
      const tIndices = [i];

      if (currentTujuan !== '') {
        while (j < filteredData.length && (filteredData[j].tujuanRpjmd || '').trim() === currentTujuan) {
          tIndices.push(j);
          j++;
        }
      }

      const tSpan = j - i;
      tujuanSpan[i] = tSpan;
      tujuanIndices[i] = tIndices;

      for (let k = i + 1; k < j; k++) {
        tujuanSpan[k] = 0; // mark as hidden
      }

      // Inside this tujuan group, calculate indikatorTujuan span
      let tIndStart = i;
      while (tIndStart < j) {
        const curIndT = (filteredData[tIndStart].indikatorTujuanRpjmd || '').trim();
        let tIndEnd = tIndStart + 1;
        const indTIndices = [tIndStart];

        if (curIndT !== '') {
          while (
            tIndEnd < j &&
            (filteredData[tIndEnd].indikatorTujuanRpjmd || '').trim() === curIndT
          ) {
            indTIndices.push(tIndEnd);
            tIndEnd++;
          }
        }

        const indTSpan = tIndEnd - tIndStart;
        indikatorTujuanSpan[tIndStart] = indTSpan;
        indikatorTujuanIndices[tIndStart] = indTIndices;

        for (let tk = tIndStart + 1; tk < tIndEnd; tk++) {
          indikatorTujuanSpan[tk] = 0; // mark as hidden
        }

        // Inside this indikatorTujuan group, calculate sasaran span
        let sStart = tIndStart;
        while (sStart < tIndEnd) {
          const currentSasaran = (filteredData[sStart].sasaranRpjmd || '').trim();
          let sEnd = sStart + 1;
          const sIndices = [sStart];

          if (currentSasaran !== '') {
            while (
              sEnd < tIndEnd &&
              (filteredData[sEnd].sasaranRpjmd || '').trim() === currentSasaran
            ) {
              sIndices.push(sEnd);
              sEnd++;
            }
          }

          const sSpan = sEnd - sStart;
          sasaranSpan[sStart] = sSpan;
          sasaranIndices[sStart] = sIndices;

          for (let sk = sStart + 1; sk < sEnd; sk++) {
            sasaranSpan[sk] = 0; // mark as hidden
          }

          // Inside this sasaran group, calculate indikator span
          let indStart = sStart;
          while (indStart < sEnd) {
            const curInd = (filteredData[indStart].indikatorSasaranRpjmd || '').trim();
            let indEnd = indStart + 1;
            const indIndices = [indStart];

            if (curInd !== '') {
              while (
                indEnd < sEnd &&
                (filteredData[indEnd].indikatorSasaranRpjmd || '').trim() === curInd
              ) {
                indIndices.push(indEnd);
                indEnd++;
              }
            }

            const indSpan = indEnd - indStart;
            indikatorSpan[indStart] = indSpan;
            indikatorIndices[indStart] = indIndices;

            for (let ik = indStart + 1; ik < indEnd; ik++) {
              indikatorSpan[ik] = 0;
            }

            // Inside this indikator group, calculate program span (1 Program = 1 OPD)
            let pStart = indStart;
            while (pStart < indEnd) {
              const curProg = (filteredData[pStart].programRpjmd || '').trim();
              let pEnd = pStart + 1;
              const pIndices = [pStart];

              if (curProg !== '') {
                while (
                  pEnd < indEnd &&
                  (filteredData[pEnd].programRpjmd || '').trim() === curProg
                ) {
                  pIndices.push(pEnd);
                  pEnd++;
                }
              }

              const progSpan = pEnd - pStart;
              programSpan[pStart] = progSpan;
              programIndices[pStart] = pIndices;

              for (let pk = pStart + 1; pk < pEnd; pk++) {
                programSpan[pk] = 0; // mark as hidden
              }

              pStart = pEnd;
            }

            indStart = indEnd;
          }

          sStart = sEnd;
        }

        tIndStart = tIndEnd;
      }

      i = j;
    }

    return {
      tujuanSpan,
      tujuanIndices,
      indikatorTujuanSpan,
      indikatorTujuanIndices,
      sasaranSpan,
      sasaranIndices,
      indikatorSpan,
      indikatorIndices,
      programSpan,
      programIndices
    };
  }, [filteredData, mergeViewMode]);

  // Hitung total anggaran unik per program (tidak menggelembung jika 1 program punya banyak indikator)
  const totalAnggaran = useMemo(() => {
    const seenPrograms = new Set<string>();
    return data.reduce((acc, curr) => {
      const prog = (curr.programRpjmd || '').trim().toLowerCase();
      const opd = (curr.opdPengampu || '').trim().toLowerCase();
      const key = prog ? `${opd}|||${prog}` : curr.id;
      if (seenPrograms.has(key)) return acc;
      seenPrograms.add(key);
      return acc + (Number(curr.anggaran) || 0);
    }, 0);
  }, [data]);

  // Export to Excel
  const handleExportExcel = () => {
    const cols = [
      { header: 'No', key: 'no', width: 6 },
      // RPJMD
      { header: 'Tujuan RPJMD', key: 'tujuanRpjmd', width: 30 },
      { header: 'Indikator Tujuan', key: 'indikatorTujuanRpjmd', width: 24 },
      { header: 'Sasaran RPJMD', key: 'sasaranRpjmd', width: 30 },
      { header: 'Indikator Sasaran', key: 'indikatorSasaranRpjmd', width: 28 },
      { header: 'Program RPJMD', key: 'programRpjmd', width: 30 },
      { header: 'Indikator Program', key: 'indikatorProgramRpjmd', width: 24 },
      { header: 'OPD/Unit Pengampu', key: 'opdPengampu', width: 26 },
      // Renstra OPD
      { header: 'Irban Pengampu', key: 'irbanPengampu', width: 16 },
      { header: 'Tujuan/ Sasaran dalam Renstra', key: 'tujuanSasaranRenstra', width: 28 },
      { header: 'Indikator Tujuan/ Sasaran', key: 'indikatorRenstra', width: 24 },
      { header: 'Program', key: 'programRenstra', width: 28 },
      { header: 'Indikator Program', key: 'indikatorProgramRenstra', width: 24 },
      { header: 'Anggaran Program (Rp)', key: 'anggaran', width: 22 },
      // Faktor Risiko & Isu
      { header: 'Program Prioritas terkait di RPJMN/Indikator Program', key: 'prioritasRpjmn', width: 30 },
      { header: 'Sektor Unggulan', key: 'sektorUnggulan', width: 22 },
      { header: 'Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum', key: 'temuanFraudHukum', width: 32 },
      { header: 'Isu Terkini', key: 'isuTerkini', width: 28 }
    ];

    const exportData = data.map(item => ({
      ...item,
      indikatorSasaranRpjmd: item.indikatorSasaranRpjmd || '-'
    }));

    exportToExcel(
      'Lampiran_1_Audit_Universe',
      'LAMPIRAN 1: KERTAS KERJA AUDIT UNIVERSE',
      'Pemetaan Hubungan RPJMD, Rencana Strategis (Renstra) OPD, dan Faktor-Faktor Risiko',
      cols,
      exportData
    );
  };

  // Export to PDF
  const handleExportPdf = () => {
    const headers = [
      'No',
      'Tujuan RPJMD',
      'Sasaran RPJMD',
      'Indikator Sasaran',
      'Program RPJMD',
      'Indikator Program',
      'OPD Pengampu',
      'Irban',
      'Program Renstra',
      'Anggaran (Rp)',
      'RPJMN',
      'Sektor',
      'Temuan/Fraud',
      'Isu Terkini'
    ];

    const rows = filteredData.map(d => [
      d.no,
      d.tujuanRpjmd || '-',
      d.sasaranRpjmd || '-',
      d.indikatorSasaranRpjmd || '-',
      d.programRpjmd || '-',
      d.indikatorProgramRpjmd || '-',
      d.opdPengampu || '-',
      d.irbanPengampu || '-',
      d.programRenstra || '-',
      `Rp ${(Number(d.anggaran) || 0).toLocaleString('id-ID')}`,
      d.prioritasRpjmn || '-',
      d.sektorUnggulan || '-',
      d.temuanFraudHukum || '-',
      d.isuTerkini || '-'
    ]);

    exportToPdf(
      'Lampiran_1_Audit_Universe',
      'LAMPIRAN 1: KERTAS KERJA AUDIT UNIVERSE',
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div className="space-y-6" id="ppbr-audit-universe-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-blue-400/30">
              Lampiran 1 (Format Resmi PPBR)
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-400" />
              Kertas Kerja Audit Universe
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Pemetaan menyeluruh ruang lingkup pengawasan (auditable units). Pengisian dapat dilakukan langsung pada setiap sel tabel di bawah ini. Satu Sasaran RPJMD dapat memuat lebih dari satu Indikator Sasaran melalui fitur penggabungan baris (merge). Baris dengan Tujuan, Sasaran, atau Indikator yang sama otomatis digabung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Cloud Sync Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              cloudStatus === 'synced'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : cloudStatus === 'saving'
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 animate-pulse'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
            }`}>
              {cloudStatus === 'synced' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
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
                  <span>Tersimpan Lokal (Offline)</span>
                </>
              )}
            </div>

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

            <button
              onClick={() => setMergeViewMode(!mergeViewMode)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                mergeViewMode
                  ? 'bg-blue-600/90 text-white border-blue-400/50 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Aktifkan/Nonaktifkan penggabungan baris identik"
            >
              {mergeViewMode ? <GitMerge className="w-4 h-4 text-blue-200" /> : <Split className="w-4 h-4" />}
              <span>{mergeViewMode ? 'Merge Baris: ON' : 'Merge Baris: OFF'}</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleRunNormalizeAndMerge}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Gabungkan otomatis baris indikator tanpa nama program ke Program & OPD di atasnya"
              >
                <GitMerge className="w-4 h-4 text-teal-400" />
                <span>Merge Program & OPD</span>
              </button>
            )}
            {/* Auto-Fill OPD dari RSO (Khusus Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleAutoFillOPDFromRSO}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Isi otomatis nama Dinas/OPD yang masih kosong untuk program spesifik berdasarkan RSO/ROO dan Nomenklatur"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Auto-Fill OPD (RSO)</span>
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detected Local Data Alert Banner (For recovering data typed on this laptop - Admin Only) */}
      {isAdmin && showLocalRestoreBanner && localBackupData && localBackupData.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-950">
                  Terdeteksi Data Input di Laptop Ini ({localBackupData.length} Baris Program)
                </h4>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Tersimpan di Browser
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-1 max-w-2xl leading-relaxed">
                Browser di laptop ini menyimpan data yang pernah diinput. Klik <strong>"Unggah ke Cloud"</strong> agar data ini tersimpan permanen di server Cloud dan otomatis dapat dilihat serta diedit bersama oleh seluruh rekan tim.
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
              onClick={() => handleDownloadBackupJson(localBackupData, 'data_audit_universe_laptop.json')}
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

      {/* Control Bar: Search, Add Row, Reset */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Hidden File Input for JSON Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJson}
          accept=".json"
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Tujuan, Sasaran, Program, OPD..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Filter Irban */}
            <select
              value={filterIrban}
              onChange={e => {
                if (e.target.value === '__ADD_NEW__') {
                  openAddIrban('filter');
                } else {
                  setFilterIrban(e.target.value);
                }
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-xs"
              title="Filter Irban Pengampu"
            >
              <option value="ALL">Semua Irban</option>
              <option value="UNASSIGNED" className="text-amber-700 font-bold bg-amber-50">
                ⚠️ Belum Diisi (Tanpa Irban)
              </option>
              {allIrbanOptions.map(irban => (
                <option key={irban} value={irban}>
                  {irban}
                </option>
              ))}
              <option value="__ADD_NEW__" className="text-blue-600 font-bold bg-blue-50">
                + Tambahkan Irban...
              </option>
            </select>

            {/* Filter OPD Pengampu */}
            <select
              value={filterOPD}
              onChange={e => setFilterOPD(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-xs max-w-[170px] truncate"
              title="Filter Perangkat Daerah (OPD Pengampu)"
            >
              <option value="ALL">Semua OPD</option>
              <option value="UNASSIGNED" className="text-amber-700 font-bold bg-amber-50">
                ⚠️ Belum Diisi OPD
              </option>
              {allOpdOptions.map(opd => (
                <option key={opd} value={opd}>
                  {opd}
                </option>
              ))}
            </select>

            {/* Filter Program RPJMD */}
            <select
              value={filterProgram}
              onChange={e => setFilterProgram(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-xs max-w-[190px] truncate"
              title="Filter Program RPJMD"
            >
              <option value="ALL">Semua Program RPJMD</option>
              <option value="UNASSIGNED" className="text-amber-700 font-bold bg-amber-50">
                ⚠️ Belum Diisi Program
              </option>
              {allProgramOptions.map(prog => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>

            {(filterIrban !== 'ALL' || filterOPD !== 'ALL' || filterProgram !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterIrban('ALL');
                  setFilterOPD('ALL');
                  setFilterProgram('ALL');
                }}
                className="px-2 py-2 text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline"
                title="Reset seluruh filter"
              >
                Reset Filter
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManageIrbanOpen(true)}
              className="px-2.5 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
              title="Kelola & Tambah Irban"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kelola Irban</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {isAdmin && (
            <button
              type="button"
              onClick={handleCleanEmptyRows}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                emptyRowsCount > 0
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                  : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
              }`}
              title="Hapus baris-baris kosong yang tidak memiliki program dan OPD"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Baris Kosong {emptyRowsCount > 0 ? `(${emptyRowsCount})` : ''}</span>
            </button>
          )}

          <button
            onClick={handleAddRow}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Baris</span>
          </button>
          <button
            onClick={() => handleAddMultipleRows(5)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            + 5 Baris
          </button>
          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              title="Impor data dari file JSON cadangan"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Impor JSON</span>
            </button>
          )}
          <button
            onClick={handleExportJson}
            className="px-2.5 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            title="Unduh cadangan data ke file JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Ekspor JSON</span>
          </button>
          {isAdmin && (
            <button
              onClick={requestResetData}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
              title="Kosongkan Tabel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] relative">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header with Hierarchical Structure */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Row 1: Merged Categories */}
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
                <th rowSpan={2} className="p-3 text-center w-12 border-r border-b border-slate-700 sticky left-0 z-30 bg-slate-900">
                  No
                </th>

                {/* MERGED ROW 1: RPJMD */}
                <th colSpan={7} className="p-2.5 text-center bg-blue-900 border-r border-b border-blue-800 text-blue-100">
                  RPJMD
                </th>

                {/* MERGED ROW 2: Rencana Strategis OPD */}
                <th colSpan={6} className="p-2.5 text-center bg-indigo-900 border-r border-b border-indigo-800 text-indigo-100">
                  Rencana Strategis OPD
                </th>

                {/* Standalone Columns */}
                <th rowSpan={2} className="p-3 font-semibold min-w-[220px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Program Prioritas terkait di RPJMN / Indikator Program
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[190px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Sektor Unggulan
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[240px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum
                </th>
                <th rowSpan={2} className="p-3 font-semibold min-w-[220px] text-center border-r border-b border-slate-700 bg-slate-900">
                  Isu Terkini
                </th>
                <th rowSpan={2} className="p-3 font-semibold w-24 text-center border-b border-slate-700 sticky right-0 z-30 bg-slate-900">
                  Aksi
                </th>
              </tr>

              {/* Row 2: Sub-columns */}
              <tr className="bg-slate-800 text-slate-100 text-[11px] font-semibold">
                {/* Under RPJMD */}
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Tujuan RPJMD</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Tujuan</th>
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Sasaran RPJMD</th>
                <th className="p-2.5 min-w-[240px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Sasaran</th>
                <th className="p-2.5 min-w-[220px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Program RPJMD</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-blue-950/90 text-blue-200">Indikator Program</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-blue-950/90 text-blue-200">OPD/Unit Pengampu</th>

                {/* Under Rencana Strategis OPD */}
                <th className="p-2.5 min-w-[130px] text-center border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Irban Pengampu</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Tujuan/ Sasaran dalam Renstra</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Indikator Tujuan/ Sasaran</th>
                <th className="p-2.5 min-w-[200px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Program</th>
                <th className="p-2.5 min-w-[180px] border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Indikator Program</th>
                <th className="p-2.5 min-w-[170px] text-right border-r border-slate-700 bg-indigo-950/90 text-indigo-200">Anggaran Program (Rp)</th>
              </tr>
            </thead>

            {/* Table Body - Direct Inline Editing with Row Merging */}
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-12 text-center text-slate-400 bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-slate-600 font-medium">Tabel Audit Universe masih kosong.</p>
                      <button
                        onClick={handleAddRow}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Baris Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const tSpan = spanInfo.tujuanSpan[index] ?? 1;
                  const showTujuan = tSpan > 0;
                  const tIndices = spanInfo.tujuanIndices[index] || [index];

                  const indTSpan = spanInfo.indikatorTujuanSpan?.[index] ?? 1;
                  const showIndikatorTujuan = indTSpan > 0;
                  const indTIndices = spanInfo.indikatorTujuanIndices?.[index] || [index];

                  const sSpan = spanInfo.sasaranSpan[index] ?? 1;
                  const showSasaran = sSpan > 0;
                  const sIndices = spanInfo.sasaranIndices[index] || [index];

                  const indSpan = spanInfo.indikatorSpan[index] ?? 1;
                  const showIndikator = indSpan > 0;
                  const indIndices = spanInfo.indikatorIndices[index] || [index];

                  const progSpan = spanInfo.programSpan?.[index] ?? 1;
                  const showProgram = progSpan > 0;
                  const progIndices = spanInfo.programIndices?.[index] || [index];

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition group ${
                        showTujuan && index > 0 ? 'border-t-2 border-t-slate-300' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="p-2 text-center font-bold text-slate-600 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">
                        {index + 1}
                      </td>

                      {/* RPJMD: Tujuan RPJMD (Merged if identical) */}
                      {showTujuan && (
                        <td
                          rowSpan={tSpan}
                          className={`p-2 border-r border-slate-200 align-top min-w-[220px] ${
                            tSpan > 1 ? 'bg-blue-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, tSpan * 2)}
                                value={item.tujuanRpjmd || ''}
                                onChange={e => {
                                  if (tSpan > 1) {
                                    handleMergedCellChange('tujuanRpjmd', tIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'tujuanRpjmd', e.target.value);
                                  }
                                }}
                                placeholder="Uraian Tujuan RPJMD..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 resize-y focus:outline-hidden transition leading-relaxed"
                              />
                              {tSpan > 1 && (
                                <div className="text-[10px] text-blue-700 font-medium px-1.5 py-0.5 bg-blue-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-blue-600" />
                                  <span>{tSpan} Program</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah Indikator Tujuan baru di bawah tujuan ini */}
                            <div className="pt-1.5 border-t border-blue-200/50 flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddIndikatorUnderTujuan(
                                    item.tujuanRpjmd || '',
                                    index + tSpan - 1
                                  )
                                }
                                className="text-[10px] text-blue-700 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded self-start flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris Indikator Tujuan baru di bawah tujuan ini (Tujuan tetap digabung)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Indikator Baru</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Indikator Tujuan (Merged if identical within Tujuan) */}
                      {showIndikatorTujuan && (
                        <td
                          rowSpan={indTSpan}
                          className={`p-2 border-r border-slate-200 align-top min-w-[200px] ${
                            indTSpan > 1 ? 'bg-blue-50/20' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, indTSpan * 2)}
                                value={item.indikatorTujuanRpjmd || ''}
                                onChange={e => {
                                  if (indTSpan > 1) {
                                    handleMergedCellChange('indikatorTujuanRpjmd', indTIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'indikatorTujuanRpjmd', e.target.value);
                                  }
                                }}
                                placeholder="Indikator Tujuan..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                              />
                              {indTSpan > 1 && (
                                <div className="text-[10px] text-blue-700 font-medium px-1.5 py-0.5 bg-blue-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-blue-600" />
                                  <span>{indTSpan} Program</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah Sasaran baru di bawah Indikator Tujuan ini */}
                            <div className="pt-1.5 border-t border-slate-200/50 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddSasaranUnderIndikatorTujuan(
                                    item.tujuanRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    index + indTSpan - 1
                                  )
                                }
                                className="text-[10px] text-sky-700 hover:text-sky-800 font-semibold px-2 py-0.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris Sasaran baru di bawah Indikator Tujuan ini (Tujuan &amp; Indikator Tujuan tetap digabung)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Sasaran Baru</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Sasaran RPJMD (Merged if identical) */}
                      {showSasaran && (
                        <td
                          rowSpan={sSpan}
                          className={`p-2 border-r border-slate-200 align-top ${
                            sSpan > 1 ? 'bg-sky-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, sSpan * 2)}
                                value={item.sasaranRpjmd || ''}
                                onChange={e => {
                                  if (sSpan > 1) {
                                    handleMergedCellChange('sasaranRpjmd', sIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'sasaranRpjmd', e.target.value);
                                  }
                                }}
                                placeholder="Uraian Sasaran RPJMD..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 resize-y focus:outline-hidden transition leading-relaxed"
                              />
                              {sSpan > 1 && (
                                <div className="text-[10px] text-blue-700 font-medium px-1.5 py-0.5 bg-blue-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-blue-600" />
                                  <span>{sSpan} Program</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah Indikator Sasaran baru di bawah sasaran ini */}
                            <div className="pt-1.5 border-t border-blue-200/50 flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddIndikatorUnderSasaran(
                                    item.tujuanRpjmd || '',
                                    item.sasaranRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    index + sSpan - 1
                                  )
                                }
                                className="text-[10px] text-indigo-700 hover:text-indigo-800 font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded self-start flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris Indikator Sasaran baru di bawah sasaran ini (Tujuan &amp; Sasaran tetap digabung)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Indikator Baru</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Indikator Sasaran (Merged if identical within Sasaran) */}
                      {showIndikator && (
                        <td
                          rowSpan={indSpan}
                          className={`p-2 border-r border-slate-200 align-top min-w-[240px] ${
                            indSpan > 1 ? 'bg-indigo-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, indSpan * 2)}
                                value={item.indikatorSasaranRpjmd || ''}
                                onChange={e => {
                                  if (indSpan > 1) {
                                    handleMergedCellChange('indikatorSasaranRpjmd', indIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'indikatorSasaranRpjmd', e.target.value);
                                  }
                                }}
                                placeholder="Uraian Indikator Sasaran..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                              />
                              {indSpan > 1 && (
                                <div className="text-[10px] text-indigo-700 font-medium px-1.5 py-0.5 bg-indigo-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-indigo-600" />
                                  <span>{indSpan} Program</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah program baru di bawah indikator sasaran ini */}
                            <div className="pt-1.5 border-t border-slate-200/50 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddProgramUnderIndikator(
                                    item.tujuanRpjmd || '',
                                    item.sasaranRpjmd || '',
                                    item.indikatorSasaranRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    index + indSpan - 1
                                  )
                                }
                                className="text-[10px] text-blue-700 hover:text-blue-800 font-semibold px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris program baru di bawah indikator ini"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Program</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Program RPJMD (Merged if identical within Indikator Sasaran) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-2 border-r border-slate-200 align-top min-w-[220px] ${
                            progSpan > 1 ? 'bg-blue-50/40' : 'bg-blue-50/20'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, progSpan * 2)}
                                value={item.programRpjmd || ''}
                                onChange={e => {
                                  if (progSpan > 1) {
                                    handleMergedCellChange('programRpjmd', progIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'programRpjmd', e.target.value);
                                  }
                                }}
                                placeholder="Nama Program RPJMD..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-blue-300 focus:border-blue-500 rounded-md text-xs font-bold text-blue-950 resize-y focus:outline-hidden transition leading-relaxed"
                              />
                              {progSpan > 1 && (
                                <div className="text-[10px] text-blue-700 font-medium px-1.5 py-0.5 bg-blue-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-blue-600" />
                                  <span>{progSpan} Indikator</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah Indikator Program baru di bawah program ini */}
                            <div className="pt-1.5 border-t border-blue-200/50 flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddIndikatorUnderProgram(
                                    item.tujuanRpjmd || '',
                                    item.sasaranRpjmd || '',
                                    item.indikatorSasaranRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    item.programRpjmd || '',
                                    item.opdPengampu || '',
                                    item.irbanPengampu || '',
                                    index + progSpan - 1
                                  )
                                }
                                className="text-[10px] text-teal-700 hover:text-teal-800 font-semibold px-2 py-0.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded self-start flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris Indikator Program baru untuk program ini (Program & OPD tetap digabung)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Indikator</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RPJMD: Indikator Program (Tiap baris mandiri) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[180px]">
                        <div className="flex items-start gap-1">
                          <textarea
                            rows={2}
                            value={item.indikatorProgramRpjmd || ''}
                            onChange={e => handleCellChange(item.id, 'indikatorProgramRpjmd', e.target.value)}
                            placeholder="Indikator Program..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                          {progSpan > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteIndicatorRow(item)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                              title="Hapus baris indikator ini saja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* RPJMD: OPD/Unit Pengampu (Merged with Program RPJMD: 1 Program = 1 OPD) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[200px] ${
                            progSpan > 1 ? 'bg-slate-50/60' : 'bg-slate-50/40'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-start gap-1">
                            <input
                              type="text"
                              value={item.opdPengampu || ''}
                              onChange={e => {
                                if (progSpan > 1) {
                                  handleMergedCellChange('opdPengampu', progIndices, e.target.value);
                                } else {
                                  handleCellChange(item.id, 'opdPengampu', e.target.value);
                                }
                              }}
                              placeholder="Contoh: Dinas Pendidikan"
                              className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs font-semibold text-slate-900 focus:outline-hidden transition"
                            />
                            {/* Rekomendasi/Saran OPD jika masih kosong dan terdeteksi program spesifik (Khusus Admin) */}
                            {isAdmin && (!item.opdPengampu || item.opdPengampu.trim() === '') && (() => {
                              const detected = detectOPDForProgram(item.programRpjmd || '', rsoContexts);
                              if (!detected) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (progSpan > 1) {
                                      handleMergedCellChange('opdPengampu', progIndices, detected.opd);
                                    } else {
                                      handleCellChange(item.id, 'opdPengampu', detected.opd);
                                    }
                                  }}
                                  className="text-[10px] text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded px-1.5 py-0.5 inline-flex items-center gap-1 transition text-left cursor-pointer self-start mt-0.5 shadow-2xs"
                                  title={`Klik untuk mengisi: ${detected.opd} (sumber: ${detected.source})`}
                                >
                                  <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">Isi: {detected.opd}</span>
                                </button>
                              );
                            })()}
                            {progSpan > 1 && (
                              <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-200/50 rounded inline-block mt-0.5">
                                1 OPD ({progSpan} Indikator)
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* RENSTRA: Irban Pengampu (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 text-center border-r border-slate-200 align-top ${
                            progSpan > 1 ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <select
                            value={item.irbanPengampu || ''}
                            onChange={e => {
                              if (e.target.value === '__ADD_NEW__') {
                                openAddIrban('row', item.id);
                              } else {
                                if (progSpan > 1) {
                                  handleMergedCellChange('irbanPengampu', progIndices, e.target.value);
                                } else {
                                  handleCellChange(item.id, 'irbanPengampu', e.target.value);
                                }
                              }
                            }}
                            className={`w-full p-1.5 rounded-md text-xs transition cursor-pointer focus:outline-hidden ${
                              !item.irbanPengampu || item.irbanPengampu.trim() === ''
                                ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold focus:ring-1 focus:ring-amber-500'
                                : 'bg-indigo-50/60 hover:bg-white focus:bg-white border border-indigo-200 font-semibold text-indigo-900 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          >
                            <option value="">-- Belum Diisi --</option>
                            {allIrbanOptions.map(irban => (
                              <option key={irban} value={irban}>
                                {irban}
                              </option>
                            ))}
                            <option value="__ADD_NEW__" className="text-blue-600 font-bold bg-blue-50">
                              + Tambahkan Irban...
                            </option>
                          </select>
                        </td>
                      )}

                      {/* RENSTRA: Tujuan/ Sasaran dalam Renstra (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[190px] ${
                            progSpan > 1 ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, progSpan * 2)}
                            value={item.tujuanSasaranRenstra || ''}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('tujuanSasaranRenstra', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'tujuanSasaranRenstra', e.target.value);
                              }
                            }}
                            placeholder="Tujuan/Sasaran Renstra..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* RENSTRA: Indikator Tujuan/ Sasaran (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[180px] ${
                            progSpan > 1 ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, progSpan * 2)}
                            value={item.indikatorRenstra || ''}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('indikatorRenstra', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'indikatorRenstra', e.target.value);
                              }
                            }}
                            placeholder="Indikator Sasaran Renstra..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* RENSTRA: Program (Merged with Program RPJMD, dengan fitur Tambah Indikator) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[200px] ${
                            progSpan > 1 ? 'bg-indigo-50/40' : 'bg-indigo-50/20'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5">
                            <div>
                              <textarea
                                rows={Math.max(2, progSpan * 2)}
                                value={item.programRenstra || ''}
                                onChange={e => {
                                  if (progSpan > 1) {
                                    handleMergedCellChange('programRenstra', progIndices, e.target.value);
                                  } else {
                                    handleCellChange(item.id, 'programRenstra', e.target.value);
                                  }
                                }}
                                placeholder="Nama Program Renstra OPD..."
                                className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded-md text-xs font-semibold text-indigo-950 resize-y focus:outline-hidden transition leading-relaxed"
                              />
                              {progSpan > 1 && (
                                <div className="text-[10px] text-indigo-700 font-medium px-1.5 py-0.5 bg-indigo-100/60 rounded inline-flex items-center gap-1 mt-1">
                                  <Layers className="w-3 h-3 text-indigo-600" />
                                  <span>{progSpan} Indikator</span>
                                </div>
                              )}
                            </div>

                            {/* Tombol tambah Indikator di bawah Program Renstra */}
                            <div className="pt-1.5 border-t border-indigo-200/50 flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddIndikatorUnderProgram(
                                    item.tujuanRpjmd || '',
                                    item.sasaranRpjmd || '',
                                    item.indikatorSasaranRpjmd || '',
                                    item.indikatorTujuanRpjmd || '',
                                    item.programRpjmd || '',
                                    item.opdPengampu || '',
                                    item.irbanPengampu || '',
                                    index + progSpan - 1
                                  )
                                }
                                className="text-[10px] text-indigo-700 hover:text-indigo-800 font-semibold px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded self-start flex items-center gap-1 transition shadow-2xs"
                                title="Tambah baris Indikator Program baru untuk Program Renstra ini"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Indikator Renstra</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* RENSTRA: Indikator Program (Tiap baris mandiri) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[180px]">
                        <div className="flex items-start gap-1">
                          <textarea
                            rows={2}
                            value={item.indikatorProgramRenstra || ''}
                            onChange={e => handleCellChange(item.id, 'indikatorProgramRenstra', e.target.value)}
                            placeholder="Indikator Program Renstra..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                          {progSpan > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteIndicatorRow(item)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                              title="Hapus baris indikator ini saja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* RENSTRA: Anggaran Program (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 text-right border-r border-slate-200 align-top min-w-[170px] ${
                            progSpan > 1 ? 'bg-emerald-50/40' : 'bg-emerald-50/20'
                          }`}
                        >
                          <div className="flex flex-col h-full justify-start gap-1">
                            <input
                              type="number"
                              min={0}
                              step={1000000}
                              value={item.anggaran ?? 0}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                if (progSpan > 1) {
                                  handleMergedCellChange('anggaran', progIndices, val);
                                } else {
                                  handleCellChange(item.id, 'anggaran', val);
                                }
                              }}
                              placeholder="0"
                              className="w-full p-2 text-right bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-emerald-300 focus:border-emerald-500 rounded-md text-xs font-bold text-emerald-800 focus:outline-hidden transition"
                            />
                            {progSpan > 1 && (
                              <span className="text-[10px] text-emerald-700 font-medium px-1.5 py-0.5 bg-emerald-100/60 rounded inline-block text-center">
                                Anggaran 1 Program
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Program Prioritas terkait di RPJMN/Indikator Program (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[220px] ${
                            progSpan > 1 ? 'bg-slate-50/40' : ''
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, progSpan * 2)}
                            value={item.prioritasRpjmn || ''}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('prioritasRpjmn', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'prioritasRpjmn', e.target.value);
                              }
                            }}
                            placeholder="Keterkaitan Prioritas Nasional RPJMN..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* Sektor Unggulan (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[190px] ${
                            progSpan > 1 ? 'bg-slate-50/40' : ''
                          }`}
                        >
                          <select
                            value={item.sektorUnggulan || 'Bukan sektor unggulan daerah'}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('sektorUnggulan', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'sektorUnggulan', e.target.value);
                              }
                            }}
                            className={`w-full p-1.5 border rounded-md text-xs font-medium focus:outline-hidden transition ${
                              (item.sektorUnggulan || '').includes('Prioritas') || (item.sektorUnggulan || '').includes('Unggulan')
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                : 'bg-transparent hover:bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="Bukan sektor unggulan daerah">Bukan sektor unggulan daerah</option>
                            <option value="Sektor Unggulan Daerah">Sektor Unggulan Daerah</option>
                            <option value="Sektor Prioritas Daerah">Sektor Prioritas Daerah</option>
                          </select>
                        </td>
                      )}

                      {/* Informasi terkait temuan dan TL, Potensi Fraud, Kasus Hukum (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[240px] ${
                            progSpan > 1 ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, progSpan * 2)}
                            value={item.temuanFraudHukum || ''}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('temuanFraudHukum', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'temuanFraudHukum', e.target.value);
                              }
                            }}
                            placeholder="Catatan temuan BPK/APIP, potensi fraud, perkara hukum..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-rose-300 focus:border-rose-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* Isu Terkini (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className={`p-1.5 border-r border-slate-200 align-top min-w-[220px] ${
                            progSpan > 1 ? 'bg-slate-50/40' : ''
                          }`}
                        >
                          <textarea
                            rows={Math.max(2, progSpan * 2)}
                            value={item.isuTerkini || ''}
                            onChange={e => {
                              if (progSpan > 1) {
                                handleMergedCellChange('isuTerkini', progIndices, e.target.value);
                              } else {
                                handleCellChange(item.id, 'isuTerkini', e.target.value);
                              }
                            }}
                            placeholder="Sorotan publik, pengaduan masyarakat, isu pelayanan..."
                            className="w-full p-2 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-md text-xs resize-y focus:outline-hidden transition leading-relaxed text-slate-800"
                          />
                        </td>
                      )}

                      {/* Aksi (Merged with Program) */}
                      {showProgram && (
                        <td
                          rowSpan={progSpan}
                          className="p-2 text-center sticky right-0 z-10 bg-white border-l border-slate-200 align-top"
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <button
                              onClick={() =>
                                handleAddIndikatorUnderProgram(
                                  item.tujuanRpjmd || '',
                                  item.sasaranRpjmd || '',
                                  item.indikatorSasaranRpjmd || '',
                                  item.indikatorTujuanRpjmd || '',
                                  item.programRpjmd || '',
                                  item.opdPengampu || '',
                                  item.irbanPengampu || '',
                                  index + progSpan - 1
                                )
                              }
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition border border-transparent hover:border-teal-200"
                              title="Tambah Indikator Program baru"
                            >
                              <Plus className="w-4 h-4 text-teal-600" />
                            </button>
                            <button
                              onClick={() => handleDuplicateRow(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition border border-transparent hover:border-indigo-200"
                              title="Duplikasi baris program ini"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (progSpan > 1) {
                                  requestDeleteProgram(progIndices, item.programRpjmd || item.programRenstra || `Program`);
                                } else {
                                  requestDeleteRow(item);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition border border-transparent hover:border-rose-200"
                              title={progSpan > 1 ? `Hapus seluruh program (${progSpan} indikator)` : 'Hapus baris'}
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Total */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={13} className="p-3 text-right text-xs uppercase tracking-wider text-slate-700">
                    Total Anggaran Terpetakan ({data.length} Program):
                  </td>
                  <td className="p-3 text-right font-extrabold text-xs text-emerald-800 bg-emerald-100/60 border-r border-slate-300">
                    Rp {totalAnggaran.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={5} className="p-3 text-slate-500 text-xs"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Bottom Bar: Add Row & Helper */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Baru</span>
            </button>
            <button
              onClick={() => handleAddMultipleRows(5)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium transition"
            >
              + 5 Baris
            </button>
          </div>

          <div className="text-slate-500 text-[11px] italic">
            * Setiap ketikan langsung tersimpan otomatis. Baris dengan Tujuan/Sasaran yang sama digabungkan secara otomatis.
          </div>
        </div>
      </div>

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

      {/* Modal Tambah Irban Baru */}
      {addIrbanModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 scale-in-95 duration-150 transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Tambah Irban Baru
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {addIrbanModal.source === 'row'
                      ? 'Tambahkan Irban baru dan terapkan ke baris ini'
                      : 'Tambahkan nama Inspektur Pembantu ke daftar sistem'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddIrbanModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Irban / Inspektur Pembantu:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Contoh: Irban IV, Irbansus, Irban V, Irban Investigasi..."
                  value={addIrbanModal.nameInput}
                  onChange={e => setAddIrbanModal(prev => ({ ...prev, nameInput: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmAddIrban();
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              {/* Quick suggestions pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-500">Pilihan cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Irban IV', 'Irbansus', 'Irban V', 'Irban Investigasi', 'Irban Wilayah IV'].map(sug => {
                    const isAlreadyIn = allIrbanOptions.includes(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setAddIrbanModal(prev => ({ ...prev, nameInput: sug }));
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          addIrbanModal.nameInput === sug
                            ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                            : isAlreadyIn
                            ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-medium'
                        }`}
                      >
                        {isAlreadyIn ? `✓ ${sug}` : `+ ${sug}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddIrbanModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAddIrban}
                disabled={!addIrbanModal.nameInput.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan & Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Daftar Irban */}
      {isManageIrbanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 scale-in-95 duration-150 transform transition-all max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Kelola Daftar Irban (Inspektur Pembantu)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Atur nama Irban yang tersedia di dropdown penyusunan Audit Universe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageIrbanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add within manage */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
              <label className="block text-xs font-bold text-slate-700">
                Tambah Irban Baru
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Irban IV, Irbansus, Irban V..."
                  value={manageNewIrbanInput}
                  onChange={e => setManageNewIrbanInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddIrbanInManage();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleQuickAddIrbanInManage}
                  disabled={!manageNewIrbanInput.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Irban List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                Daftar Irban Terdaftar ({allIrbanOptions.length})
              </div>
              <div className="space-y-1.5">
                {allIrbanOptions.map(irban => {
                  const usageCount = data.filter(
                    d => d.irbanPengampu === irban || (irban === 'Irbansus' && d.irbanPengampu === 'Irban Khusus')
                  ).length;
                  const isDefault = ['Irban I', 'Irban II', 'Irban III', 'Irban IV', 'Irbansus'].includes(irban);

                  return (
                    <div
                      key={irban}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span className="font-bold text-xs text-slate-800">{irban}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                          {usageCount} baris
                        </span>
                        {isDefault && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            (Bawaan)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteIrban(irban, usageCount)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title={`Hapus ${irban}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetIrbanToDefault}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 transition"
                  title="Kembalikan daftar Irban ke standar awal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Standar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsManageIrbanOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
