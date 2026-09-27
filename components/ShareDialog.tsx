import React, { useEffect, useState } from 'react';
import { Download, Image as ImageIcon, MessageSquareText } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { renderQuestionImage } from '../lib/shareImage';
import type { Question, VibeId } from '../shared/vibes';

interface ShareDialogProps {
  question: Question | null;
  vibe: VibeId;
  onClose: () => void;
  onShareText: (q: Question) => void;
  onToast: (message: string) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ question, vibe, onClose, onShareText, onToast }) => {
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!question) return;
    let url: string | null = null;
    let cancelled = false;
    renderQuestionImage(question, vibe)
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => onToast("Couldn't create the image"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [question, vibe, onToast]);

  const file = image ? new File([image.blob], 'question.png', { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const shareImage = async () => {
    if (!image || !file) return;
    if (canShareFile) {
      try {
        await navigator.share({ files: [file] });
        onClose();
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') onToast("Couldn't share the image");
      }
      return;
    }
    const a = document.createElement('a');
    a.href = image.url;
    a.download = 'question.png';
    a.click();
    onToast('Image downloaded');
  };

  return (
    <Modal open={!!question} onClose={onClose} title="Share this question">
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[4/5]">
        {image ? (
          <img src={image.url} alt={question ? `Card: ${question.text}` : ''} className="h-full w-full object-cover animate-fade-in-up" />
        ) : (
          <div className="h-full w-full animate-pulse" aria-label="Creating image" />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Button onClick={shareImage} disabled={!image}>
          {canShareFile ? <ImageIcon className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {canShareFile ? 'Share image' : 'Download image'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (question) onShareText(question);
            onClose();
          }}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden />
          Share as text
        </Button>
      </div>
    </Modal>
  );
};
