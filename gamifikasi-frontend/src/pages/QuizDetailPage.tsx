import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, daftarSoalApi, posApi, sesiApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Clock, MapPin, Plus, Loader2, AlertCircle, ArrowLeft, Trophy, Users, Play } from 'lucide-react';
import type { Sesi } from '@/types';

export function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = Number(id);
  const [showSesiForm, setShowSesiForm] = useState(false);
  const [sesiForm, setSesiForm] = useState({
    nama: '',
    daftar_soal_id: 0,
    pos_id: 0,
    tipe: 'individu' as 'individu' | 'kelompok',
    waktu_mulai: '',
    waktu_selesai: '',
  });
  const queryClient = useQueryClient();

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizApi.getById(quizId),
    enabled: !!quizId,
  });

  const sesiList = quiz?.sesi;

  const { data: daftarSoalList } = useQuery({
    queryKey: ['daftar-soal'],
    queryFn: daftarSoalApi.getAll,
  });

  const { data: posList } = useQuery({
    queryKey: ['pos'],
    queryFn: posApi.getAll,
  });

  const createSesiMutation = useMutation({
    mutationFn: sesiApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId, 'sesi'] });
      setShowSesiForm(false);
      setSesiForm({
        nama: '',
        daftar_soal_id: 0,
        pos_id: 0,
        tipe: 'individu',
        waktu_mulai: '',
        waktu_selesai: '',
      });
    },
  });

  const handleSubmitSesi = (e: React.FormEvent) => {
    e.preventDefault();
    createSesiMutation.mutate({
      ...sesiForm,
      quiz_id: quizId,
    });
  };

  const getStatusBadge = (status: Sesi['status']) => {
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
        <Link to="/quiz" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Daftar Quiz
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data quiz.
          </div>
        )}

        {quiz && (
          <>
            {/* Quiz Info */}
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <BookOpen size={24} className="text-secondary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-text">{quiz.nama}</h1>
                  {quiz.deskripsi && <p className="text-text-muted mt-1">{quiz.deskripsi}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    <span className={quiz.status === 'active' ? 'badge-success' : 'badge-warning bg-gray-100 text-text-muted'}>
                      {quiz.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="text-xs text-text-muted">
                      Dibuat: {new Date(quiz.created_at).toLocaleDateString('id-ID')}
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
              {quiz.kelompok && quiz.kelompok.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {quiz.kelompok.map((k) => (
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

            {/* Sesi List */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Clock size={18} className="text-secondary" />
                  Daftar Sesi
                </h3>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/leaderboard/quiz/${quizId}`}
                    className="btn-accent text-sm flex items-center gap-1"
                  >
                    <Trophy size={14} />
                    Leaderboard
                  </Link>
                  <button
                    onClick={() => setShowSesiForm(!showSesiForm)}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Tambah Sesi
                  </button>
                </div>
              </div>

              {/* Tambah Sesi Form */}
              {showSesiForm && (
                <div className="mb-4 p-4 bg-surface-alt rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-text mb-3">Tambah Sesi Baru</h4>
                  <form onSubmit={handleSubmitSesi} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text mb-1">Nama Sesi</label>
                        <input
                          type="text"
                          value={sesiForm.nama}
                          onChange={(e) => setSesiForm({ ...sesiForm, nama: e.target.value })}
                          className="input-field text-sm"
                          placeholder="Contoh: Sesi 1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text mb-1">Tipe</label>
                        <select
                          value={sesiForm.tipe}
                          onChange={(e) => setSesiForm({ ...sesiForm, tipe: e.target.value as 'individu' | 'kelompok' })}
                          className="input-field text-sm"
                        >
                          <option value="individu">Individu</option>
                          <option value="kelompok">Kelompok</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text mb-1">Daftar Soal</label>
                        <select
                          value={sesiForm.daftar_soal_id}
                          onChange={(e) => setSesiForm({ ...sesiForm, daftar_soal_id: Number(e.target.value) })}
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
                        <label className="block text-xs font-medium text-text mb-1">Pos</label>
                        <select
                          value={sesiForm.pos_id}
                          onChange={(e) => setSesiForm({ ...sesiForm, pos_id: Number(e.target.value) })}
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
                        <label className="block text-xs font-medium text-text mb-1">Waktu Mulai</label>
                        <input
                          type="datetime-local"
                          value={sesiForm.waktu_mulai}
                          onChange={(e) => setSesiForm({ ...sesiForm, waktu_mulai: e.target.value })}
                          className="input-field text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text mb-1">Waktu Selesai</label>
                        <input
                          type="datetime-local"
                          value={sesiForm.waktu_selesai}
                          onChange={(e) => setSesiForm({ ...sesiForm, waktu_selesai: e.target.value })}
                          className="input-field text-sm"
                          required
                        />
                      </div>
                    </div>
                    {createSesiMutation.isError && (
                      <div className="flex items-center gap-2 p-2 bg-danger-50 text-danger rounded text-xs">
                        <AlertCircle size={14} />
                        Gagal menambah sesi.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={createSesiMutation.isPending || !daftarSoalList?.length || !posList?.length}
                        className="btn-success text-sm"
                      >
                        {createSesiMutation.isPending ? 'Memproses...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSesiForm(false)}
                        className="btn-ghost text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sesi Table */}
              {sesiList && sesiList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Nama</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Tipe</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Pos</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Status</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Waktu</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesiList.map((sesi) => (
                        <tr key={sesi.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                          <td className="py-2.5 px-2 font-medium text-text">{sesi.nama}</td>
                          <td className="py-2.5 px-2">
                            <span className={sesi.tipe === 'individu' ? 'badge-secondary' : 'badge-accent'}>
                              {sesi.tipe}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-text-muted">{sesi.pos?.nama ?? '-'}</td>
                          <td className="py-2.5 px-2">{getStatusBadge(sesi.status)}</td>
                          <td className="py-2.5 px-2 text-xs text-text-muted">
                            {new Date(sesi.waktu_mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2.5 px-2">
                            <Link to={`/sesi/${sesi.id}`} className="text-secondary text-xs font-medium hover:underline">
                              Lihat
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada sesi. Tambahkan sesi pertama.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
