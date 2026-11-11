import { Trash2 } from 'lucide-react';
import styles from './Composer.module.css';

interface VoiceNoteBarProps {
  audioUrl: string;
  onRemove: () => void;
}

/**
 * Renders the audio player + remove button for a recorded or uploaded voice note.
 */
export function VoiceNoteBar({ audioUrl, onRemove }: VoiceNoteBarProps) {
  return (
    <div className={styles.audioPlayerRow}>
      <audio src={audioUrl} controls className={styles.audioPlayerElement} />
      <button
        type="button"
        onClick={onRemove}
        className={styles.audioRemoveButton}
        aria-label="Remove voice note"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}