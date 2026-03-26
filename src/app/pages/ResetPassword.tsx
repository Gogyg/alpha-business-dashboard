import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { authAPI, supabase } from '../utils/api';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import logoImage from '../../assets/5b6ead3363f3911c8fbce32735c6a3c819462945.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a session (the link from email should provide one)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Сессия истекла или недействительна. Попробуйте запросить сброс пароля снова.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await authAPI.updatePassword(password);
      setSuccess('Пароль успешно изменен! Теперь вы можете войти.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 50%, #0a0f1e 100%)'
      }}>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20">
            <div className="bg-[#0a0f1e] p-2 rounded-[22px] backdrop-blur-2xl">
              <img src={logoImage} alt="Alpha" className="w-16 h-16 rounded-[18px]" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            Новый <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">пароль</span>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Введите новый пароль для вашего аккаунта
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 ml-1">
                Новый пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 ml-1">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10">
                {loading ? 'Загрузка...' : 'Обновить пароль'}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 Альфа-Бизнес. Все права защищены.
        </p>
      </div>
    </div>
  );
}
