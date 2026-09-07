export interface AuditUniverseItem {
  id: string;
  no: number;
  tujuanRpjmd: string;
  indikatorTujuanRpjmd: string;
  sasaranRpjmd: string;
  indikatorSasaranRpjmd: string;
  programRpjmd: string;
  indikatorProgramRpjmd: string;
  opdPengampu: string;
  irbanPengampu: string;
  tujuanSasaranRenstra: string;
  indikatorRenstra: string;
  programRenstra: string;
  indikatorProgramRenstra: string;
  anggaran: number;
  prioritasRpjmn: string;
  sektorUnggulan: string;
  temuanFraudHukum: string;
  isuTerkini: string;
}

export interface EvaluasiRegisterRisikoItem {
  id: string;
  no: number;
  sasaranStrategis: string;
  indikatorKinerja: string;
  // Sebelum Evaluasi
  sebelumRisikoUraian: string;
  sebelumRisikoKode: string;
  sebelumPemilik: string;
  sebelumSebabUraian: string;
  sebelumSebabSumber: 'Internal' | 'Eksternal' | 'Internal dan Eksternal';
  sebelumControl: 'C' | 'UC';
  sebelumDampakUraian: string;
  sebelumDampakPihak: string;
  sebelumSkalaDampak: number;
  sebelumSkalaKemungkinan: number;
  sebelumNilaiRisiko: number;
  sebelumRencanaPengendalian: string;
  // Setelah Evaluasi
  setelahRisikoUraian: string;
  setelahRisikoKode: string;
  setelahPemilik: string;
  setelahSebabUraian: string;
  setelahSebabSumber: 'Internal' | 'Eksternal' | 'Internal dan Eksternal';
  setelahControl: 'C' | 'UC';
  setelahDampakUraian: string;
  setelahDampakPihak: string;
  setelahSkalaDampak: number;
  setelahSkalaKemungkinan: number;
  setelahNilaiRisiko: number;
  setelahRencanaPengendalian: string;
}

export interface KematanganMRItem {
  id: string;
  no: number;
  unitKerja: string;
  kematanganMR: number; // 1, 2, 3, 4, 5
  strategiPengawasan: string;
  bobotRegisterRisiko: number; // 0, 40, 70, 85, 100
  keterangan: string;
}

export interface FaktorRisikoAnggaranItem {
  id: string;
  no: number;
  namaProgram: string;
  namaOPD: string;
  anggaran: number;
  persentase: number;
  skala: number;
}

export interface FaktorRisikoProgramUnggulanItem {
  id: string;
  no: number;
  program: string;
  namaOPD: string;
  terkaitTujuanRpjmd: 0 | 1;
  mendukungRpjmn: 0 | 1;
  sektorUnggulan: 0 | 1;
  nilai: number;
  skala: number;
}

export interface FaktorRisikoTemuanFraudItem {
  id: string;
  no: number;
  program: string;
  namaOPD: string;
  temuanInternal95: 0 | 1;
  temuanEksternal90: 0 | 1;
  potensiFraud: 0 | 1;
  kasusHukum: 0 | 1;
  nilai: number;
  skala: number;
}

export interface FaktorRisikoIsuTerkiniItem {
  id: string;
  no: number;
  program: string;
  namaOPD: string;
  sorotanMasyarakat: 0 | 1;
  isuNasional: 0 | 1;
  layananPublik: 0 | 1;
  hajatHidup: 0 | 1;
  nilai: number;
  skala: number;
}

export interface PrioritasProgramRPJMDItem {
  id: string;
  no: number;
  areaPengawasan?: string;
  program?: string;
  opdPengampu?: string;
  uraianSasaran?: string;
  opdKoordinator?: string;
  opdPendukung?: string;
  levelMR?: number;
  bobotInherent?: number;
  nilaiRisikoInherent?: number;
  skalaInherent?: number;
  skalaRegisterRisiko?: number;
  anggaran?: number;
  persenAnggaran?: number;
  skalaAnggaran?: number;
  nilaiUnggulan?: number;
  skalaUnggulan?: number;
  skalaProgramUnggulan?: number;
  nilaiTemuan?: number;
  skalaTemuan?: number;
  skalaTemuanFraud?: number;
  nilaiIsuTerkini?: number;
  skalaIsuTerkini?: number;
  tahunAuditTerakhir?: number;
  skalaTahunAudit?: number;
  pengalamanApip?: string;
  skalaPengalamanApip?: number;
  permintaanKDH?: string;
  skalaPermintaanKDH?: number;
  isKDH?: boolean;
  bobotFaktorRisiko?: number;
  nilaiFaktorRisiko?: number;
  rataRataManajemen?: number;
  skorManajemenLainnya?: number;
  totalRisiko?: number;
  skorTotal?: number;
  ranking?: number;
  tingkatRisiko?: string;
  frekuensiPengawasan?: string;
  tahunPengawasan?: {
    y0: boolean;
    y1: boolean;
    y2: boolean;
    y3: boolean;
    y4: boolean;
  };
}

