import {
  AuditUniverseItem,
  INITIAL_AUDIT_UNIVERSE,
  FaktorRisikoAnggaranItem,
  FaktorRisikoProgramUnggulanItem,
  FaktorRisikoTemuanFraudItem,
  FaktorRisikoIsuTerkiniItem,
  PrioritasProgramRPJMDItem,
  PrioritasUnitKerjaOPDItem,
  UsulanPrioritasPengawasanItem,
  AreaMandatoryItem,
  AreaTidakMasukPKPTItem,
  FormatPKPTItem
} from './ppbrData';

// 1. Ambil daftar program RPJMD dan OPD Pengampu dari Menu 1
export interface Menu1ProgramInfo {
  id: string;
  program: string;
  opdPengampu: string;
  anggaran: number;
}

export const getAuditUniversePrograms = (): Menu1ProgramInfo[] => {
  let auList: AuditUniverseItem[] = INITIAL_AUDIT_UNIVERSE;
  const saved = localStorage.getItem('ppbr_audit_universe');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        auList = parsed;
      }
    } catch (e) {
      console.error('Error parsing ppbr_audit_universe', e);
    }
  }

  const map = new Map<string, Menu1ProgramInfo>();
  auList.forEach((item, idx) => {
    const prog = (item.programRpjmd || '').trim();
    if (!prog) return;
    const opd = (item.opdPengampu || '').trim();
    const ang = Number(item.anggaran) || 0;

    if (!map.has(prog.toLowerCase())) {
      map.set(prog.toLowerCase(), {
        id: item.id || `au-${idx}`,
        program: prog,
        opdPengampu: opd,
        anggaran: ang,
      });
    } else {
      const existing = map.get(prog.toLowerCase())!;
      if (!existing.opdPengampu && opd) {
        existing.opdPengampu = opd;
      }
      if (ang > existing.anggaran) {
        existing.anggaran = ang;
      }
    }
  });

  return Array.from(map.values());
};

// 2. Ambil daftar unik OPD dari Menu 1
export interface Menu1OPDInfo {
  opd: string;
  totalAnggaran: number;
  programCount: number;
  programList: string[];
}

