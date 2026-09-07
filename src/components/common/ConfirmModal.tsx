import React from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600 border border-rose-200',
          btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400',
          icon: <Trash2 className="w-6 h-6" />
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600 border border-amber-200',
          btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-400',
          icon: <AlertTriangle className="w-6 h-6" />
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-600 border border-blue-200',
          btnConfirm: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400',
          icon: <HelpCircle className="w-6 h-6" />
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 scale-in-95 duration-150 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${style.iconBg} shrink-0`}>
              {style.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Konfirmasi Tindakan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message body */}
        <div className="space-y-2">
          <p className="text-sm text-slate-700 leading-relaxed">
            {message}
          </p>
          {detail && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium break-words">
              {detail}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ${style.btnConfirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
