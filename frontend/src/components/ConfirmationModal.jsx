import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={null} // custom header body
      size="sm"
    >
      <div className="space-y-6">
        {/* Warning Icon and Text */}
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${isDestructive ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
