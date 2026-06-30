import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ 
  isOpen, 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  confirmText = "Delete", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
  isDestructive = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Content Wrapper */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-slide-up transform transition-all z-10">
        
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-3.5">
            <div className={`p-3 rounded-2xl ${isDestructive ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-650' : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-6 px-8 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer ${
              isDestructive 
                ? 'bg-rose-650 hover:bg-rose-700 shadow-rose-100/50 dark:shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100/50 dark:shadow-none'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
