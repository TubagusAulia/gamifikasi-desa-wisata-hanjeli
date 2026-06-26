import { useState } from 'react';
import { X, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import type { Soal } from '@/types';

interface Props {
  soalList: Soal[];
  sesiNama: string;
  posNama: string;
  onClose: () => void;
  onSubmit: (answers: { soal_id: number; jawaban: string }[]) => Promise<void>;
}

export function QuizModal({ soalList, sesiNama, posNama, onClose, onSubmit }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ skor: number; total: number } | null>(null);

  if (soalList.length === 0) return null;

  const question = soalList[currentQ];
  const total = soalList.length;

  const handleSelect = (jawaban: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: jawaban }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const formatted = Object.entries(answers).map(([soalId, jawaban]) => ({
      soal_id: parseInt(soalId),
      jawaban,
    }));
    try {
      await onSubmit(formatted);
      setResult({ skor: formatted.length, total });
    } catch {
      setResult({ skor: 0, total });
    }
    setSubmitting(false);
  };

  const options = [question.opsi_a, question.opsi_b, question.opsi_c, question.opsi_d].filter(Boolean);
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-bold text-text">{sesiNama}</h3>
            <p className="text-xs text-text-muted">{posNama}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover">
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-success-50 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-success">{result.skor}/{result.total}</span>
            </div>
            <h4 className="text-xl font-bold text-text">Quiz Selesai!</h4>
            <p className="text-text-muted mt-1">Terima kasih sudah mengerjakan.</p>
            <button onClick={onClose} className="btn-success mt-6 w-full">
              Tutup
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between text-sm text-text-muted mb-2">
                <span>Soal {currentQ + 1} dari {total}</span>
                <span>{Math.round(((currentQ + 1) / total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentQ + 1) / total) * 100}%` }} />
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-semibold text-lg text-text">{question.pertanyaan}</h4>
              <div className="mt-4 space-y-2">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(labels[idx])}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      answers[question.id] === labels[idx]
                        ? 'border-primary bg-primary-50'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {answers[question.id] === labels[idx] ? (
                      <CheckCircle size={20} className="text-primary shrink-0" />
                    ) : (
                      <Circle size={20} className="text-text-muted shrink-0" />
                    )}
                    <span className="text-sm font-medium text-text-muted">{labels[idx]}.</span>
                    <span className="text-sm text-text">{opt}</span>
                  </button>
                ))}
              </div>

              {/* Show explanation after answering */}
              {answers[question.id] && question.penjelasan_jawaban_benar && (
                <div className="mt-4 p-3 bg-primary-50 border border-primary/20 rounded-lg">
                  <p className="text-xs font-semibold text-primary-dark mb-1">Penjelasan:</p>
                  <p className="text-sm text-text-secondary">{question.penjelasan_jawaban_benar}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
                disabled={currentQ === 0}
                className="btn-ghost text-sm"
              >
                Sebelumnya
              </button>
              {currentQ < total - 1 ? (
                <button
                  onClick={() => setCurrentQ((c) => c + 1)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  Selanjutnya <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length < total}
                  className="btn-accent text-sm"
                >
                  {submitting ? 'Mengirim...' : 'Submit'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
