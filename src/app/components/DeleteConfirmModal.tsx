import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from './dashboard_new/ui/button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                <Trash2 size={40} className="text-red-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">
                Удалить раздел?
              </h2>
              
              <div className="bg-white/5 rounded-2xl p-4 mb-6 w-full border border-white/5">
                <p className="text-gray-300 font-medium italic">"{title}"</p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-2xl mb-8 border border-orange-500/10 text-left">
                <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <p className="text-orange-200/80 text-sm leading-relaxed">
                  Это действие необратимо. Все виджеты и настройки внутри этого раздела будут удалены навсегда.
                </p>
              </div>

              <div className="flex w-full gap-4">
                <Button
                  onClick={onClose}
                  className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-2xl transition-all"
                >
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20 transition-all font-bold"
                >
                  Удалить
                </Button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
