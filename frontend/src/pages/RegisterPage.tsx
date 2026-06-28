import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Mail, Lock, User, Users, AlertCircle } from 'lucide-react';
import type { UserRole } from '@/types';
import logoUrl from '@/assets/logo.png';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('peserta');
  const [kelompok, setKelompok] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ nama: name, email, password, role });
      navigate('/kelompok');
    } catch {
      // error in store
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoUrl} alt="Gamifikasi DWH" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text">Gamifikasi DWH</h1>
          <p className="text-text-muted mt-1">Buat akun baru</p>
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
              <label className="block text-sm font-medium text-text mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Nama lengkap"
                  required
                />
              </div>
            </div>

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
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Min. 6 karakter"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Role</label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="input-field pl-10"
                >
                  <option value="peserta">Peserta</option>
                  <option value="admin">Admin</option>
                  <option value="worker">Worker</option>
                </select>
              </div>
            </div>

            {(role === 'peserta' || role === 'worker') && (
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Kelompok</label>
                <input
                  type="text"
                  value={kelompok}
                  onChange={(e) => setKelompok(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Kelompok 1"
                />
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-success w-full">
              {isLoading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-text-muted">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-secondary font-medium hover:underline">
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
