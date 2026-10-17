import React, { useState, useMemo, useEffect } from 'react';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { Music, Trash2, Plus } from 'lucide-react';

interface TonalGroupingViewProps {
  notes?: SongNote[];
  activeInstrument?: 'trumpet' | 'keyboard';
  notationStyle?: 'ENGLISH' | 'LATIN';
  onSelectSong?: (song: SongNote) => void;
  onCreateNewSong?: () => void;
  onRefreshNotes?: () => void;
  // Compatibilidad con invocación previa
  onSelectNote?: (note: SongNote) => void;
  onDeleteNote?: (id: string) => void;
  notation?: NotationSystem;
}

export const TonalGroupingView: React.FC<TonalGroupingViewProps> = ({
  notes: propNotes,
  activeInstrument: propActiveInstrument,
  notationStyle,
  onSelectSong,
  onCreateNewSong,
  onRefreshNotes,
  onSelectNote,
  onDeleteNote,
  notation = 'en'
}) => {
  const [internalNotes, setInternalNotes] = useState<SongNote[]>([]);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState<'trumpet' | 'keyboard'>(
    propActiveInstrument || 'trumpet'
  );

  // Sincronizar instrumento si cambia por props
  useEffect(() => {
    if (propActiveInstrument) {
      setInstrumentFilter(propActiveInstrument);
    }
  }, [propActiveInstrument]);

  // Recarga reactiva al montar la vista o cambiar notación
  useEffect(() => {
    const freshNotes = NoteStorageService.getAll();
    setInternalNotes(freshNotes);
  }, [notation]);

  const allNotes = propNotes && propNotes.length > 0 ? propNotes : internalNotes;

  const handleSelect = (song: SongNote) => {
    if (onSelectSong) {
      onSelectSong(song);
    } else if (onSelectNote) {
      onSelectNote(song);
    }
  };

  const handleDeleteConfirm = () => {
    if (songToDelete) {
      NoteStorageService.delete(songToDelete);
      onDeleteNote?.(songToDelete);
      setInternalNotes(NoteStorageService.getAll());
      setSongToDelete(null);
      onRefreshNotes?.();
    }
  };

  // 1. Agrupar dinámicamente las canciones por la tonalidad correspondiente al instrumento activo
  const groupedNotes = useMemo(() => {
    return allNotes.reduce<Record<string, SongNote[]>>((acc, note) => {
      // Si el instrumento activo es teclado, agrupamos por concertKey; si es trompeta, por detectedKey
      const rawKey = instrumentFilter === 'keyboard'
        ? (note.concertKey || note.detectedKey || 'Sin tono')
        : (note.detectedKey || 'Sin tono');

      const key = (rawKey || 'Sin tono').trim() || 'Sin tono';
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    }, {});
  }, [allNotes, instrumentFilter]);

  const toneKeys = Object.keys(groupedNotes).sort((a, b) => a.localeCompare(b));

  return (
    <div className="w-full max-w-5xl mx-auto p-3 md:p-6 pb-28 animate-in fade-in duration-150">
      {/* Cabecera / Barra de búsqueda y acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <span>{instrumentFilter === 'trumpet' ? '🎺' : '🎹'}</span>
            <span>Tonalidades ({toneKeys.length})</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Organizadas automáticamente en tarjetas estilo Keep
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Conmutador de Instrumento (Trompeta / Teclado) */}
          <div className="flex items-center bg-gray-100 dark:bg-[#28292A] p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setInstrumentFilter('trumpet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                instrumentFilter === 'trumpet'
                  ? 'bg-white dark:bg-[#1F1F1F] text-amber-700 dark:text-amber-400 shadow-xs border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>🎺</span>
              <span>Trompeta</span>
            </button>
            <button
              type="button"
              onClick={() => setInstrumentFilter('keyboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                instrumentFilter === 'keyboard'
                  ? 'bg-white dark:bg-[#1F1F1F] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>🎹</span>
              <span>Teclado</span>
            </button>
          </div>

          {onCreateNewSong && (
            <button
              type="button"
              onClick={onCreateNewSong}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Nueva Canción</span>
            </button>
          )}
        </div>
      </div>

      {/* Si no hay canciones creadas */}
      {allNotes.length === 0 ? (
        <div className="text-center py-16 bg-neutral-100 dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-6">
          <Music className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-700 dark:text-neutral-200 mb-1">
            Tu biblioteca está vacía
          </h3>
          <p className="text-xs text-neutral-500 mb-4 max-w-xs mx-auto">
            Toca en "+ Nueva Canción" para agregar alabanzas y se agruparán automáticamente por tono.
          </p>
          {onCreateNewSong && (
            <button
              type="button"
              onClick={onCreateNewSong}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Nueva Canción</span>
            </button>
          )}
        </div>
      ) : (
        /* GRID ESTILO GOOGLE KEEP (2 columnas en celular / 3 en desktop) */
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
          {toneKeys.map((toneName) => {
            const songsInKey = groupedNotes[toneName];
            const displayTone = formatKeyName(toneName, notation);

            return (
              <div
                key={toneName}
                className="bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* ENCABEZADO DEL TONO (RE, DO, SOL#, etc.) */}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2.5 sm:mb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="font-extrabold text-xs sm:text-sm md:text-base text-amber-600 dark:text-amber-400 tracking-wide uppercase truncate">
                      {displayTone}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                      {songsInKey.length} {songsInKey.length === 1 ? 'canción' : 'canciones'}
                    </span>
                  </div>

                  {/* LISTA DE CANCIONES DENTRO DEL CUADRO DEL TONO */}
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {songsInKey.map((song) => {
                      // Obtener vista previa de las notas (3 primeras líneas)
                      const previewLines = (song.content || '')
                        .split('\n')
                        .filter((line) => line.trim().length > 0)
                        .slice(0, 3)
                        .join('\n');

                      return (
                        <div
                          key={song.id}
                          onClick={() => handleSelect(song)}
                          className="group relative p-2 sm:p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer border border-neutral-200/50 dark:border-neutral-800/50"
                        >
                          {/* Título de la Canción */}
                          <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
                            <h4 className="font-bold text-[11px] sm:text-xs md:text-sm text-neutral-800 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 truncate flex-1">
                              {song.title || 'Canción sin título'}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSongToDelete(song.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
                              title="Eliminar canción"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Vista Previa de Notas en Fuente Monoespaciada Estilo Partitura */}
                          <p className="font-mono text-[10px] sm:text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-3 whitespace-pre-wrap break-words">
                            {previewLines || 'Sin notas escritas...'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación para eliminar sin usar avisos del navegador */}
      <ConfirmModal
        isOpen={!!songToDelete}
        title="Eliminar canción"
        onCancel={() => setSongToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
