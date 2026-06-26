import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import logoUrl from '@/assets/logo.png';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/kelompok');
    } catch {
      // error is in store
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoUrl} alt="Gamifikasi DWH" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text">Gamifikasi DWH</h1>
          <p className="text-text-muted mt-1">Masuk ke akun Anda</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger rounded-lg text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  className="input-field pl-10"
                  placeholder="email@contoh.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  className="input-field pl-10"
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-success w-full">
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-text-muted">
            Belum punya akun?{' '}
            <Link to="/register" className="text-secondary font-medium hover:underline">
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