export const getAuditUniverseOPDs = (): Menu1OPDInfo[] => {
  let auList: AuditUniverseItem[] = INITIAL_AUDIT_UNIVERSE;
  const saved = localStorage.getItem('ppbr_audit_universe');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        auList = parsed;
      }
    } catch (e) {
      console.error('Error parsing ppbr_audit_universe for OPDs', e);
    }
  }

  const map = new Map<string, Menu1OPDInfo>();
  auList.forEach((item) => {
    const opd = (item.opdPengampu || '').trim();
    if (!opd) return;
    const prog = (item.programRpjmd || '').trim();
    const ang = Number(item.anggaran) || 0;

    if (!map.has(opd.toLowerCase())) {
      map.set(opd.toLowerCase(), {
        opd,
        totalAnggaran: ang,
        programCount: prog ? 1 : 0,
        programList: prog ? [prog] : [],
      });
    } else {
      const existing = map.get(opd.toLowerCase())!;
      existing.totalAnggaran += ang;
      if (prog && !existing.programList.includes(prog)) {
        existing.programList.push(prog);
        existing.programCount += 1;
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => a.opd.localeCompare(b.opd));
};

// 3. Peta data Menu 4 (Faktor Anggaran)
export const getFaktorAnggaranMap = (): Map<string, { skala: number; anggaran: number; persen: number; namaOPD: string }> => {
  const map = new Map<string, { skala: number; anggaran: number; persen: number; namaOPD: string }>();
  const saved = localStorage.getItem('ppbr_faktor_anggaran');
  if (saved) {
    try {
      const items: (FaktorRisikoAnggaranItem & { program?: string; persen?: number })[] = JSON.parse(saved);
      items.forEach((item) => {
        const prog = (item.namaProgram || item.program || '').trim().toLowerCase();
        if (prog) {
          map.set(prog, {
            skala: Number(item.skala) || 1,
            anggaran: Number(item.anggaran) || 0,
            persen: Number(item.persentase ?? item.persen) || 0,
            namaOPD: item.namaOPD || '',
          });
        }
      });
    } catch (e) {
      console.error('Error parsing ppbr_faktor_anggaran', e);
    }
  }
  return map;
};

// 4. Peta data Menu 5 (Faktor Program Unggulan)
export const getFaktorUnggulanMap = (): Map<string, { skala: number; unggulanDaerah: number; prioritasNasional: number; namaOPD: string }> => {
  const map = new Map<string, { skala: number; unggulanDaerah: number; prioritasNasional: number; namaOPD: string }>();
  const saved = localStorage.getItem('ppbr_faktor_program_unggulan');
  if (saved) {
    try {
      const items: (FaktorRisikoProgramUnggulanItem & { unggulanDaerah?: number; prioritasNasional?: number })[] = JSON.parse(saved);
      items.forEach((item) => {
        const prog = (item.program || '').trim().toLowerCase();
        if (prog) {
          map.set(prog, {
            skala: Number(item.skala) || 1,
            unggulanDaerah: Number(item.terkaitTujuanRpjmd ?? item.unggulanDaerah) || 0,
            prioritasNasional: Number(item.mendukungRpjmn ?? item.prioritasNasional) || 0,
            namaOPD: item.namaOPD || '',
          });
        }
      });
    } catch (e) {
      console.error('Error parsing ppbr_faktor_program_unggulan', e);
    }
  }
  return map;
};

// 5. Peta data Menu 6 (Faktor Temuan & Fraud)
export const getFaktorTemuanMap = (): Map<string, { skala: number; temuanAPIP: number; temuanBPK: number; potensiFraud: number; kasusHukum: number; namaOPD: string }> => {
  const map = new Map<string, { skala: number; temuanAPIP: number; temuanBPK: number; potensiFraud: number; kasusHukum: number; namaOPD: string }>();
  const saved = localStorage.getItem('ppbr_faktor_temuan_fraud');
  if (saved) {
    try {
      const items: (FaktorRisikoTemuanFraudItem & { temuanAPIP?: number; temuanBPK?: number })[] = JSON.parse(saved);
      items.forEach((item) => {
        const prog = (item.program || '').trim().toLowerCase();
        if (prog) {
          map.set(prog, {
            skala: Number(item.skala) || 1,
            temuanAPIP: Number(item.temuanInternal95 ?? item.temuanAPIP) || 0,
            temuanBPK: Number(item.temuanEksternal90 ?? item.temuanBPK) || 0,
            potensiFraud: Number(item.potensiFraud) || 0,
            kasusHukum: Number(item.kasusHukum) || 0,
            namaOPD: item.namaOPD || '',
          });
        }
      });
    } catch (e) {
      console.error('Error parsing ppbr_faktor_temuan_fraud', e);
    }
  }
  return map;
};

// 6. Peta data Menu 7 (Faktor Isu Terkini)
export const getFaktorIsuMap = (): Map<string, { skala: number; sorotanMasyarakat: number; isuNasional: number; layananPublik: number; hajatHidup: number; namaOPD: string }> => {
  const map = new Map<string, { skala: number; sorotanMasyarakat: number; isuNasional: number; layananPublik: number; hajatHidup: number; namaOPD: string }>();
  const saved = localStorage.getItem('ppbr_faktor_isu_terkini');
  if (saved) {
    try {
      const items: FaktorRisikoIsuTerkiniItem[] = JSON.parse(saved);
      items.forEach((item) => {
        const prog = (item.program || '').trim().toLowerCase();
        if (prog) {
          map.set(prog, {
            skala: Number(item.skala) || 1,
            sorotanMasyarakat: item.sorotanMasyarakat || 0,
            isuNasional: item.isuNasional || 0,
            layananPublik: item.layananPublik || 0,
            hajatHidup: item.hajatHidup || 0,
            namaOPD: item.namaOPD || '',
          });
        }
      });
    } catch (e) {
      console.error('Error parsing ppbr_faktor_isu_terkini', e);
    }
  }
  return map;
};

// 7. Opsi Skala Tahun Audit Terakhir (Bobot 10%)
export const PILIHAN_TAHUN_AUDIT = [
  { value: 5, label: '> 3 Tahun lalu / Belum pernah diaudit (Skala 5)', deskripsi: 'Belum diaudit > 3 tahun atau entitas baru' },
  { value: 4, label: '3 Tahun yang lalu (Skala 4)', deskripsi: 'Terakhir diaudit 3 tahun lalu' },
  { value: 3, label: '2 Tahun yang lalu (Skala 3)', deskripsi: 'Terakhir diaudit 2 tahun lalu' },
  { value: 2, label: '1 Tahun yang lalu (Skala 2)', deskripsi: 'Terakhir diaudit tahun sebelumnya' },
  { value: 1, label: 'Tahun berjalan / < 1 Tahun (Skala 1)', deskripsi: 'Baru saja diaudit tahun ini' },
];

// 8. Opsi Skala Pengalaman APIP (Bobot 5%)
export const PILIHAN_PENGALAMAN_APIP = [
  { value: 5, label: 'Belum Pernah / Sangat Minim (Skala 5)', deskripsi: 'APIP belum memiliki pengalaman teknis di bidang ini' },
  { value: 4, label: 'Terbatas (1-2 kali pengawasan) (Skala 4)', deskripsi: 'Pengalaman pengawasan masih sangat baru' },
  { value: 3, label: 'Cukup Berpengalaman (3-4 kali) (Skala 3)', deskripsi: 'Pernah beberapa kali melakukan pengawasan' },
  { value: 2, label: 'Berpengalaman Rutin (Skala 2)', deskripsi: 'APIP rutin mengawasi area ini secara periodik' },
  { value: 1, label: 'Sangat Berpengalaman & Spesialis (Skala 1)', deskripsi: 'Memiliki auditor tersertifikasi & spesialis di bidang ini' },
];

// 9. Perhitungan Skor Menu 8 (Prioritas Program RPJMD)
export const calculateSkorMenu8 = (
  item: {
    skalaRegisterRisiko?: number;
    skalaAnggaran?: number;
    skalaProgramUnggulan?: number;
    skalaTemuanFraud?: number;
    skalaIsuTerkini?: number;
    skalaTahunAudit?: number;
    skalaPengalamanApip?: number;
    permintaanKDH?: string | boolean;
    isKDH?: boolean;
  },
  bobotRegister = 70
) => {
  const isKDH = item.permintaanKDH === 'Ya' || item.permintaanKDH === true || item.isKDH;

  // Jika permintaan KDH diisi, bobotnya LANGSUNG 100% dan skor maksimal 5.00
  if (isKDH) {
    return {
      rataRataManajemen: 5.0,
      skorManajemenLainnya: 5.0,
      skorTotal: 5.0,
      isKDH: true,
      tingkatRisiko: 'Sangat Tinggi (KDH)',
    };
  }

  const sAnggaran = Number(item.skalaAnggaran) || 1;
  const sUnggulan = Number(item.skalaProgramUnggulan) || 1;
  const sTemuan = Number(item.skalaTemuanFraud) || 1;
  const sIsu = Number(item.skalaIsuTerkini) || 1;
  const avgManPokok = (sAnggaran + sUnggulan + sTemuan + sIsu) / 4;

  const sTahunAudit = Number(item.skalaTahunAudit) || 3;
  const sPengalamanApip = Number(item.skalaPengalamanApip) || 3;

  // Manajemen Lainnya: Tahun Audit (10%), Pengalaman APIP (5%)
  const skorManLainnya = (sTahunAudit * 10 + sPengalamanApip * 5) / 15;

  // Bobot keseluruhan:
  // Register Risiko = 70%
  // 4 Faktor Pokok Manajemen = 15%
  // x-Thn Audit Terakhir = 10%
  // Pengalaman APIP = 5%
  // Total = 70% + 15% + 10% + 5% = 100%
  const sReg = Number(item.skalaRegisterRisiko) || 3.5;
  const bReg = bobotRegister / 100;
  const bPokok = 0.15;
  const bThn = 0.10;
  const bApip = 0.05;

  const total = (sReg * bReg) + (avgManPokok * bPokok) + (sTahunAudit * bThn) + (sPengalamanApip * bApip);

  let tingkat = 'Rendah';
  if (total >= 3.75) tingkat = 'Sangat Tinggi';
  else if (total >= 3.0) tingkat = 'Tinggi';
  else if (total >= 2.25) tingkat = 'Sedang';

  return {
    rataRataManajemen: parseFloat(avgManPokok.toFixed(2)),
    skorManajemenLainnya: parseFloat(skorManLainnya.toFixed(2)),
    skorTotal: parseFloat(total.toFixed(2)),
    isKDH: false,
    tingkatRisiko: tingkat,
  };
};

// 10. Pengurutan & Penetapan Ranking Menu 8
// KDH langsung ranking paling atas (#1, #2, ...) baru kemudian skor total tertinggi
export const sortAndRankMenu8 = (items: PrioritasProgramRPJMDItem[]): PrioritasProgramRPJMDItem[] => {
  return [...items]
    .sort((a, b) => {
      const isKDHa = a.permintaanKDH === 'Ya' || Boolean(a.isKDH);
      const isKDHb = b.permintaanKDH === 'Ya' || Boolean(b.isKDH);
      if (isKDHa && !isKDHb) return -1;
      if (!isKDHa && isKDHb) return 1;
      return (b.skorTotal || 0) - (a.skorTotal || 0);
    })
    .map((item, idx) => ({
      ...item,
      ranking: idx + 1,
      no: idx + 1,
    }));
};

// 11. Perhitungan Skor Menu 9 (Prioritas Unit Kerja / OPD)
export const calculateSkorMenu9 = (
  item: {
    kematanganMRLevel?: number;
    kematanganMRBobot?: number;
    skalaRegisterRisiko?: number;
    skalaAnggaran?: number;
    skalaProgramUnggulan?: number;
    skalaTemuanFraud?: number;
    skalaIsuTerkini?: number;
    skalaTahunAudit?: number;
    skalaPengalamanApip?: number;
    permintaanKDH?: string;
    isKDH?: boolean;
  }
) => {
  const isKDH = item.permintaanKDH === 'Ya' || Boolean(item.isKDH);

  if (isKDH) {
    return {
      skorTertimbangRegister: 5.0,
      rataRataManajemen: 5.0,
      skorManajemenLainnya: 5.0,
      skorTotal: 5.0,
      isKDH: true,
      tingkatRisiko: 'Sangat Tinggi (KDH)',
    };
  }

  // Bobot Kematangan MR (Tingkat Kematangan: Level 1=0%, Level 2=40%, Level 3=70%, Level 4=85%, Level 5=100%)
  const getBobotMR = (lvl: number) => {
    switch (lvl) {
      case 1: return 40;
      case 2: return 55;
      case 3: return 70;
      case 4: return 85;
      case 5: return 100;
      default: return 70;
    }
  };

  const lvl = Number(item.kematanganMRLevel) || 3;
  const bobotMR = item.kematanganMRBobot || getBobotMR(lvl);
  const skalaReg = Number(item.skalaRegisterRisiko) || 3.5;
  const skorTertimbangReg = (skalaReg * bobotMR) / 100;

  // 4 Faktor Pokok OPD
  const sAnggaran = Number(item.skalaAnggaran) || 1;
  const sUnggulan = Number(item.skalaProgramUnggulan) || 1;
  const sTemuan = Number(item.skalaTemuanFraud) || 1;
  const sIsu = Number(item.skalaIsuTerkini) || 1;
  const avgManPokok = (sAnggaran + sUnggulan + sTemuan + sIsu) / 4;

  const sTahunAudit = Number(item.skalaTahunAudit) || 3;
  const sPengalamanApip = Number(item.skalaPengalamanApip) || 3;
  const skorManLainnya = (sTahunAudit * 10 + sPengalamanApip * 5) / 15;

  // Total Skor OPD:
  // Register Risiko Tertimbang: 70%
  // 4 Faktor Pokok Manajemen: 15%
  // x-Thn Audit Terakhir: 10%
  // Pengalaman APIP: 5%
  const total = (skorTertimbangReg * 0.70) + (avgManPokok * 0.15) + (sTahunAudit * 0.10) + (sPengalamanApip * 0.05);

  let tingkat = 'Rendah';
  if (total >= 3.75) tingkat = 'Sangat Tinggi';
  else if (total >= 3.0) tingkat = 'Tinggi';
  else if (total >= 2.25) tingkat = 'Sedang';

  return {
    skorTertimbangRegister: parseFloat(skorTertimbangReg.toFixed(2)),
    rataRataManajemen: parseFloat(avgManPokok.toFixed(2)),
    skorManajemenLainnya: parseFloat(skorManLainnya.toFixed(2)),
    skorTotal: parseFloat(total.toFixed(2)),
    isKDH: false,
    tingkatRisiko: tingkat,
  };
};

// 12. Pengurutan & Penetapan Ranking Menu 9
export const sortAndRankMenu9 = (items: PrioritasUnitKerjaOPDItem[]): PrioritasUnitKerjaOPDItem[] => {
  return [...items]
    .sort((a, b) => {
      const isKDHa = a.permintaanKDH === 'Ya' || Boolean(a.isKDH);
      const isKDHb = b.permintaanKDH === 'Ya' || Boolean(b.isKDH);
      if (isKDHa && !isKDHb) return -1;
      if (!isKDHa && isKDHb) return 1;
      return (b.skorTotal || 0) - (a.skorTotal || 0);
    })
    .map((item, idx) => ({
      ...item,
      ranking: idx + 1,
      no: idx + 1,
    }));
};

// 13. Ambil data Menu 11 (Usulan Prioritas Pengawasan PBBR)
export const getMenu11Items = (): UsulanPrioritasPengawasanItem[] => {
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

// 14. Ambil data Menu 12 (Area Pengawasan Mandatory)
export const getMenu12Items = (): AreaMandatoryItem[] => {
  const saved = localStorage.getItem('ppbr_area_mandatory');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error reading ppbr_area_mandatory', e);
    }
  }
  return [];
};

// 15. Ambil data Menu 13 (Area Tidak Masuk PKPT)
export const getMenu13Items = (): AreaTidakMasukPKPTItem[] => {
  const saved = localStorage.getItem('ppbr_tidak_masuk_pkpt');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error reading ppbr_tidak_masuk_pkpt', e);
    }
  }
  return [];
};

