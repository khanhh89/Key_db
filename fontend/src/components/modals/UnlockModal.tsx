import type { AppItem, Language } from '../../types';
import { getTranslation } from '../../data/translations';

interface UnlockModalProps {
  modal: AppItem;
  lang: Language;
  tasks: boolean[];
  toggleTask: (i: number) => void;
  closeModal: () => void;
  handleUnlock: () => void;
}

export function UnlockModal({
  modal,
  lang,
  tasks,
  toggleTask,
  closeModal,
  handleUnlock
}: UnlockModalProps) {
  const t = getTranslation(lang).unlock;
  const done = tasks.filter(Boolean).length;

  return (
    <div className="modal show" onClick={closeModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="close"
          onClick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="modal-title">
          {t.title}
        </div>

        <p>
          {t.stepTitle} <b>{modal.name}</b>
        </p>

        <div className="progress-text">
          <span>
            {t.progress}
          </span>
          <b>
            {done} / 5 ({done * 20}%)
          </b>
        </div>

        <div className="progress">
          <i style={{ width: `${done * 20}%` }} />
        </div>

        <div>
          {tasks.map((v, i) => (
            <button
              key={i}
              className={'task ' + (v ? 'done' : '')}
              onClick={() => toggleTask(i)}
            >
              <span>
                {v ? '✓' : '○'}{' '}
                {lang === 'vi'
                  ? `Hoàn thành bước xác minh ${i + 1}`
                  : `Complete verification step ${i + 1}`}
              </span>
              <small>
                {v
                  ? lang === 'vi'
                    ? 'Đã duyệt'
                    : 'Verified'
                  : lang === 'vi'
                  ? 'Chạm xác minh'
                  : 'Tap to verify'}
              </small>
            </button>
          ))}
        </div>

        <button
          className="final"
          disabled={done < 5}
          onClick={handleUnlock}
        >
          {modal.name.includes('PUBG') || modal.name.includes('Delta Force')
            ? t.unlockFreeBtn
            : t.unlockDirectBtn}
        </button>
      </div>
    </div>
  );
}
