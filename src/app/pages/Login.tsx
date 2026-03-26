import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authAPI } from '../utils/api';
import { Lock, Mail, User, AlertCircle, CheckCircle } from 'lucide-react';
import logoImage from '../../assets/5b6ead3363f3911c8fbce32735c6a3c819462945.png';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgot) {
        await authAPI.sendPasswordResetEmail(email);
        setSuccess('Ссылка для сброса пароля отправлена на почту!');
      } else if (isLogin) {
        await authAPI.login(email, password);
        navigate('/');
      } else {
        await authAPI.signup(email, password, name);
        // After signup, login automatically
        await authAPI.login(email, password);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 50%, #0a0f1e 100%)'
      }}>
      
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Title */}
        <div className="text-center mb-10">
          <div className="inline-block p-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20">
            <div className="bg-[#0a0f1e] p-2 rounded-[22px] backdrop-blur-2xl">
              <img src={logoImage} alt="Alpha" className="w-16 h-16 rounded-[18px]" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            Альфа-Бизнес <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Дашборд</span>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            {isForgot ? 'Восстановление доступа' : isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && !isForgot && (
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 ml-1">
                  Имя
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                    placeholder="Ваше имя"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 ml-1">
                  Пароль
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
                {isLogin && (
                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                    >
                      Забыли пароль?
                    </button>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10">
                {loading ? 'Загрузка...' : isForgot ? 'Сбросить пароль' : isLogin ? 'Войти' : 'Создать аккаунт'}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            {isForgot ? (
              <button
                onClick={() => {
                  setIsForgot(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-white transition-all text-sm font-semibold uppercase tracking-widest"
              >
                ← К входу
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-white transition-all text-sm font-semibold uppercase tracking-widest"
              >
                {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 Альфа-Бизнес. Все права защищены.
        </p>
      </div>
    </div>
  );
}