// Helper: Pembersih string untuk pencocokan toleran
export const cleanTextForComparison = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// 16. Pemeriksaan apakah suatu area pengawasan tercatat di Menu 13 (Tidak Masuk PKPT)
export interface ExclusionCheckResult {
  isExcluded: boolean;
  matchedReason?: string;
  matchedItem?: AreaTidakMasukPKPTItem;
}

export const checkIsExcludedByMenu13 = (
  targetArea: string,
  targetOpd: string = '',
  menu13List: AreaTidakMasukPKPTItem[]
): ExclusionCheckResult => {
  if (!targetArea || !menu13List || menu13List.length === 0) {
    return { isExcluded: false };
  }

  const cleanArea = cleanTextForComparison(targetArea);
  const cleanOpd = cleanTextForComparison(targetOpd);

  for (const item13 of menu13List) {
    const area13 = item13.areaPengawasan || item13.namaOpdProgram || '';
    const cleanArea13 = cleanTextForComparison(area13);
    const cleanOpd13 = cleanTextForComparison(item13.opdPengampu || '');

    if (!cleanArea13) continue;

    // A. Kecocokan persis string yang dibersihkan
    if (cleanArea === cleanArea13) {
      return {
        isExcluded: true,
        matchedReason: item13.alasanTidakMasuk || 'Tercatat di Menu 13 sebagai area yang tidak masuk PKPT',
        matchedItem: item13
      };
    }

    // B. Substring match jika panjang string memadai (>= 6 karakter)
    if (cleanArea.length >= 6 && cleanArea13.length >= 6) {
      if (cleanArea.includes(cleanArea13) || cleanArea13.includes(cleanArea)) {
        return {
          isExcluded: true,
          matchedReason: item13.alasanTidakMasuk || 'Tercatat di Menu 13 sebagai area yang tidak masuk PKPT',
          matchedItem: item13
        };
      }
    }

    // C. Jika OPD sama persis atau saling mengandung, dan ada irisan kata penting (>= 2 kata)
    if (cleanOpd && cleanOpd13 && (cleanOpd === cleanOpd13 || cleanOpd.includes(cleanOpd13) || cleanOpd13.includes(cleanOpd))) {
      const words1 = cleanArea.split(' ').filter(w => w.length > 3);
      const words2 = cleanArea13.split(' ').filter(w => w.length > 3);
      const common = words1.filter(w => words2.includes(w));
      if (common.length >= 2 || (words1.length === 1 && common.length === 1)) {
        return {
          isExcluded: true,
          matchedReason: item13.alasanTidakMasuk || 'Tercatat di Menu 13 sebagai area yang tidak masuk PKPT',
          matchedItem: item13
        };
      }
    }
  }

  return { isExcluded: false };
};

