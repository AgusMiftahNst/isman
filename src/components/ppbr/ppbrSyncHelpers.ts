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
