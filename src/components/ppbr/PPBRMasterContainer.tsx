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

export interface PPBRMasterContainerProps {
  activeSubMenu?: string;
  onSelectSubMenu?: (menuId: string) => void;
  onBackToRiskSelection?: () => void;
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
  onBackToRiskSelection
}) => {
  const [internalMenu, setInternalMenu] = useState<string>(activeSubMenu);

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
        return <AuditUniverseView />;
      case 'ppbr-2':
        return <EvaluasiRegisterRisikoView />;
      case 'ppbr-3':
        return <KematanganMRView />;
      case 'ppbr-4':
        return <FaktorRisikoAnggaranView />;
      case 'ppbr-5':
        return <FaktorRisikoProgramUnggulanView />;
      case 'ppbr-6':
        return <FaktorRisikoTemuanFraudView />;
      case 'ppbr-7':
        return <FaktorRisikoIsuTerkiniView />;
      case 'ppbr-8':
        return <PrioritasProgramRPJMDView />;
      case 'ppbr-9':
        return <PrioritasUnitKerjaOPDView />;
      case 'ppbr-10':
        return <PrioritasDesaPuskesmasView />;
      case 'ppbr-11':
        return <UsulanPrioritasPengawasanView />;
      case 'ppbr-12':
        return <AreaPengawasanMandatoryView />;
      case 'ppbr-13':
        return <AreaTidakMasukPKPTView />;
      case 'ppbr-14':
        return <FormatPKPTBerbasisRisikoView />;
      default:
        return <AuditUniverseView />;
    }
  };

  const activeMeta = PPBR_MENUS.find(m => m.id === currentMenuId) || PPBR_MENUS[0];

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};