// Estimasi OPD untuk item regulasi / mandatory jika belum diatur
export const getMandatoryDefaultOPD = (areaName: string): string => {
  const lower = (areaName || '').toLowerCase();
  if (lower.includes('lkpd') || lower.includes('keuangan')) return 'BPKAD / Seluruh Perangkat Daerah';
  if (lower.includes('lppd') || lower.includes('penyelenggaraan pemerintahan')) return 'Bagian Tata Pemerintahan Setda / Seluruh OPD';
  if (lower.includes('rka') || lower.includes('apbd')) return 'TAPD, Bappeda & BPKAD';
  if (lower.includes('spip')) return 'Seluruh Perangkat Daerah (OPD)';
  if (lower.includes('pmrb') || lower.includes('reformasi birokrasi')) return 'Bagian Organisasi Setda / Seluruh OPD';
  if (lower.includes('tlhp') || lower.includes('tindak lanjut')) return 'Seluruh Perangkat Daerah (Entitas Terperiksa)';
  if (lower.includes('penyerapan') || lower.includes('pbj') || lower.includes('pengadaan')) return 'UKPBJ / Seluruh Pengguna Anggaran';
  if (lower.includes('dak') || lower.includes('alokasi khusus')) return 'OPD Pengelola DAK (Dinkes, Disdik, DPUPR)';
  if (lower.includes('desa') || lower.includes('dana desa')) return 'Dinas Pemberdayaan Masyarakat dan Desa (DPMD)';
  if (lower.includes('bos') || lower.includes('sekolah')) return 'Dinas Pendidikan & Satuan Pendidikan';
  return 'Pemerintah Daerah / OPD Terkait';
};

