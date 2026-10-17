import React, { useState, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { renderFormattedMusicContent } from './SetlistView';
import { ConfirmModal } from '../common/ConfirmModal';

interface TonalGroupingViewProps {
  onSelectNote: (note: SongNote) => void;
  onDeleteNote: (id: string) => void;
  notation: NotationSystem;
}

export function TonalGroupingView({ onSelectNote, onDeleteNote, notation }: TonalGroupingViewProps) {
  const [notes, setNotes] = useState<SongNote[]>([]);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState<'trumpet' | 'keyboard'>('trumpet');

  // 1. Recarga Reactiva al Montar la Vista o al conmutar la notación global
  useEffect(() => {
    const freshNotes = NoteStorageService.getAll();
    setNotes(freshNotes);
  }, [notation]);

  // 2. Agrupación Dinámica según el filtro de instrumento seleccionado (Trompeta o Teclado)
  const groupedNotes = useMemo(() => {
    return notes.reduce((acc, note) => {
      const key = instrumentFilter === 'keyboard' 
        ? (note.concertKey || 'Sin tono') 
        : (note.detectedKey || 'Sin tono');
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    }, {} as Record<string, SongNote[]>);
  }, [notes, instrumentFilter]);

  return (
    <div className="w-full mx-auto p-4 md:p-6 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-[#202124] dark:text-[#E8EAED]">Tonalidades</h1>

        {/* Filtro de Instrumento (Trompeta / Teclado) */}
        <div className="flex items-center bg-gray-100 dark:bg-[#28292A] p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
          <button
            type="button"
            onClick={() => setInstrumentFilter('trumpet')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
              instrumentFilter === 'trumpet'
                ? 'bg-white dark:bg-[#1F1F1F] text-amber-700 dark:text-amber-400 shadow-sm border border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🎺</span>
            <span>Trompeta</span>
          </button>
          <button
            type="button"
            onClick={() => setInstrumentFilter('keyboard')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
              instrumentFilter === 'keyboard'
                ? 'bg-white dark:bg-[#1F1F1F] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🎹</span>
            <span>Teclado</span>
          </button>
        </div>
      </div>
      
      {Object.keys(groupedNotes).length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-center py-12">
          No hay notas guardadas aún. Toca el botón + para crear una.
        </div>
      )}

      {Object.entries(groupedNotes).sort((a, b) => a[0].localeCompare(b[0])).map(([rawKey, groupNotes]) => {
        const displayKey = formatKeyName(rawKey, notation);
        const altKeySample = instrumentFilter === 'trumpet'
          ? (groupNotes[0]?.concertKey ? formatKeyName(groupNotes[0].concertKey, notation) : null)
          : (groupNotes[0]?.detectedKey ? formatKeyName(groupNotes[0].detectedKey, notation) : null);

        return (
          <div key={rawKey} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 flex flex-wrap items-baseline gap-2.5">
              <span>
                {displayKey === 'Sin tono' 
                  ? 'Sin tono' 
                  : (instrumentFilter === 'trumpet' ? `🎺 Trompeta: ${displayKey}` : `🎹 Teclado: ${displayKey}`)}
              </span>
              {altKeySample && altKeySample !== 'Sin tono' && (
                <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full border ${
                  instrumentFilter === 'trumpet'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40'
                }`}>
                  {instrumentFilter === 'trumpet' ? `🎹 Teclado: ${altKeySample}` : `🎺 Trompeta: ${altKeySample}`}
                </span>
              )}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({groupNotes.length} {groupNotes.length === 1 ? 'canción' : 'canciones'})
              </span>
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
                          e.stopPropagation(); // Evita abrir la canción al tocar el basurero
                          setSongToDelete(note.id);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Eliminar canción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm flex-1 overflow-hidden font-mono whitespace-pre-wrap">
                    {renderFormattedMusicContent(note.content)}
                  </div>
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center">
                    <span className="truncate">
                      {instrumentFilter === 'trumpet' ? (
                        note.concertKey && note.concertKey !== 'Sin tono' ? `🎹 ${formatKeyName(note.concertKey, notation)}` : ''
                      ) : (
                        note.detectedKey && note.detectedKey !== 'Sin tono' ? `🎺 ${formatKeyName(note.detectedKey, notation)}` : ''
                      )}
                    </span>
                    <span className="shrink-0">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal de Confirmación: Eliminar Canción */}
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