export interface PrioritasUnitKerjaOPDItem {
  id: string;
  no: number;
  unitKerja: string;
  opd?: string;
  levelMR?: number;
  kematanganMRLevel?: number;
  kematanganMRBobot?: number;
  skalaRegisterRisiko?: number;
  skorTertimbangRegister?: number;
  bobotInherent?: number;
  nilaiRisikoInherent?: number;
  skalaInherent?: number;
  anggaran?: number;
  persenAnggaran?: number;
  skalaAnggaran?: number;
  nilaiSignifikansi?: number;
  skalaSignifikansi?: number;
  skalaProgramUnggulan?: number;
  nilaiTemuan?: number;
  skalaTemuan?: number;
  skalaTemuanFraud?: number;
  nilaiIsuTerkini?: number;
  skalaIsuTerkini?: number;
  tahunAuditTerakhir?: number;
  skalaTahunAudit?: number;
  pengalamanApip?: string;
  skalaPengalamanApip?: number;
  permintaanKDH?: string;
  skalaPermintaanKDH?: number;
  isKDH?: boolean;
  bobotFaktorRisiko?: number;
  nilaiFaktorRisiko?: number;
  rataRataManajemen?: number;
  skorManajemenLainnya?: number;
  totalRisiko?: number;
  skorTotal?: number;
  ranking?: number;
  tingkatRisiko?: string;
  frekuensiPengawasan?: string;
  tahunPengawasan?: {
    y0: boolean;
    y1: boolean;
    y2: boolean;
    y3: boolean;
    y4: boolean;
  };
}

export interface PrioritasDesaPuskesmasItem {
  id: string;
  no: number;
  areaPengawasan?: string;
  namaEntitas?: string;
  kategori?: 'DESA' | 'PUSKESMAS' | 'SEKOLAH' | 'UPTD' | string;
  tipe?: 'Desa' | 'Puskesmas' | 'Sekolah' | 'UPTD' | string;
  frKeuangan?: [number, number, number, number, number, number];
  frNonKeuangan?: [number, number, number, number, number, number];
  skalaAnggaran?: number;
  skalaTemuan?: number;
  skalaKompetensiSDM?: number;
  skalaGeografis?: number;
  permintaanKDH?: string;
  nilaiKDH?: number;
  totalRisiko?: number;
  skorTotal?: number;
  ranking?: number;
  tingkatRisiko?: 'Tinggi' | 'Sedang' | 'Rendah' | string;
  frekuensiPengawasan?: string;
  tahunPengawasan?: {
    y0: boolean;
    y1: boolean;
    y2: boolean;
    y3: boolean;
    y4: boolean;
  };
}

export interface UsulanPrioritasPengawasanItem {
  id: string;
  no: number;
  namaAreaPengawasan?: string;
  areaPengawasan?: string;
  opdPengampu?: string;
  skorRisiko?: number;
  totalRisiko?: number;
  kategoriPrioritas?: string;
  alokasiMandays?: number;
  jenisPengawasan: string;
  kebutuhanSDM?: string;
}

export interface AreaPengawasanMandatoryItem {
  id: string;
  no: number;
  namaAreaPengawasan?: string;
  areaPengawasan?: string;
  alasanWajib?: string;
  dasarHukum?: string;
  jenisPengawasan?: string;
  alokasiMandays?: number;
  keterangan: string;
}

export type AreaMandatoryItem = AreaPengawasanMandatoryItem;

export interface AreaTidakMasukPKPTItem {
  id: string;
  no: number;
  namaOpdProgram?: string;
  areaPengawasan?: string;
  opdPengampu?: string;
  skorRisiko?: number;
  kategori?: string;
  kategoriRisiko?: string;
  alasanTidakMasuk?: string;
  pertimbangan?: string;
  alternatifMitigasi?: string;
  keterangan?: string;
}

export interface FormatPKPTItem {
  id: string;
  no: number;
  areaPengawasan?: string;
  namaKegiatan?: string;
  sasaranOPD?: string;
  kategoriKegiatan?: string;
  objekPengawasan?: string;
  sasaranTujuan?: string;
  metodePengawasan?: string;
  timPenyusun?: string;
  timJumlahAuditor?: number;
  alokasiMandays?: number;
  anggaranBiaya?: number;
  waktuPelaksanaan?: string;
  jadwalBulan?: string;
  estimasiHari?: number;
  jenisPengawasan?: string;
  tujuanSasaran?: string;
  ruangLingkup?: string;
  jadwalRMP?: string;
  jadwalRPL?: string;
  hpPJ?: number;
  hpWKPJ?: number;
  hpKT?: number;
  hpAT?: number;
  hpJumlah?: number;
  anggaran?: number;
  jumlahLaporan?: string;
  saranaPrasarana?: string;
  tingkatRisiko?: string;
  keterangan?: string;
}

