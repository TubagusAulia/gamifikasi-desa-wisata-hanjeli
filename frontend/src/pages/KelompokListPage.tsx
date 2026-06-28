import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kelompokApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Users, Plus, Loader2, AlertCircle } from 'lucide-react';

export function KelompokListPage() {
  const { user } = useAuthStore();
  // Redirect workers to the map (peta) — workers should not manage kelompok
  if (user?.role === 'worker') return <Navigate to="/peta" replace />;
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState('');
  const [pesertaText, setPesertaText] = useState('');
  const queryClient = useQueryClient();

  const { data: kelompokList, isLoading, error } = useQuery({
    queryKey: ['kelompok'],
    queryFn: kelompokApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: kelompokApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelompok'] });
      setShowForm(false);
      setNama('');
      setPesertaText('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pesertaNames = pesertaText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    createMutation.mutate({
      nama,
      peserta: pesertaNames.map((nama) => ({ nama })),
    });
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Daftar Kelompok</h1>
            <p className="text-text-muted mt-1">Kelola kelompok peserta</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-accent flex items-center gap-2"
          >
            <Plus size={18} />
            Buat Kelompok Baru
          </button>
        </div>

        {/* Inline Form */}
        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-text mb-4">Buat Kelompok Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Nama Kelompok</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Kelompok A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Daftar Peserta (satu nama per baris)
                </label>
                <textarea
                  value={pesertaText}
                  onChange={(e) => setPesertaText(e.target.value)}
                  className="input-field min-h-[120px]"
                  placeholder={"Ahmad\nBudi\nCitra"}
                  required
                />
              </div>
              {createMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger rounded-lg text-sm">
                  <AlertCircle size={16} />
                  Gagal membuat kelompok. Silakan coba lagi.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-success"
                >
                  {createMutation.isPending ? 'Memproses...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-ghost"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data kelompok. Silakan coba lagi.
          </div>
        )}

        {/* Kelompok Cards */}
        {!isLoading && !error && kelompokList && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kelompokList.map((kelompok) => (
              <Link
                key={kelompok.id}
                to={`/kelompok/${kelompok.id}`}
                className="card-hover"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-secondary-50 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{kelompok.nama}</h3>
                    <p className="text-sm text-text-muted mt-1">
                      {kelompok.peserta_count ?? 0} peserta
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Dibuat: {new Date(kelompok.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && kelompokList?.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">Belum ada kelompok. Buat kelompok pertama Anda.</p>
          </div>
        )}
      </main>
    </div>
  );
}
