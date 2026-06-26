import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi, kelompokApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Camera, Plus, Loader2, AlertCircle, Users } from 'lucide-react';

export function ReviewListPage() {
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: reviewList, isLoading, error } = useQuery({
    queryKey: ['review'],
    queryFn: reviewApi.getAll,
  });

  const { data: kelompokList } = useQuery({
    queryKey: ['kelompok'],
    queryFn: kelompokApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: reviewApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setNama('');
    setDeskripsi('');
    setSelectedKelompok([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      nama,
      deskripsi: deskripsi || undefined,
      kelompok_ids: selectedKelompok,
    });
  };

  const toggleKelompok = (id: number) => {
    setSelectedKelompok((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Daftar Review</h1>
            <p className="text-text-muted mt-1">Kelola aktivitas foto/review</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-accent flex items-center gap-2"
          >
            <Plus size={18} />
            Buat Review Baru
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-text mb-4">Buat Review Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Nama Review</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Review Kegiatan Pagi"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Deskripsi</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="Deskripsi review (opsional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-2">Pilih Kelompok</label>
                {kelompokList && kelompokList.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {kelompokList.map((k) => (
                      <label
                        key={k.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedKelompok.includes(k.id)
                            ? 'border-primary bg-primary-50'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKelompok.includes(k.id)}
                          onChange={() => toggleKelompok(k.id)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text">{k.nama}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Tidak ada kelompok tersedia.</p>
                )}
              </div>
              {createMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger rounded-lg text-sm">
                  <AlertCircle size={16} />
                  Gagal membuat review. Silakan coba lagi.
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
                  onClick={resetForm}
                  className="btn-ghost"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data review.
          </div>
        )}

        {/* Review Cards */}
        {!isLoading && !error && reviewList && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewList.map((review) => (
              <Link
                key={review.id}
                to={`/review/${review.id}`}
                className="card-hover"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                    <Camera size={20} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{review.nama}</h3>
                    {review.deskripsi && (
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">{review.deskripsi}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-light">
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Users size={14} />
                    <span>{review.kelompok?.length ?? 0} kelompok</span>
                  </div>
                  <span className={review.status === 'active' ? 'badge-success' : 'badge-warning bg-gray-100 text-text-muted'}>
                    {review.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-accent font-medium">Lihat detail →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && reviewList?.length === 0 && (
          <div className="text-center py-12">
            <Camera size={48} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">Belum ada review. Buat review pertama Anda.</p>
          </div>
        )}
      </main>
    </div>
  );
}
