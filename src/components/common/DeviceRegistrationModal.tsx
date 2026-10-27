import React, { useState, useEffect } from 'react';
import { Laptop, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

const DEVICE_STORAGE_KEY = 'isman_device_operator_name';

export const getDeviceOperatorName = (): string => {
  try {
    const savedUser = localStorage.getItem('isman_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      if (u && (u.username || u.name)) return u.username || u.name;
    }
    return localStorage.getItem(DEVICE_STORAGE_KEY) || 'Operator (Belum Terdaftar)';
  } catch (_) {
    return 'Operator';
  }
};

export const isDeviceRegistered = (): boolean => {
  try {
    const val = localStorage.getItem(DEVICE_STORAGE_KEY);
    return Boolean(val && val.trim().length > 0);
  } catch (_) {
    return false;
  }
};

interface DeviceRegistrationModalProps {
  forceOpen?: boolean;
  onRegistered?: (name: string) => void;
}

export const DeviceRegistrationModal: React.FC<DeviceRegistrationModalProps> = ({
  forceOpen = false,
  onRegistered
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const alreadyRegistered = isDeviceRegistered();
    if (!alreadyRegistered) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 3) {
      setErrorMsg('Nama pemegang laptop minimal 3 karakter.');
      return;
    }

    try {
      localStorage.setItem(DEVICE_STORAGE_KEY, trimmed);
      window.dispatchEvent(new CustomEvent('isman_device_registered', { detail: trimmed }));
    } catch (err) {
      console.warn('Failed to save device operator name', err);
    }

    setIsOpen(false);
    if (onRegistered) {
      onRegistered(trimmed);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-blue-500/20 border-2 border-blue-400/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Laptop className="w-7 h-7 text-blue-300" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase">
            Registrasi Identitas Laptop / Personil
          </h2>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            Inspektorat Daerah Kabupaten Mimika
          </p>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <p className="font-semibold text-slate-800">
              Halo Rekan Inspektorat! 👋
            </p>
            <p>
              Karena akun ini digunakan bersama oleh beberapa personil/tim, silakan masukkan nama Anda atau identitas pemegang laptop ini. Nama ini akan menjadi tanda pengenal resmi pada riwayat pengisian dan perubahan data agar transparan dan dapat dipertanggungjawabkan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Nama Pengguna / Tim Pemegang Laptop Ini *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nameInput}
              onChange={e => {
                setNameInput(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Contoh: Budi Santoso (Irban 1) / Tim Perencanaan"
              className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            />
            {errorMsg && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Saved Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold block">Pencatatan Otomatis</span>
              <span>
                Nama ini tersimpan di browser laptop ini untuk menandai setiap penambahan, pengeditan, atau penghapusan data agar riwayat perubahan tercatat rapi dan transparan.
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={nameInput.trim().length < 3}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Identitas Laptop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DeviceOperatorBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [operatorName, setOperatorName] = useState<string>(getDeviceOperatorName());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail) setOperatorName(e.detail);
      else setOperatorName(getDeviceOperatorName());
    };
    window.addEventListener('isman_device_registered', handleUpdate);
    return () => window.removeEventListener('isman_device_registered', handleUpdate);
  }, []);

  if (!isDeviceRegistered()) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 shadow-xs ${className}`}>
      <Laptop className="w-3.5 h-3.5 text-teal-400 shrink-0" />
      <span className="text-[11px] text-slate-400">Laptop:</span>
      <span className="font-bold text-teal-300 max-w-[140px] truncate" title={operatorName}>
        {operatorName}
      </span>
      <Lock className="w-2.5 h-2.5 text-teal-400/70 ml-0.5" title="Identitas tercatat di browser laptop ini" />
    </div>
  );
};
