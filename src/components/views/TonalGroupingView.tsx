import React, { useState, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { ConfirmModal } from '../common/ConfirmModal';

interface TonalGroupingViewProps {
  onSelectNote: (note: SongNote) => void;
  onDeleteNote: (id: string) => void;
  notation: NotationSystem;
}

export function TonalGroupingView({ onSelectNote, onDeleteNote, notation }: TonalGroupingViewProps) {
  const [notes, setNotes] = useState<SongNote[]>([]);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);

  // 1. Recarga Reactiva al Montar la Vista
  useEffect(() => {
    const freshNotes = NoteStorageService.getAll();
    setNotes(freshNotes);
  }, []);

  // 2. Agrupación Estricta usando la propiedad note.detectedKey guardada
  const groupedNotes = useMemo(() => {
    return notes.reduce((acc, note) => {
      const key = note.detectedKey || 'Indeterminada';
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    }, {} as Record<string, SongNote[]>);
  }, [notes]);

  return (
    <div className="w-full mx-auto p-4 md:p-6 pb-32">
      <h1 className="text-3xl font-bold text-[#202124] dark:text-[#E8EAED] mb-8">Tonalidades</h1>
      
      {Object.keys(groupedNotes).length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-center py-12">
          No hay notas guardadas aún. Toca el botón + para crear una.
        </div>
      )}

      {Object.entries(groupedNotes).sort((a, b) => a[0].localeCompare(b[0])).map(([rawKey, groupNotes]) => {
        const displayKey = formatKeyName(rawKey, notation);
        return (
          <div key={rawKey} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-baseline gap-2">
              Tono {displayKey} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({groupNotes.length} {groupNotes.length === 1 ? 'canción' : 'canciones'})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {groupNotes.map(note => (
                <div 
                  key={note.id} 
                  className="group relative bg-white dark:bg-[#28292A] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col h-40"
                  onClick={() => onSelectNote(note)}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg text-[#202124] dark:text-[#E8EAED] truncate flex-1">
                      {note.title || 'Sin título'}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {note.activeInstrument === 'trumpet' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                          🎺 Trompeta
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                          🎹 Teclado
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSongToDelete(note.id);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Eliminar canción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm flex-1 overflow-hidden font-mono whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal: Confirmar Eliminación de Canción */}
      <ConfirmModal
        isOpen={!!songToDelete}
        title="Eliminar canción"
        onCancel={() => setSongToDelete(null)}
        onConfirm={() => {
          if (songToDelete) {
            NoteStorageService.delete(songToDelete);
            onDeleteNote(songToDelete);
            setNotes(NoteStorageService.getAll());
            setSongToDelete(null);
          }
        }}
      />
    </div>
  );
}
