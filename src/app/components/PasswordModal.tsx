import { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordModal({ isOpen, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const editPassword = import.meta.env.VITE_EDIT_PASSWORD;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editPassword) {
      setError('Пароль редактирования не настроен в переменных окружения');
      return;
    }

    if (password === editPassword) {
      onSuccess();
      setPassword('');
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#1a1a1a] border border-gray-700/30 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
            <Lock size={20} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Требуется авторизация</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Введите пароль для редактирования</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
              placeholder="Пароль"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
