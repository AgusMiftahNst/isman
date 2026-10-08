import React, { useState } from 'react';
import { AuditUniverseView } from './AuditUniverseView';
import { EvaluasiRegisterRisikoView } from './EvaluasiRegisterRisikoView';
import { KematanganMRView } from './KematanganMRView';
import { FaktorRisikoAnggaranView } from './FaktorRisikoAnggaranView';
import { FaktorRisikoProgramUnggulanView } from './FaktorRisikoProgramUnggulanView';
import { FaktorRisikoTemuanFraudView } from './FaktorRisikoTemuanFraudView';
import { FaktorRisikoIsuTerkiniView } from './FaktorRisikoIsuTerkiniView';
import { PrioritasProgramRPJMDView } from './PrioritasProgramRPJMDView';
import { PrioritasUnitKerjaOPDView } from './PrioritasUnitKerjaOPDView';
import { PrioritasDesaPuskesmasView } from './PrioritasDesaPuskesmasView';
import { UsulanPrioritasPengawasanView } from './UsulanPrioritasPengawasanView';
import { AreaPengawasanMandatoryView } from './AreaPengawasanMandatoryView';
import { AreaTidakMasukPKPTView } from './AreaTidakMasukPKPTView';
import { FormatPKPTBerbasisRisikoView } from './FormatPKPTBerbasisRisikoView';
import { 
  FileText, 
  Layers, 
  ShieldCheck, 
  Coins, 
  Award, 
  AlertTriangle, 
  Flame, 
  BarChart3, 
  Building2, 
  Landmark, 
  Target, 
  BookOpen, 
  Ban, 
  CalendarCheck,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

import { getSelectedYear } from './ppbrYearHelper';
import { usePPBRGlobalSync } from './ppbrCloudSync';
import { Cloud, Wifi } from 'lucide-react';

export interface PPBRMasterContainerProps {
  activeSubMenu?: string;
  onSelectSubMenu?: (menuId: string) => void;
  onBackToRiskSelection?: () => void;
  isAdmin?: boolean;
  year?: string;
}

export const PPBR_MENUS = [
  { id: 'ppbr-1', lampiranNo: 1, title: 'Audit Universe', desc: 'Daftar entitas & objek potensial pengawasan', icon: Layers, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { id: 'ppbr-2', lampiranNo: 2, title: 'Evaluasi Register Resiko', desc: 'Evaluasi register risiko OPD & nilai komposit APIP', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'ppbr-3', lampiranNo: 3, title: 'Tingkat Kematangan Manajemen Risiko', desc: 'Maturitas MR unit kerja & pembobotan register', icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'ppbr-4', lampiranNo: 4, title: 'Kertas Kerja Faktor Risiko Anggaran', desc: 'Pertimbangan porsi anggaran belanja langsung APBD', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'ppbr-5', lampiranNo: 5, title: 'Faktor Risiko Program Unggulan Daerah & RPJMN', desc: 'Keterkaitan sasaran RPJMD & sektor unggulan', icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'ppbr-6', lampiranNo: 6, title: 'Faktor Risiko Temuan, Fraud & Kasus Hukum', desc: 'Tindak lanjut temuan audit & potensi kasus integritas', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'ppbr-7', lampiranNo: 7, title: 'Faktor Risiko Isu Terkini', desc: 'Sorotan publik, isu nasional & hajat hidup orang banyak', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'ppbr-8', lampiranNo: 8, title: 'Penetapan Prioritas Program RPJMD', desc: 'Skoring & perangkingan program strategis daerah', icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'ppbr-9', lampiranNo: 9, title: 'Penetapan Prioritas Unit Kerja / OPD', desc: 'Skoring & perangkingan pengawasan seluruh perangkat daerah', icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'ppbr-10', lampiranNo: 10, title: 'Penetapan Prioritas Desa & Puskesmas', desc: 'Skoring entitas operasional (Dana Desa, Puskesmas, BOS)', icon: Landmark, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'ppbr-11', lampiranNo: 11, title: 'Usulan Prioritas Pengawasan PBBR', desc: 'Usulan objek pengawasan hasil penilaian risiko & mandays', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'ppbr-12', lampiranNo: 12, title: 'Area Pengawasan Mandatory (Regulasi)', desc: 'Pengawasan wajib regulasi perundang-undangan nasional', icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { id: 'ppbr-13', lampiranNo: 13, title: 'Area Tidak Masuk PKPT Tahun Berjalan', desc: 'Dokumentasi keterbatasan sumber daya & mitigasi risiko', icon: Ban, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'ppbr-14', lampiranNo: 14, title: 'Format PKPT Berbasis Risiko', desc: 'Dokumen final PKPT tahunan berbasis risiko terpadu', icon: CalendarCheck, color: 'text-teal-400', bg: 'bg-teal-500/10' }
];

export const PPBRMasterContainer: React.FC<PPBRMasterContainerProps> = ({
  activeSubMenu = 'ppbr-1',
  onSelectSubMenu,
  onBackToRiskSelection,
  isAdmin: isAdminProp,
  year
}) => {
  const [internalMenu, setInternalMenu] = useState<string>(activeSubMenu);
  const activeYear = year || getSelectedYear();

  // Background Cloud Sync for all 14 menus across all laptops
  const { syncedCount, lastGlobalSync } = usePPBRGlobalSync(activeYear);

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

  const currentMenuId = onSelectSubMenu ? activeSubMenu : internalMenu;
  const setMenu = (id: string) => {
    if (onSelectSubMenu) {
      onSelectSubMenu(id);
    } else {
      setInternalMenu(id);
    }
  };

  const renderContent = () => {
    switch (currentMenuId) {
      case 'ppbr-1':
        return <AuditUniverseView key={`au-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-2':
        return <EvaluasiRegisterRisikoView key={`err-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-3':
        return <KematanganMRView key={`kmr-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-4':
        return <FaktorRisikoAnggaranView key={`fra-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-5':
        return <FaktorRisikoProgramUnggulanView key={`fpu-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-6':
        return <FaktorRisikoTemuanFraudView key={`frt-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-7':
        return <FaktorRisikoIsuTerkiniView key={`fit-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-8':
        return <PrioritasProgramRPJMDView key={`ppr-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-9':
        return <PrioritasUnitKerjaOPDView key={`puo-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-10':
        return <PrioritasDesaPuskesmasView key={`pdp-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-11':
        return <UsulanPrioritasPengawasanView key={`upp-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-12':
        return <AreaPengawasanMandatoryView key={`apm-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-13':
        return <AreaTidakMasukPKPTView key={`atm-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      case 'ppbr-14':
        return <FormatPKPTBerbasisRisikoView key={`fpb-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
      default:
        return <AuditUniverseView key={`au-def-${activeYear}`} isAdmin={isAdmin} year={activeYear} />;
    }
  };

  const activeMeta = PPBR_MENUS.find(m => m.id === currentMenuId) || PPBR_MENUS[0];

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};
