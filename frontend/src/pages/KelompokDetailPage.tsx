import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kelompokApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Users, BookOpen, Plus, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function KelompokDetailPage() {
  const { user } = useAuthStore();
  if (user?.role === 'worker') return <Navigate to="/peta" replace />;
  const { id } = useParams<{ id: string }>();
  const kelompokId = Number(id);
  const queryClient = useQueryClient();
  const [newPesertaNama, setNewPesertaNama] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: kelompok, isLoading: loadingKelompok, error: errorKelompok } = useQuery({
    queryKey: ['kelompok', kelompokId],
    queryFn: () => kelompokApi.getById(kelompokId),
    enabled: !!kelompokId,
  });

  const { data: quizList, isLoading: loadingQuiz } = useQuery({
    queryKey: ['kelompok', kelompokId, 'quiz'],
    queryFn: () => kelompokApi.getQuiz(kelompokId),
    enabled: !!kelompokId,
  });

  const addPesertaMutation = useMutation({
    mutationFn: (nama: string) => kelompokApi.addPeserta(kelompokId, { nama }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelompok', kelompokId] });
      setNewPesertaNama('');
      setShowForm(false);
    },
  });

  const handleAddPeserta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPesertaNama.trim()) return;
    addPesertaMutation.mutate(newPesertaNama.trim());
  };

  const isLoading = loadingKelompok || loadingQuiz;

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back link */}
        <Link to="/kelompok" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Daftar Kelompok
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {errorKelompok && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data kelompok.
          </div>
        )}

        {kelompok && (
          <>
            {/* Kelompok Info */}
            <div className="card mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-secondary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text">{kelompok.nama}</h1>
                  <p className="text-text-muted">
                    {kelompok.peserta?.length ?? 0} peserta
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Peserta Table */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                    <Users size={18} className="text-secondary" />
                    Daftar Peserta
                  </h3>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Tambah Peserta
                  </button>
                </div>

                {/* Add Peserta Form */}
                {showForm && (
                  <form onSubmit={handleAddPeserta} className="mb-4 p-4 bg-surface-alt rounded-lg border border-border">
                    <label className="block text-xs font-medium text-text mb-1">Nama Peserta</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPesertaNama}
                        onChange={(e) => setNewPesertaNama(e.target.value)}
                        placeholder="Masukkan nama lengkap"
                        className="input-field text-sm flex-1"
                        required
                      />
                      <button
                        type="submit"
                        disabled={addPesertaMutation.isPending || !newPesertaNama.trim()}
                        className="btn-success text-sm"
                      >
                        {addPesertaMutation.isPending ? 'Menambah...' : 'Tambah'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setNewPesertaNama(''); }}
                        className="btn-ghost text-sm"
                      >
                        Batal
                      </button>
                    </div>
                    {addPesertaMutation.isError && (
                      <p className="text-xs text-danger mt-2">
                        {(addPesertaMutation.error as Error)?.message || 'Gagal menambah peserta.'}
                      </p>
                    )}
                  </form>
                )}

                {kelompok.peserta && kelompok.peserta.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-text-muted font-medium">No</th>
                          <th className="text-left py-2 px-2 text-text-muted font-medium">Nama</th>
                          <th className="text-left py-2 px-2 text-text-muted font-medium">Email</th>
                          <th className="text-left py-2 px-2 text-text-muted font-medium">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kelompok.peserta.map((peserta, idx) => (
                          <tr key={peserta.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                            <td className="py-2.5 px-2 text-text-muted">{idx + 1}</td>
                            <td className="py-2.5 px-2 text-text font-medium">{peserta.nama}</td>
                            <td className="py-2.5 px-2 text-text-muted">{peserta.email}</td>
                            <td className="py-2.5 px-2 text-text-muted font-mono text-xs">
                              {peserta.password || 'password123'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-4">Belum ada peserta terdaftar.</p>
                )}
              </div>

              {/* Agenda List */}
              <div className="card">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <BookOpen size={18} className="text-secondary" />
                  Agenda Terdaftar
                </h3>

                {quizList && quizList.length > 0 ? (
                  <div className="space-y-3">
                    {quizList.map((quiz) => (
                      <Link
                        key={quiz.id}
                        to={`/agenda/${quiz.id}`}
                        className="block p-3 bg-surface-alt rounded-lg hover:bg-primary-50 transition-colors border border-border-light"
                      >
                        <p className="font-medium text-text text-sm">{quiz.nama}</p>
                        {quiz.deskripsi && (
                          <p className="text-xs text-text-muted mt-0.5">{quiz.deskripsi}</p>
                        )}
                        <span className="text-xs text-secondary mt-1 inline-block font-medium">Lihat detail →</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-4">Belum ada agenda ditugaskan.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
