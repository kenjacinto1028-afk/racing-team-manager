import { useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';

/** Save a copy of the game to a file, or load one back. */
export function SaveBackup({ compact = false }: { compact?: boolean }) {
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const download = () => {
    try {
      const blob = new Blob([exportSave()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const day = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `racing-team-save-${day}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNote({ text: 'Backup downloaded.', bad: false });
    } catch {
      setNote({ text: 'Could not make the backup.', bad: true });
    }
  };

  const load = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = importSave(String(reader.result ?? ''));
      setNote(r.ok ? { text: 'Save loaded.', bad: false } : { text: r.reason, bad: true });
    };
    reader.onerror = () => setNote({ text: 'Could not read that file.', bad: true });
    reader.readAsText(file);
  };

  return (
    <div className={'save-backup' + (compact ? ' compact' : '')}>
      <div className="save-backup-buttons">
        <button className="btn btn-ghost btn-sm" onClick={download}>Save backup ⤓</button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Load backup ⤒</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
            e.target.value = '';
          }}
        />
      </div>
      {note && <div className={'save-note ' + (note.bad ? 'bad' : 'good')} role="status">{note.text}</div>}
    </div>
  );
}