// Initial Data for Audit Universe (Filled Tujuan, Sasaran, Indikator Sasaran & Program RPJMD; other columns empty for manual input)
export const INITIAL_AUDIT_UNIVERSE: AuditUniverseItem[] = [
  // TUJUAN 1: Kualitas SDM
  // Sasaran 1.1: Pendidikan
  {
    id: 'au-1',
    no: 1,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akses, Pemerataan dan Kualitas Pelayanan Pendidikan',
    indikatorSasaranRpjmd: 'Harapan Lama Sekolah (HLS), Rata-rata Lama Sekolah (RLS), Angka Partisipasi Murni (APM)',
    programRpjmd: 'Program Pengelolaan Pendidikan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-2',
    no: 2,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akses, Pemerataan dan Kualitas Pelayanan Pendidikan',
    indikatorSasaranRpjmd: 'Harapan Lama Sekolah (HLS), Rata-rata Lama Sekolah (RLS), Angka Partisipasi Murni (APM)',
    programRpjmd: 'Program Pengembangan Kurikulum',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-3',
    no: 3,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akses, Pemerataan dan Kualitas Pelayanan Pendidikan',
    indikatorSasaranRpjmd: 'Harapan Lama Sekolah (HLS), Rata-rata Lama Sekolah (RLS), Angka Partisipasi Murni (APM)',
    programRpjmd: 'Program Pendidik dan Tenaga Kependidikan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-4',
    no: 4,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akses, Pemerataan dan Kualitas Pelayanan Pendidikan',
    indikatorSasaranRpjmd: 'Harapan Lama Sekolah (HLS), Rata-rata Lama Sekolah (RLS), Angka Partisipasi Murni (APM)',
    programRpjmd: 'Program Pengendalian Perizinan Pendidikan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-5',
    no: 5,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akses, Pemerataan dan Kualitas Pelayanan Pendidikan',
    indikatorSasaranRpjmd: 'Harapan Lama Sekolah (HLS), Rata-rata Lama Sekolah (RLS), Angka Partisipasi Murni (APM)',
    programRpjmd: 'Program Pembinaan Pendidikan Anak Usia Dini dan Pendidikan Nonformal',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 1.2: Kesehatan
  {
    id: 'au-6',
    no: 6,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Derajat Kesehatan Masyarakat dan Status Gizi',
    indikatorSasaranRpjmd: 'Usia Harapan Hidup (UHH), Prevalensi Stunting, Angka Kematian Ibu (AKI) & Bayi (AKB)',
    programRpjmd: 'Program Pemenuhan Upaya Kesehatan Perorangan dan Upaya Kesehatan Masyarakat',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-7',
    no: 7,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Derajat Kesehatan Masyarakat dan Status Gizi',
    indikatorSasaranRpjmd: 'Usia Harapan Hidup (UHH), Prevalensi Stunting, Angka Kematian Ibu (AKI) & Bayi (AKB)',
    programRpjmd: 'Program Peningkatan Kapasitas Sumber Daya Manusia Kesehatan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-8',
    no: 8,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Derajat Kesehatan Masyarakat dan Status Gizi',
    indikatorSasaranRpjmd: 'Usia Harapan Hidup (UHH), Prevalensi Stunting, Angka Kematian Ibu (AKI) & Bayi (AKB)',
    programRpjmd: 'Program Sediaan Farmasi, Alat Kesehatan dan Makanan Minuman',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-9',
    no: 9,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Derajat Kesehatan Masyarakat dan Status Gizi',
    indikatorSasaranRpjmd: 'Usia Harapan Hidup (UHH), Prevalensi Stunting, Angka Kematian Ibu (AKI) & Bayi (AKB)',
    programRpjmd: 'Program Pemberdayaan Masyarakat Bidang Kesehatan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 1.3: Ketenagakerjaan
  {
    id: 'au-10',
    no: 10,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kompetensi, Penyerapan dan Perlindungan Tenaga Kerja',
    indikatorSasaranRpjmd: 'Tingkat Pengangguran Terbuka (TPT), Persentase Tenaga Kerja Bersertifikat',
    programRpjmd: 'Program Pelatihan Kerja dan Produktivitas Tenaga Kerja',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-11',
    no: 11,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kompetensi, Penyerapan dan Perlindungan Tenaga Kerja',
    indikatorSasaranRpjmd: 'Tingkat Pengangguran Terbuka (TPT), Persentase Tenaga Kerja Bersertifikat',
    programRpjmd: 'Program Penempatan Tenaga Kerja dan Perluasan Kesempatan Kerja',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-12',
    no: 12,
    tujuanRpjmd: 'Meningkatkan Kualitas Sumber Daya Manusia yang Berdaya Saing dan Berakhlak Mulia',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kompetensi, Penyerapan dan Perlindungan Tenaga Kerja',
    indikatorSasaranRpjmd: 'Tingkat Pengangguran Terbuka (TPT), Persentase Tenaga Kerja Bersertifikat',
    programRpjmd: 'Program Hubungan Industrial dan Jaminan Sosial Tenaga Kerja',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // TUJUAN 2: Ekonomi & Pangan
  // Sasaran 2.1: Pertanian & Perikanan
  {
    id: 'au-13',
    no: 13,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian, Peternakan dan Perikanan',
    indikatorSasaranRpjmd: 'Nilai Tukar Petani (NTP), Nilai Tukar Nelayan (NTN), Produksi Komoditas Unggulan Daerah',
    programRpjmd: 'Program Penyediaan dan Pengembangan Sarana Prasarana Pertanian',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-14',
    no: 14,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian, Peternakan dan Perikanan',
    indikatorSasaranRpjmd: 'Nilai Tukar Petani (NTP), Nilai Tukar Nelayan (NTN), Produksi Komoditas Unggulan Daerah',
    programRpjmd: 'Program Pengendalian Kesehatan Hewan dan Kesehatan Masyarakat Veteriner',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-15',
    no: 15,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian, Peternakan dan Perikanan',
    indikatorSasaranRpjmd: 'Nilai Tukar Petani (NTP), Nilai Tukar Nelayan (NTN), Produksi Komoditas Unggulan Daerah',
    programRpjmd: 'Program Pengendalian dan Penanggulangan Bencana Pertanian',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-16',
    no: 16,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian, Peternakan dan Perikanan',
    indikatorSasaranRpjmd: 'Nilai Tukar Petani (NTP), Nilai Tukar Nelayan (NTN), Produksi Komoditas Unggulan Daerah',
    programRpjmd: 'Program Pengelolaan Perikanan Tangkap dan Perikanan Budidaya',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-17',
    no: 17,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Produktivitas dan Nilai Tambah Sektor Pertanian, Peternakan dan Perikanan',
    indikatorSasaranRpjmd: 'Nilai Tukar Petani (NTP), Nilai Tukar Nelayan (NTN), Produksi Komoditas Unggulan Daerah',
    programRpjmd: 'Program Pengolahan dan Pemasaran Hasil Perikanan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 2.2: Ketahanan Pangan
  {
    id: 'au-18',
    no: 18,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Ketahanan Pangan Daerah',
    indikatorSasaranRpjmd: 'Indeks Ketahanan Pangan (IKP), Skor Pola Pangan Harapan (PPH)',
    programRpjmd: 'Program Peningkatan Diversifikasi dan Ketahanan Pangan Masyarakat',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-19',
    no: 19,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Ketahanan Pangan Daerah',
    indikatorSasaranRpjmd: 'Indeks Ketahanan Pangan (IKP), Skor Pola Pangan Harapan (PPH)',
    programRpjmd: 'Program Pengawasan Keamanan Pangan Segar Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 2.3: Koperasi & UMKM
  {
    id: 'au-20',
    no: 20,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Pemberdayaan Koperasi, Usaha Mikro, Perdagangan dan Perindustrian',
    indikatorSasaranRpjmd: 'Jumlah Koperasi Aktif Berkualitas, Persentase Usaha Mikro Naik Kelas, Volume Perdagangan',
    programRpjmd: 'Program Pemberdayaan dan Perlindungan Koperasi',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-21',
    no: 21,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Pemberdayaan Koperasi, Usaha Mikro, Perdagangan dan Perindustrian',
    indikatorSasaranRpjmd: 'Jumlah Koperasi Aktif Berkualitas, Persentase Usaha Mikro Naik Kelas, Volume Perdagangan',
    programRpjmd: 'Program Pemberdayaan Usaha Menengah, Usaha Kecil, dan Usaha Mikro (UMKM)',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-22',
    no: 22,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Pemberdayaan Koperasi, Usaha Mikro, Perdagangan dan Perindustrian',
    indikatorSasaranRpjmd: 'Jumlah Koperasi Aktif Berkualitas, Persentase Usaha Mikro Naik Kelas, Volume Perdagangan',
    programRpjmd: 'Program Pengembangan Ekspor dan Peningkatan Sarana Distribusi Perdagangan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-23',
    no: 23,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Pemberdayaan Koperasi, Usaha Mikro, Perdagangan dan Perindustrian',
    indikatorSasaranRpjmd: 'Jumlah Koperasi Aktif Berkualitas, Persentase Usaha Mikro Naik Kelas, Volume Perdagangan',
    programRpjmd: 'Program Perencanaan dan Pembangunan Industri Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 2.4: Pariwisata
  {
    id: 'au-24',
    no: 24,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Daya Tarik dan Kunjungan Destinasi Pariwisata serta Ekonomi Kreatif',
    indikatorSasaranRpjmd: 'Jumlah Kunjungan Wisatawan, Kontribusi Sektor Pariwisata terhadap PDRB',
    programRpjmd: 'Program Peningkatan Daya Tarik Destinasi Pariwisata',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-25',
    no: 25,
    tujuanRpjmd: 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan dan Berdaya Saing',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Daya Tarik dan Kunjungan Destinasi Pariwisata serta Ekonomi Kreatif',
    indikatorSasaranRpjmd: 'Jumlah Kunjungan Wisatawan, Kontribusi Sektor Pariwisata terhadap PDRB',
    programRpjmd: 'Program Pemasaran Pariwisata dan Pengembangan Ekonomi Kreatif',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // TUJUAN 3: Tata Kelola Pemerintahan
  // Sasaran 3.1: Akuntabilitas & Keuangan
  {
    id: 'au-26',
    no: 26,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akuntabilitas Kinerja, Pengawasan Internal dan Kualitas Pengelolaan Keuangan Daerah',
    indikatorSasaranRpjmd: 'Nilai SAKIP Daerah, Opini BPK atas LKPD, Level Maturitas SPIP, Level Kapabilitas APIP',
    programRpjmd: 'Program Penyelenggaraan Pengawasan Internal Pemerintah Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban Khusus',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-27',
    no: 27,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akuntabilitas Kinerja, Pengawasan Internal dan Kualitas Pengelolaan Keuangan Daerah',
    indikatorSasaranRpjmd: 'Nilai SAKIP Daerah, Opini BPK atas LKPD, Level Maturitas SPIP, Level Kapabilitas APIP',
    programRpjmd: 'Program Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-28',
    no: 28,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akuntabilitas Kinerja, Pengawasan Internal dan Kualitas Pengelolaan Keuangan Daerah',
    indikatorSasaranRpjmd: 'Nilai SAKIP Daerah, Opini BPK atas LKPD, Level Maturitas SPIP, Level Kapabilitas APIP',
    programRpjmd: 'Program Pengelolaan Keuangan Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-29',
    no: 29,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akuntabilitas Kinerja, Pengawasan Internal dan Kualitas Pengelolaan Keuangan Daerah',
    indikatorSasaranRpjmd: 'Nilai SAKIP Daerah, Opini BPK atas LKPD, Level Maturitas SPIP, Level Kapabilitas APIP',
    programRpjmd: 'Program Pengelolaan Barang Milik Daerah (Aset)',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-30',
    no: 30,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Akuntabilitas Kinerja, Pengawasan Internal dan Kualitas Pengelolaan Keuangan Daerah',
    indikatorSasaranRpjmd: 'Nilai SAKIP Daerah, Opini BPK atas LKPD, Level Maturitas SPIP, Level Kapabilitas APIP',
    programRpjmd: 'Program Pengelolaan Pendapatan Daerah dan Retribusi',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 3.2: Pelayanan Publik & ASN
  {
    id: 'au-31',
    no: 31,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Pelayanan Publik, Tata Kelola Birokrasi dan Profesionalitas ASN',
    indikatorSasaranRpjmd: 'Indeks Reformasi Birokrasi (IRB), Indeks Pelayanan Publik (IPP), Indeks Profesionalitas ASN',
    programRpjmd: 'Program Kepegawaian, Pendidikan dan Pelatihan ASN',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-32',
    no: 32,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Pelayanan Publik, Tata Kelola Birokrasi dan Profesionalitas ASN',
    indikatorSasaranRpjmd: 'Indeks Reformasi Birokrasi (IRB), Indeks Pelayanan Publik (IPP), Indeks Profesionalitas ASN',
    programRpjmd: 'Program Pelayanan Penanaman Modal dan Terpadu Satu Pintu',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-33',
    no: 33,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Pelayanan Publik, Tata Kelola Birokrasi dan Profesionalitas ASN',
    indikatorSasaranRpjmd: 'Indeks Reformasi Birokrasi (IRB), Indeks Pelayanan Publik (IPP), Indeks Profesionalitas ASN',
    programRpjmd: 'Program Penyelenggaraan Komunikasi, Informatika, Statistik dan Persandian',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-34',
    no: 34,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Pelayanan Publik, Tata Kelola Birokrasi dan Profesionalitas ASN',
    indikatorSasaranRpjmd: 'Indeks Reformasi Birokrasi (IRB), Indeks Pelayanan Publik (IPP), Indeks Profesionalitas ASN',
    programRpjmd: 'Program Pengelolaan Kearsipan dan Perpustakaan Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-35',
    no: 35,
    tujuanRpjmd: 'Mewujudkan Tata Kelola Pemerintahan yang Bersih, Akuntabel, Efektif, Efisien dan Melayani',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Pelayanan Publik, Tata Kelola Birokrasi dan Profesionalitas ASN',
    indikatorSasaranRpjmd: 'Indeks Reformasi Birokrasi (IRB), Indeks Pelayanan Publik (IPP), Indeks Profesionalitas ASN',
    programRpjmd: 'Program Penataan Kelembagaan dan Ketatalaksanaan Organisasi',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban III',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // TUJUAN 4: Infrastruktur & Lingkungan Hidup
  // Sasaran 4.1: Infrastruktur Dasar
  {
    id: 'au-36',
    no: 36,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Konektivitas dan Kualitas Infrastruktur Dasar Kewilayahan',
    indikatorSasaranRpjmd: 'Persentase Kemantapan Jalan Kabupaten/Kota, Rasio Akses Air Minum Layak, Rasio Sanitasi Layak',
    programRpjmd: 'Program Penyelenggaraan Jalan dan Jembatan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-37',
    no: 37,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Konektivitas dan Kualitas Infrastruktur Dasar Kewilayahan',
    indikatorSasaranRpjmd: 'Persentase Kemantapan Jalan Kabupaten/Kota, Rasio Akses Air Minum Layak, Rasio Sanitasi Layak',
    programRpjmd: 'Program Pengelolaan Sumber Daya Air (SDA) dan Drainase',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-38',
    no: 38,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Konektivitas dan Kualitas Infrastruktur Dasar Kewilayahan',
    indikatorSasaranRpjmd: 'Persentase Kemantapan Jalan Kabupaten/Kota, Rasio Akses Air Minum Layak, Rasio Sanitasi Layak',
    programRpjmd: 'Program Pengelolaan dan Pengembangan Sistem Penyediaan Air Minum (SPAM)',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-39',
    no: 39,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Konektivitas dan Kualitas Infrastruktur Dasar Kewilayahan',
    indikatorSasaranRpjmd: 'Persentase Kemantapan Jalan Kabupaten/Kota, Rasio Akses Air Minum Layak, Rasio Sanitasi Layak',
    programRpjmd: 'Program Pengelolaan dan Pengembangan Sistem Air Limbah Domestik',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-40',
    no: 40,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Konektivitas dan Kualitas Infrastruktur Dasar Kewilayahan',
    indikatorSasaranRpjmd: 'Persentase Kemantapan Jalan Kabupaten/Kota, Rasio Akses Air Minum Layak, Rasio Sanitasi Layak',
    programRpjmd: 'Program Pengembangan Perumahan dan Kawasan Permukiman Layak Huni',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 4.2: Lingkungan Hidup & Bencana
  {
    id: 'au-41',
    no: 41,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Lingkungan Hidup dan Ketahanan terhadap Bencana',
    indikatorSasaranRpjmd: 'Indeks Kualitas Lingkungan Hidup (IKLH), Indeks Risiko Bencana Daerah (IRBD)',
    programRpjmd: 'Program Pengendalian Pencemaran dan Kerusakan Lingkungan Hidup',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-42',
    no: 42,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Lingkungan Hidup dan Ketahanan terhadap Bencana',
    indikatorSasaranRpjmd: 'Indeks Kualitas Lingkungan Hidup (IKLH), Indeks Risiko Bencana Daerah (IRBD)',
    programRpjmd: 'Program Pengelolaan Keanekaragaman Hayati dan Ruang Terbuka Hijau (RTH)',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-43',
    no: 43,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Lingkungan Hidup dan Ketahanan terhadap Bencana',
    indikatorSasaranRpjmd: 'Indeks Kualitas Lingkungan Hidup (IKLH), Indeks Risiko Bencana Daerah (IRBD)',
    programRpjmd: 'Program Pengelolaan Sampah dan Pengurangan Limbah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-44',
    no: 44,
    tujuanRpjmd: 'Meningkatkan Kualitas dan Pemerataan Infrastruktur Wilayah Serta Kelestarian Lingkungan Hidup',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Kualitas Lingkungan Hidup dan Ketahanan terhadap Bencana',
    indikatorSasaranRpjmd: 'Indeks Kualitas Lingkungan Hidup (IKLH), Indeks Risiko Bencana Daerah (IRBD)',
    programRpjmd: 'Program Penanggulangan Bencana, Kesiapsiagaan dan Mitigasi',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban II',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // TUJUAN 5: Trantibum & Kesejahteraan Sosial
  // Sasaran 5.1: Trantibum
  {
    id: 'au-45',
    no: 45,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Ketertiban Umum, Ketenteraman Masyarakat dan Perlindungan Masyarakat',
    indikatorSasaranRpjmd: 'Persentase Penegakan Perda/Perkada yang Terselesaikan, Angka Gangguan Trantibum',
    programRpjmd: 'Program Peningkatan Ketenteraman dan Ketertiban Umum',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-46',
    no: 46,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Ketertiban Umum, Ketenteraman Masyarakat dan Perlindungan Masyarakat',
    indikatorSasaranRpjmd: 'Persentase Penegakan Perda/Perkada yang Terselesaikan, Angka Gangguan Trantibum',
    programRpjmd: 'Program Penegakan Peraturan Daerah dan Peraturan Kepala Daerah',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-47',
    no: 47,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Ketertiban Umum, Ketenteraman Masyarakat dan Perlindungan Masyarakat',
    indikatorSasaranRpjmd: 'Persentase Penegakan Perda/Perkada yang Terselesaikan, Angka Gangguan Trantibum',
    programRpjmd: 'Program Pembinaan Kesatuan Bangsa, Politik Dalam Negeri dan Kerukunan Umat',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },

  // Sasaran 5.2: Sosial & PPPA
  {
    id: 'au-48',
    no: 48,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Perlindungan dan Jaminan Sosial bagi Pemerlu Pelayanan Kesejahteraan Sosial',
    indikatorSasaranRpjmd: 'Persentase Penurunan Kemiskinan Ekstrem, Cakupan Penanganan PMKS/PPKS',
    programRpjmd: 'Program Pemberdayaan Sosial dan Penanggulangan Kemiskinan',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-49',
    no: 49,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Perlindungan dan Jaminan Sosial bagi Pemerlu Pelayanan Kesejahteraan Sosial',
    indikatorSasaranRpjmd: 'Persentase Penurunan Kemiskinan Ekstrem, Cakupan Penanganan PMKS/PPKS',
    programRpjmd: 'Program Rehabilitasi Sosial',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-50',
    no: 50,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Perlindungan dan Jaminan Sosial bagi Pemerlu Pelayanan Kesejahteraan Sosial',
    indikatorSasaranRpjmd: 'Persentase Penurunan Kemiskinan Ekstrem, Cakupan Penanganan PMKS/PPKS',
    programRpjmd: 'Program Perlindungan dan Jaminan Sosial',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-51',
    no: 51,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Perlindungan dan Jaminan Sosial bagi Pemerlu Pelayanan Kesejahteraan Sosial',
    indikatorSasaranRpjmd: 'Persentase Penurunan Kemiskinan Ekstrem, Cakupan Penanganan PMKS/PPKS',
    programRpjmd: 'Program Pemberdayaan Perempuan dan Perlindungan Anak (PPPA)',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  },
  {
    id: 'au-52',
    no: 52,
    tujuanRpjmd: 'Meningkatkan Ketenteraman, Ketertiban Umum, Penanganan Kemiskinan dan Kesejahteraan Sosial',
    indikatorTujuanRpjmd: '',
    sasaranRpjmd: 'Meningkatnya Perlindungan dan Jaminan Sosial bagi Pemerlu Pelayanan Kesejahteraan Sosial',
    indikatorSasaranRpjmd: 'Persentase Penurunan Kemiskinan Ekstrem, Cakupan Penanganan PMKS/PPKS',
    programRpjmd: 'Program Pengendalian Penduduk dan Keluarga Berencana',
    indikatorProgramRpjmd: '',
    opdPengampu: '',
    irbanPengampu: 'Irban I',
    tujuanSasaranRenstra: '',
    indikatorRenstra: '',
    programRenstra: '',
    indikatorProgramRenstra: '',
    anggaran: 0,
    prioritasRpjmn: '',
    sektorUnggulan: 'Bukan sektor unggulan daerah',
    temuanFraudHukum: '',
    isuTerkini: ''
  }
];
export const INITIAL_EVALUASI_REGISTER: EvaluasiRegisterRisikoItem[] = [];
export const INITIAL_KEMATANGAN_MR: KematanganMRItem[] = [];
export const INITIAL_FAKTOR_ANGGARAN: FaktorRisikoAnggaranItem[] = [];
export const INITIAL_PROGRAM_UNGGULAN: FaktorRisikoProgramUnggulanItem[] = [];
export const INITIAL_TEMUAN_FRAUD: FaktorRisikoTemuanFraudItem[] = [];
export const INITIAL_ISU_TERKINI: FaktorRisikoIsuTerkiniItem[] = [];
export const INITIAL_PRIORITAS_RPJMD: PrioritasProgramRPJMDItem[] = [];
export const INITIAL_PRIORITAS_OPD: PrioritasUnitKerjaOPDItem[] = [];
export const INITIAL_PRIORITAS_DESA: PrioritasDesaPuskesmasItem[] = [];
export const INITIAL_USULAN_PENGAWASAN: UsulanPrioritasPengawasanItem[] = [];
export const INITIAL_MANDATORY_PKPT: AreaPengawasanMandatoryItem[] = [];
export const INITIAL_TIDAK_MASUK_PKPT: AreaTidakMasukPKPTItem[] = [];
export const INITIAL_FORMAT_PKPT: FormatPKPTItem[] = [];

export const PPBR_MENU_ITEMS = [
  { id: 1, num: 'Lampiran 1', title: 'Audit Universe', subtitle: 'Kertas Kerja Pemetaan Audit Universe', icon: 'LayoutGrid' },
  { id: 2, num: 'Lampiran 2', title: 'Evaluasi Register Resiko', subtitle: 'Hasil Evaluasi Register Resiko (Sebelum, Setelah & Komposit)', icon: 'ShieldCheck' },
  { id: 3, num: 'Lampiran 3', title: 'Tingkat Kematangan MR', subtitle: 'Kematangan Manajemen Risiko & Pembobotan Unit Kerja', icon: 'BarChart2' },
  { id: 4, num: 'Lampiran 4', title: 'Faktor Risiko Anggaran', subtitle: 'Perhitungan Faktor Risiko Anggaran Belanja Langsung', icon: 'Coins' },
  { id: 5, num: 'Lampiran 5', title: 'Faktor Risiko Program Unggulan', subtitle: 'Keterkaitan RPJMD, RPJMN & Sektor Unggulan', icon: 'Award' },
  { id: 6, num: 'Lampiran 6', title: 'Faktor Risiko Temuan & Fraud', subtitle: 'Tindak Lanjut Temuan, Potensi Fraud & Kasus Hukum', icon: 'AlertTriangle' },
  { id: 7, num: 'Lampiran 7', title: 'Faktor Risiko Isu Terkini', subtitle: 'Sorotan Publik, Isu Nasional & Layanan Publik', icon: 'Flame' },
  { id: 8, num: 'Lampiran 8', title: 'Prioritas Pengawasan RPJMD', subtitle: 'Penyusunan Prioritas Area Pengawasan Program RPJMD', icon: 'Layers' },
  { id: 9, num: 'Lampiran 9', title: 'Prioritas Pengawasan OPD', subtitle: 'Prioritas Area Pengawasan Kelompok OPD/Unit Kerja', icon: 'Building2' },
  { id: 10, num: 'Lampiran 10', title: 'Prioritas Desa/Puskesmas', subtitle: 'Prioritas Area Pengawasan Kelompok Desa/Puskesmas/Sekolah', icon: 'Home' },
  { id: 11, num: 'Lampiran 11', title: 'Usulan Prioritas Pengawasan', subtitle: 'Usulan Prioritas Rencana Pengawasan (Jenis & SDM HP)', icon: 'ClipboardCheck' },
  { id: 12, num: 'Lampiran 12', title: 'Mandatory PKPT', subtitle: 'Daftar Area Pengawasan yang Wajib Dimasukkan PKPT', icon: 'CheckCircle2' },
  { id: 13, num: 'Lampiran 13', title: 'Tidak Masuk PKPT', subtitle: 'Daftar Auditable Unit yang Tidak Masuk PKPT', icon: 'XCircle' },
  { id: 14, num: 'Lampiran 14', title: 'Format PKPT Berbasis Risiko', subtitle: 'Dokumen Penetapan PKPT Berbasis Risiko Resmi', icon: 'FileSpreadsheet' }
];

export const INITIAL_PRIORITAS_PROGRAM = INITIAL_PRIORITAS_RPJMD;
export const INITIAL_PRIORITAS_DESA_PUSKESMAS = INITIAL_PRIORITAS_DESA;
export const INITIAL_MANDATORY = INITIAL_MANDATORY_PKPT;
export const INITIAL_PKPT_BERBASIS_RISIKO = INITIAL_FORMAT_PKPT;