// 17. Penjadwalan & Kompilasi Akhir PKPT (Menu 14)
export interface GeneratedPKPTResult {
  items: FormatPKPTItem[];
  excludedItems: {
    source: 'Menu 11' | 'Menu 12';
    areaPengawasan: string;
    opdPengampu: string;
    alasan: string;
  }[];
  totalMenu11: number;
  totalMenu12: number;
  totalExcluded: number;
}

export const generatePKPTFromSources = (
  m11List: UsulanPrioritasPengawasanItem[],
  m12List: AreaMandatoryItem[],
  m13List: AreaTidakMasukPKPTItem[],
  existingCustomMap: Map<string, { jadwal?: string; auditor?: number; mandays?: number; anggaran?: number }>
): GeneratedPKPTResult => {
  const JADWAL_LIST = [
    'Januari - Maret (TW I)',
    'April - Juni (TW II)',
    'Juli - September (TW III)',
    'Oktober - Desember (TW IV)'
  ];

  const excludedItems: {
    source: 'Menu 11' | 'Menu 12';
    areaPengawasan: string;
    opdPengampu: string;
    alasan: string;
  }[] = [];

  const validItems: FormatPKPTItem[] = [];

  // BAGIAN A: Ditarik dari Usulan Prioritas PBBR (Menu 11)
  m11List.forEach((m11, idx) => {
    const areaName = m11.areaPengawasan || m11.namaAreaPengawasan || '';
    const opd = m11.opdPengampu || '-';

    const check = checkIsExcludedByMenu13(areaName, opd, m13List);
    if (check.isExcluded) {
      excludedItems.push({
        source: 'Menu 11',
        areaPengawasan: areaName,
        opdPengampu: opd,
        alasan: check.matchedReason || 'Tercatat di Menu 13'
      });
      return; // Skip: tidak dimasukkan ke Menu 14
    }

    const namaKegiatan = `${m11.jenisPengawasan || 'Audit Kinerja Berbasis Risiko'} atas ${areaName}`;
    const customKey = (`A. KEGIATAN PENGAWASAN PRIORITAS RISIKO (PBBR)::` + areaName).toLowerCase();
    const fallbackKey = (opd + '::' + namaKegiatan).toLowerCase();
    const existing = existingCustomMap.get(customKey) || existingCustomMap.get(fallbackKey);

    const defaultJadwal = existing?.jadwal || JADWAL_LIST[idx % JADWAL_LIST.length];
    const defaultAuditor = existing?.auditor || (Number(m11.skorRisiko) >= 4.5 ? 5 : Number(m11.skorRisiko) >= 3.5 ? 4 : 3);
    const defaultMandays = existing?.mandays || Number(m11.alokasiMandays) || 15;
    const defaultAnggaran = existing?.anggaran || defaultMandays * 2500000;

    validItems.push({
      id: `pkpt-m11-${m11.id || idx}`,
      no: 0, // Akan dinomori ulang berurutan
      kategoriKegiatan: 'A. KEGIATAN PENGAWASAN PRIORITAS RISIKO (PBBR)',
      namaKegiatan,
      sasaranOPD: opd,
      jadwalBulan: defaultJadwal,
      timJumlahAuditor: defaultAuditor,
      alokasiMandays: defaultMandays,
      anggaranBiaya: defaultAnggaran
    });
  });

  // BAGIAN B: Ditarik dari Pengawasan Mandatory Regulasi (Menu 12)
  m12List.forEach((m12, idx) => {
    const areaName = m12.areaPengawasan || m12.namaAreaPengawasan || '';
    const opd = (m12 as any).opdPengampu || (m12 as any).sasaranOPD || getMandatoryDefaultOPD(areaName);

    const check = checkIsExcludedByMenu13(areaName, opd, m13List);
    if (check.isExcluded) {
      excludedItems.push({
        source: 'Menu 12',
        areaPengawasan: areaName,
        opdPengampu: opd,
        alasan: check.matchedReason || 'Tercatat di Menu 13'
      });
      return; // Skip: tidak dimasukkan ke Menu 14
    }

    const jenis = m12.jenisPengawasan || 'Reviu';
    // Cegah duplikasi penamaan seperti "Reviu Reviu Laporan Keuangan"
    const namaKegiatan = areaName.toLowerCase().startsWith(jenis.toLowerCase())
      ? areaName
      : `${jenis} atas ${areaName}`;

    const customKey = (`B. KEGIATAN PENGAWASAN MANDATORY (REGULASI)::` + areaName).toLowerCase();
    const fallbackKey = (opd + '::' + namaKegiatan).toLowerCase();
    const existing = existingCustomMap.get(customKey) || existingCustomMap.get(fallbackKey);

    // Penjadwalan default cerdas sesuai regulasi umum
    let smartJadwal = JADWAL_LIST[idx % JADWAL_LIST.length];
    const lowerArea = areaName.toLowerCase();
    if (lowerArea.includes('lkpd') || lowerArea.includes('lppd')) {
      smartJadwal = 'Januari - Maret (TW I)';
    } else if (lowerArea.includes('rka') || lowerArea.includes('apbd')) {
      smartJadwal = 'Juli - September (TW III)';
    } else if (lowerArea.includes('spip') || lowerArea.includes('dak')) {
      smartJadwal = 'April - Juni (TW II)';
    } else if (lowerArea.includes('tlhp')) {
      smartJadwal = 'Oktober - Desember (TW IV)';
    } else if (lowerArea.includes('penyerapan') || lowerArea.includes('pbj')) {
      smartJadwal = 'Sepanjang Tahun (Insidentil)';
    }

    const defaultJadwal = existing?.jadwal || smartJadwal;
    const defaultAuditor = existing?.auditor || 4;
    const defaultMandays = existing?.mandays || Number(m12.alokasiMandays) || 20;
    const defaultAnggaran = existing?.anggaran || defaultMandays * 2500000;

    validItems.push({
      id: `pkpt-m12-${m12.id || idx}`,
      no: 0, // Akan dinomori ulang berurutan
      kategoriKegiatan: 'B. KEGIATAN PENGAWASAN MANDATORY (REGULASI)',
      namaKegiatan,
      sasaranOPD: opd,
      jadwalBulan: defaultJadwal,
      timJumlahAuditor: defaultAuditor,
      alokasiMandays: defaultMandays,
      anggaranBiaya: defaultAnggaran
    });
  });

  // Penomoran urut 1, 2, 3...
  const finalItems = validItems.map((item, idx) => ({
    ...item,
    no: idx + 1
  }));

  return {
    items: finalItems,
    excludedItems,
    totalMenu11: m11List.length,
    totalMenu12: m12List.length,
    totalExcluded: excludedItems.length
  };
};
