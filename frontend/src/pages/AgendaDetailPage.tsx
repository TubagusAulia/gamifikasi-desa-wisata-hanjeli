import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { agendaApi, daftarSoalApi, posApi, quizApi, photoApi, leaderboardApi, workerApi, quizAdminApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Clock, Plus, Loader2, AlertCircle, ArrowLeft, Trophy, Users, PhoneOff, Phone, Camera } from 'lucide-react';
import type { QuizSession } from '@/types';

export function AgendaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = Number(id);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({
    nama: '',
    deskripsi: '',
    daftar_soal_id: 0,
    pos_id: 0,
    waktu_mulai: '',
    waktu_selesai: '',
  });
  const queryClient = useQueryClient();

  const { data: agenda, isLoading, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => agendaApi.getById(quizId),
    enabled: !!quizId,
  });

  const quizList = agenda?.sesi;

  const { data: daftarSoalList } = useQuery({
    queryKey: ['daftar-soal'],
    queryFn: daftarSoalApi.getAll,
  });

  const { data: posList } = useQuery({
    queryKey: ['pos'],
    queryFn: posApi.getAll,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', 'quiz', quizId],
    queryFn: () => leaderboardApi.getQuiz(quizId),
    enabled: !!quizId,
  });

  const photoLeaderboardQueries = useQueries({
    queries: (quizList ?? []).map((session) => ({
      queryKey: ['photo-leaderboard', session.id],
      queryFn: () => photoApi.getLeaderboard(session.id),
      enabled: !!session.id,
      staleTime: 60_000,
    })),
  });

  const navigate = useNavigate();

  // Workers for assignment (admin)
  const { data: workerList } = useQuery({ queryKey: ['workers'], queryFn: workerApi.list });

  const assignWorkerMutation = useMutation({
    mutationFn: ({ quizId, pesertaId }: { quizId: number; pesertaId: number }) => quizAdminApi.assignWorker(quizId, pesertaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiz', quizId] }),
  });

  const unassignWorkerMutation = useMutation({
    mutationFn: ({ quizId, pesertaId }: { quizId: number; pesertaId: number }) => quizAdminApi.unassignWorker(quizId, pesertaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiz', quizId] }),
  });

  const isNoPhonePolicy = agenda?.no_phone_policy === 1;
  const defaultTipe = isNoPhonePolicy ? 'kelompok' : 'individu';

  const createQuizMutation = useMutation({
    mutationFn: quizApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId, 'sesi'] });
      setShowQuizForm(false);
      setQuizForm({
        nama: '',
        deskripsi: '',
        daftar_soal_id: 0,
        pos_id: 0,
        waktu_mulai: '',
        waktu_selesai: '',
      });
    },
  });

  const handleSubmitQuiz = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createQuizMutation.mutate({
      ...quizForm,
      quiz_id: quizId,
      tipe: defaultTipe,
    });
  };

  const getStatusBadge = (status: QuizSession['status']) => {
    switch (status) {
      case 'active':
        return <span className="badge-success">Aktif</span>;
      case 'completed':
        return <span className="badge-warning bg-gray-100 text-text-muted">Selesai</span>;
      default:
        return <span className="badge-warning">Nonaktif</span>;
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/agenda" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Daftar Agenda
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data agenda.
          </div>
        )}

        {agenda && (
          <>
            {/* Agenda Info */}
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <BookOpen size={24} className="text-secondary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-text">{agenda.nama}</h1>
                  {agenda.deskripsi && <p className="text-text-muted mt-1">{agenda.deskripsi}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    <span className={agenda.status === 'active' ? 'badge-success' : 'badge-warning bg-gray-100 text-text-muted'}>
                      {agenda.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isNoPhonePolicy
                        ? 'bg-warning-50 text-warning-dark'
                        : 'bg-secondary-50 text-secondary-dark'
                    }`}>
                      {isNoPhonePolicy ? <PhoneOff size={12} /> : <Phone size={12} />}
                      {isNoPhonePolicy ? 'Menerapkan No Phone Policy' : 'Tidak Menerapkan No Phone Policy'}
                    </span>
                    <span className="text-xs text-text-muted">
                      Dibuat: {new Date(agenda.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

                {/* Assigned Kelompok */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Users size={18} className="text-secondary" />
                Kelompok Terdaftar
              </h3>
              {agenda.kelompok && agenda.kelompok.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agenda.kelompok.map((k) => (
                    <Link
                      key={k.id}
                      to={`/kelompok/${k.id}`}
                      className="badge-secondary hover:bg-secondary-100 transition-colors"
                    >
                      {k.nama}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">Belum ada kelompok ditugaskan.</p>
              )}
            </div>

            {/* Assigned Workers */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Users size={18} className="text-secondary" />
                Worker Ditugaskan
              </h3>
              {agenda.assigned_workers && agenda.assigned_workers.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {agenda.assigned_workers.map((w) => (
                    <div key={w.id} className="badge-secondary flex items-center gap-2">
                      <span>{w.nama}</span>
                      <button
                        onClick={() => unassignWorkerMutation.mutate({ quizId, pesertaId: w.id })}
                        className="text-xs text-danger ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">Belum ada worker ditugaskan.</p>
              )}

              <div className="mt-4">
                <label htmlFor="worker-select" className="block text-xs font-medium text-text mb-1">Tambah Worker</label>
                <div className="flex gap-2">
                  <select id="worker-select" className="input-field text-sm" defaultValue={0}>
                    <option value={0}>Pilih worker</option>
                    {(workerList ?? []).map((w) => (
                      <option key={w.id} value={w.id}>{w.nama} ({w.email})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const sel = document.getElementById('worker-select') as HTMLSelectElement | null;
                      if (!sel) return;
                      const val = Number(sel.value);
                      if (!val) return;
                      assignWorkerMutation.mutate({ quizId, pesertaId: val });
                    }}
                    className="btn-success text-sm"
                  >Tambah</button>
                </div>
              </div>
            </div>

            {/* Sesi List */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Clock size={18} className="text-secondary" />
                  Daftar Quiz
                </h3>
                <button
                  onClick={() => setShowQuizForm(!showQuizForm)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Plus size={14} />
                  Tambah Quiz
                </button>
              </div>

              {/* Tambah Quiz Form */}
              {showQuizForm && (
                <div className="mb-4 p-4 bg-surface-alt rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-text mb-3">Tambah Quiz Baru</h4>
                  <form onSubmit={handleSubmitQuiz} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="quiz-nama" className="block text-xs font-medium text-text mb-1">Nama Sesi</label>
                        <input
                          id="quiz-nama"
                          type="text"
                          value={quizForm.nama}
                          onChange={(e) => setQuizForm({ ...quizForm, nama: e.target.value })}
                          className="input-field text-sm"
                          placeholder="Contoh: Sesi 1"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="quiz-tipe" className="block text-xs font-medium text-text mb-1">Tipe</label>
                        <div className="input-field text-sm flex items-center gap-2 bg-surface-alt">
                          {isNoPhonePolicy ? (
                            <>
                              <PhoneOff size={14} className="text-warning-dark" />
                              <span className="text-warning-dark font-medium">Kelompok</span>
                              <span className="text-xs text-text-muted">(No Phone Policy)</span>
                            </>
                          ) : (
                            <>
                              <Phone size={14} className="text-secondary" />
                              <span className="text-secondary font-medium">Individu</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="quiz-deskripsi" className="block text-xs font-medium text-text mb-1">Deskripsi Sesi</label>
                        <textarea
                          id="quiz-deskripsi"
                          value={quizForm.deskripsi}
                          onChange={(e) => setQuizForm({ ...quizForm, deskripsi: e.target.value })}
                          className="input-field text-sm min-h-[60px]"
                          placeholder="Deskripsi sesi (opsional)"
                        />
                      </div>
                      <div>
                        <label htmlFor="quiz-daftar-soal" className="block text-xs font-medium text-text mb-1">Daftar Soal</label>
                        <select
                          id="quiz-daftar-soal"
                          value={quizForm.daftar_soal_id}
                          onChange={(e) => setQuizForm({ ...quizForm, daftar_soal_id: Number(e.target.value) })}
                          className="input-field text-sm"
                          required
                        >
                          <option value={0}>Pilih Daftar Soal</option>
                          {(daftarSoalList ?? []).map((ds) => (
                            <option key={ds.id} value={ds.id}>
                              {ds.nama} ({ds.kategori})
                            </option>
                          ))}
                        </select>
                        {(!daftarSoalList || daftarSoalList.length === 0) && (
                          <p className="text-xs text-warning-dark mt-1">Belum ada daftar soal. Buat daftar soal terlebih dahulu.</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="quiz-pos" className="block text-xs font-medium text-text mb-1">Pos</label>
                        <select
                          id="quiz-pos"
                          value={quizForm.pos_id}
                          onChange={(e) => setQuizForm({ ...quizForm, pos_id: Number(e.target.value) })}
                          className="input-field text-sm"
                          required
                        >
                          <option value={0}>Pilih Pos</option>
                          {(posList ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama}
                            </option>
                          ))}
                        </select>
                        {(!posList || posList.length === 0) && (
                          <p className="text-xs text-warning-dark mt-1">Belum ada pos tersedia.</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="quiz-waktu-mulai" className="block text-xs font-medium text-text mb-1">Waktu Mulai</label>
                        <input
                          id="quiz-waktu-mulai"
                          type="datetime-local"
                          value={quizForm.waktu_mulai}
                          onChange={(e) => setQuizForm({ ...quizForm, waktu_mulai: e.target.value })}
                          className="input-field text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="quiz-waktu-selesai" className="block text-xs font-medium text-text mb-1">Waktu Selesai</label>
                        <input
                          id="quiz-waktu-selesai"
                          type="datetime-local"
                          value={quizForm.waktu_selesai}
                          onChange={(e) => setQuizForm({ ...quizForm, waktu_selesai: e.target.value })}
                          className="input-field text-sm"
                          required
                        />
                      </div>
                    </div>
                    {createQuizMutation.isError && (
                      <div className="flex items-center gap-2 p-2 bg-danger-50 text-danger rounded text-xs">
                        <AlertCircle size={14} />
                        Gagal menambah quiz.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={createQuizMutation.isPending || !daftarSoalList?.length || !posList?.length}
                        className="btn-success text-sm"
                      >
                        {createQuizMutation.isPending ? 'Memproses...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuizForm(false)}
                        className="btn-ghost text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sesi Table */}
              {quizList && quizList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Nama</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Pos</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Password</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Status</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizList.map((quiz) => (
                        <tr
                          key={quiz.id}
                          className="border-b border-border-light last:border-0 hover:bg-surface-hover cursor-pointer"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/quiz/${quiz.id}`);
                            }
                          }}
                          onClick={() => navigate(`/quiz/${quiz.id}`)}
                        >
                          <td className="py-2.5 px-2 font-medium text-text">{quiz.nama}</td>
                          <td className="py-2.5 px-2 text-text-muted">{quiz.pos_nama ?? '-'}</td>
                          <td className="py-2.5 px-2">
                            <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded border border-border font-mono">
                              {quiz.password ?? '-'}
                            </code>
                          </td>
                          <td className="py-2.5 px-2">{getStatusBadge(quiz.status)}</td>
                          <td className="py-2.5 px-2 text-xs text-text-muted">
                            {new Date(quiz.waktu_mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada quiz. Tambahkan quiz pertama.</p>
              )}
            </div>

            {/* Daftar Collection */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Camera size={18} className="text-secondary" />
                  Daftar Collection
                </h3>
                <span className="text-xs text-text-muted">Klik salah satu collection untuk melihat foto yang dikirim peserta</span>
              </div>

              {quizList && quizList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Nama Collection</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Pos</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Waktu</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Foto Terupload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizList.map((quiz, index) => {
                        const photoQuery = photoLeaderboardQueries[index];
                        const photoData = photoQuery?.data ?? [];
                        const totalPoin = photoData.reduce((sum, entry) => sum + (entry.total_poin ?? 0), 0);
                        const totalUploads = photoData.reduce((sum, entry) => sum + (entry.submission_count ?? 0), 0);

                        return (
                          <tr
                            key={quiz.id}
                            className="border-b border-border-light last:border-0 hover:bg-surface-hover cursor-pointer"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/collection/${quiz.id}`);
                              }
                            }}
                            onClick={() => navigate(`/collection/${quiz.id}`)}
                          >
                            <td className="py-2.5 px-2 font-medium text-text">{quiz.nama}</td>
                            <td className="py-2.5 px-2 text-text-muted">{quiz.pos_nama ?? '-'}</td>
                            <td className="py-2.5 px-2 text-xs text-text-muted">
                              {new Date(quiz.waktu_mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-2.5 px-2 text-text-muted">
                              {(() => {
                                if (photoQuery?.isLoading) return 'Memuat...';
                                if (photoQuery?.isError) return 'Error';
                                return `${totalUploads} foto`;
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada collection foto untuk sesi ini.</p>
              )}
            </div>

            {/* Leaderboard Agenda */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-accent" />
                Leaderboard Agenda Ini
              </h3>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Rank</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Nama</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Kelompok</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                        <tr key={entry.rank} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                          <td className="py-2.5 px-2">
                            <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                              entry.rank === 1
                                ? 'bg-warning-50 text-warning-dark'
                                : entry.rank === 2
                                ? 'bg-gray-100 text-text-secondary'
                                : entry.rank === 3
                                ? 'bg-accent-50 text-accent-dark'
                                : 'bg-surface-alt text-text-muted'
                            }`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-medium text-text">{entry.nama}</td>
                          <td className="py-2.5 px-2 text-text-muted">{entry.kelompok_nama || '-'}</td>
                          <td className="py-2.5 px-2 text-accent font-bold">{entry.skor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada data leaderboard.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
