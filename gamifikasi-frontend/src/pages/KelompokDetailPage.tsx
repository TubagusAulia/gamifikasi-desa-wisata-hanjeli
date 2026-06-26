import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { kelompokApi, quizApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Users, BookOpen, Plus, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function KelompokDetailPage() {
  const { id } = useParams<{ id: string }>();
  const kelompokId = Number(id);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [selectedQuizIds, setSelectedQuizIds] = useState<number[]>([]);

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

  const { data: allQuizList } = useQuery({
    queryKey: ['quiz', 'all-for-assign'],
    queryFn: quizApi.getAll,
  });

  const handleAssignQuiz = () => {
    setShowQuizForm(false);
    setSelectedQuizIds([]);
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
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <Users size={18} className="text-secondary" />
                  Daftar Peserta
                </h3>
                {kelompok.peserta && kelompok.peserta.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-text-muted font-medium">No</th>
                          <th className="text-left py-2 px-2 text-text-muted font-medium">Nama</th>
                          <th className="text-left py-2 px-2 text-text-muted font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kelompok.peserta.map((peserta, idx) => (
                          <tr key={peserta.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                            <td className="py-2.5 px-2 text-text-muted">{idx + 1}</td>
                            <td className="py-2.5 px-2 text-text font-medium">{peserta.nama}</td>
                            <td className="py-2.5 px-2 text-text-muted">{peserta.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-4">Belum ada peserta terdaftar.</p>
                )}
              </div>

              {/* Quiz List */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                    <BookOpen size={18} className="text-secondary" />
                    Quiz Terdaftar
                  </h3>
                  <button
                    onClick={() => setShowQuizForm(!showQuizForm)}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Tambah Quiz
                  </button>
                </div>

                {/* Assign Quiz Form */}
                {showQuizForm && (
                  <div className="mb-4 p-4 bg-surface-alt rounded-lg border border-border">
                    <h4 className="text-sm font-medium text-text mb-2">Pilih Quiz untuk Ditambahkan</h4>
                    {allQuizList && allQuizList.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {allQuizList
                          .filter((q) => !quizList?.some((kq) => kq.id === q.id))
                          .map((quiz) => (
                            <label key={quiz.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedQuizIds.includes(quiz.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedQuizIds([...selectedQuizIds, quiz.id]);
                                  } else {
                                    setSelectedQuizIds(selectedQuizIds.filter((id) => id !== quiz.id));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="text-text">{quiz.nama}</span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">Tidak ada quiz tersedia.</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAssignQuiz}
                        disabled={selectedQuizIds.length === 0}
                        className="btn-accent text-sm"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => setShowQuizForm(false)}
                        className="btn-ghost text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {quizList && quizList.length > 0 ? (
                  <div className="space-y-3">
                    {quizList.map((quiz) => (
                      <Link
                        key={quiz.id}
                        to={`/quiz/${quiz.id}`}
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
                  <p className="text-text-muted text-center py-4">Belum ada quiz ditugaskan.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
