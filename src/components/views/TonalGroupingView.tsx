import React, { useState } from 'react';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { ConfirmModal } from '../common/ConfirmModal';
import { Music, Trash2, Plus, ArrowLeft, Layers } from 'lucide-react';

interface TonalGroupingViewProps {
  notes?: SongNote[];
  activeInstrument?: 'trumpet' | 'keyboard';
  notationStyle?: 'ENGLISH' | 'LATIN';
  onSelectSong?: (song: SongNote) => void;
  onCreateNewSong?: () => void;
  onRefreshNotes?: () => void;
  // Aliases de compatibilidad con App.tsx
  onSelectNote?: (note: SongNote) => void;
  onDeleteNote?: (id: string) => void;
  notation?: string;
}

export const TonalGroupingView: React.FC<TonalGroupingViewProps> = ({
  notes: propNotes,
  activeInstrument = 'trumpet',
  notationStyle: propNotationStyle,
  onSelectSong: propOnSelectSong,
  onCreateNewSong,
  onRefreshNotes,
  onSelectNote,
  onDeleteNote,
  notation,
}) => {
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [selectedToneGroup, setSelectedToneGroup] = useState<string | null>(null);

  const notes = propNotes ?? NoteStorageService.getAll();
  const notationStyle: 'ENGLISH' | 'LATIN' = propNotationStyle ?? (notation === 'natural' ? 'LATIN' : 'ENGLISH');
  const onSelectSong = propOnSelectSong || onSelectNote || (() => {});

  // 1. Agrupar canciones por la tonalidad activa
  const groupedNotes = notes.reduce<Record<string, { primaryKey: string; secondaryKey: string; songs: SongNote[] }>>((acc, note) => {
    const keyInfo = KeyDetector.detectKey(note.content || '', notationStyle, note.activeInstrument || 'keyboard');

    // Determinar tono primario y secundario según el instrumento activo
    const primaryKey = activeInstrument === 'trumpet' ? keyInfo.trumpetKey : keyInfo.concertKey;
    const secondaryKey = activeInstrument === 'trumpet' ? keyInfo.concertKey : keyInfo.trumpetKey;

    const groupKey = primaryKey || 'Sin tono';

    if (!acc[groupKey]) {
      acc[groupKey] = {
        primaryKey: groupKey,
        secondaryKey: secondaryKey || 'Sin tono',
        songs: []
      };
    }
    acc[groupKey].songs.push(note);
    return acc;
  }, {});

  const toneKeys = Object.keys(groupedNotes);

  const handleDeleteConfirm = () => {
    if (songToDelete) {
      NoteStorageService.delete(songToDelete);
      onDeleteNote?.(songToDelete);
      setSongToDelete(null);
      onRefreshNotes?.();
    }
  };

  // VISTA ENFOCADA / DETALLE DE UNA TONALIDAD SELECCIONADA
  if (selectedToneGroup && groupedNotes[selectedToneGroup]) {
    const currentGroup = groupedNotes[selectedToneGroup];

    return (
      <div className="w-full max-w-5xl mx-auto p-3 md:p-6 pb-24 animate-fade-in">
        {/* Botón Volver y Cabecera de Tonalidad */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setSelectedToneGroup(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver a todas las tonalidades</span>
          </button>

          {onCreateNewSong && (
            <button
              type="button"
              onClick={onCreateNewSong}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Nueva Canción</span>
            </button>
          )}
        </div>

        {/* Encabezado Principal del Tono Seleccionado */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">
                {activeInstrument === 'trumpet' ? '🎺' : '🎹'}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                {currentGroup.primaryKey}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span>Equivalencia en {activeInstrument === 'trumpet' ? 'Teclado' : 'Trompeta'}:</span>
              <span className="font-bold text-neutral-700 dark:text-neutral-200">
                {activeInstrument === 'trumpet' ? '🎹' : '🎺'} {currentGroup.secondaryKey}
              </span>
            </p>
          </div>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            {currentGroup.songs.length} {currentGroup.songs.length === 1 ? 'canción en este tono' : 'canciones en este tono'}
          </span>
        </div>

        {/* Lista Desplegada de Canciones de la Tonalidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentGroup.songs.map((song) => (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm md:text-base text-neutral-800 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                  {song.title || 'Canción sin título'}
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSongToDelete(song.id);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  title="Eliminar canción"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-4 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                {song.content || 'Sin notas escritas...'}
              </p>
            </div>
          ))}
        </div>

        <ConfirmModal
          isOpen={!!songToDelete}
          title="Eliminar canción"
          onCancel={() => setSongToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  }

  // VISTA GENERAL EN GRID (ESTILO GOOGLE KEEP)
  return (
    <div className="w-full max-w-5xl mx-auto p-3 md:p-6 pb-24">
      {/* Encabezado Superior */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Layers className="text-amber-500" size={20} />
            <span>Tonalidades ({toneKeys.length})</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Toca en cualquier recuadro para ver sus canciones
          </p>
        </div>

        {onCreateNewSong && (
          <button
            type="button"
            onClick={onCreateNewSong}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Nueva Canción</span>
          </button>
        )}
      </div>

      {notes.length === 0 ? (
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
        /* GRID ESTILO GOOGLE KEEP PROFESIONAL */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
          {toneKeys.map((toneGroupKey) => {
            const group = groupedNotes[toneGroupKey];

            return (
              <div
                key={toneGroupKey}
                onClick={() => setSelectedToneGroup(toneGroupKey)}
                className="group bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800/90 hover:border-amber-500/50 dark:hover:border-amber-500/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* CABECERA DUAL DEL TONO (Trompeta al frente | Teclado al lado) */}
                  <div className="pb-2.5 mb-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-sm md:text-base text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        {activeInstrument === 'trumpet' ? '🎺' : '🎹'} {group.primaryKey}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                        | {activeInstrument === 'trumpet' ? '🎹' : '🎺'} {group.secondaryKey}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                      {group.songs.length}
                    </span>
                  </div>

                  {/* BLOQUE INTERIOR CON LAS CANCIONES */}
                  <div className="flex flex-col gap-2.5">
                    {group.songs.slice(0, 4).map((song) => {
                      const previewLines = (song.content || '')
                        .split('\n')
                        .filter((line) => line.trim().length > 0)
                        .slice(0, 2)
                        .join('\n');

                      return (
                        <div
                          key={song.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSong(song);
                          }}
                          className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors border border-neutral-100 dark:border-neutral-800/50"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                              {song.title || 'Canción sin título'}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSongToDelete(song.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar canción"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <p className="font-mono text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2 whitespace-pre-wrap">
                            {previewLines || 'Sin notas...'}
                          </p>
                        </div>
                      );
                    })}

                    {group.songs.length > 4 && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1 text-center">
                        + {group.songs.length - 4} canciones más...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!songToDelete}
        title="Eliminar canción"
        onCancel={() => setSongToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
