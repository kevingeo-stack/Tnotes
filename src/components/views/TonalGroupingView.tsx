import React, { useState } from 'react';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { normalizeFlatsToSharps } from '../../domain/music/PitchClass';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { transposeKeyName } from '../../domain/music/TranspositionEngine';
import { ConfirmModal } from '../common/ConfirmModal';
import { DualKeyBadge } from '../common/DualKeyBadge';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { Music, Trash2, Plus, ArrowLeft, Layers, Music2, ChevronRight } from 'lucide-react';

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

  // Gesto táctil horizontal hacia la derecha para retroceder desde el detalle a la biblioteca
  const detailContainerRef = useSwipeBack<HTMLDivElement>({
    onSwipeBack: () => setSelectedToneGroup(null),
    enabled: Boolean(selectedToneGroup),
  });

  const notes = propNotes ?? NoteStorageService.getAll();
  const notationStyle: 'ENGLISH' | 'LATIN' = propNotationStyle ?? (notation === 'natural' ? 'LATIN' : 'ENGLISH');
  const onSelectSong = propOnSelectSong || onSelectNote || (() => {});

  // 1. Agrupar canciones por la tonalidad activa con coherencia total con las reglas musicales existentes
  const groupedNotes = notes.reduce<Record<string, { trumpetKey: string; concertKey: string; primaryKey: string; secondaryKey: string; songs: SongNote[] }>>((acc, note) => {
    const keyInfo = KeyDetector.detectKey(note.content || '', notationStyle, note.activeInstrument || 'keyboard');

    let trumpetKey: string;
    let concertKey: string;

    const detectedTrumpet = keyInfo.trumpetKey;
    const isDetectedValid = Boolean(
      detectedTrumpet &&
      detectedTrumpet !== 'Sin tono' &&
      detectedTrumpet !== 'Indeterminada' &&
      detectedTrumpet !== 'Desconocido'
    );

    if (isDetectedValid) {
      trumpetKey = detectedTrumpet;
      concertKey = keyInfo.concertKey;
    } else {
      const rawSavedKey = note.detectedKey;
      const isSavedValid = Boolean(
        rawSavedKey &&
        rawSavedKey !== 'Sin tono' &&
        rawSavedKey !== 'Indeterminada' &&
        rawSavedKey !== 'Desconocido' &&
        rawSavedKey !== 'Tono desconocido'
      );

      if (isSavedValid) {
        const sys: NotationSystem = notationStyle === 'LATIN' ? 'natural' : 'en';
        trumpetKey = formatKeyName(rawSavedKey, sys);
        if (
          note.concertKey &&
          note.concertKey !== 'Sin tono' &&
          note.concertKey !== 'Indeterminada' &&
          note.concertKey !== 'Desconocido' &&
          note.concertKey !== 'Tono desconocido'
        ) {
          concertKey = formatKeyName(note.concertKey, sys);
        } else {
          concertKey = formatKeyName(transposeKeyName(rawSavedKey, -2), sys);
        }
      } else {
        trumpetKey = 'Sin tono';
        concertKey = 'Sin tono';
      }
    }

    const primaryKey = activeInstrument === 'trumpet' ? trumpetKey : concertKey;
    const secondaryKey = activeInstrument === 'trumpet' ? concertKey : trumpetKey;
    const groupKey = primaryKey || 'Sin tono';

    if (!acc[groupKey]) {
      acc[groupKey] = {
        trumpetKey,
        concertKey,
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
      if (onDeleteNote) {
        onDeleteNote(songToDelete);
      } else {
        NoteStorageService.delete(songToDelete);
        onRefreshNotes?.();
      }
      setSongToDelete(null);
    }
  };

  // =========================================================================
  // VISTA DE DETALLE DE TONALIDAD (ENFOCADA)
  // =========================================================================
  if (selectedToneGroup && groupedNotes[selectedToneGroup]) {
    const currentGroup = groupedNotes[selectedToneGroup];

    return (
      <div 
        ref={detailContainerRef}
        className="w-full max-w-5xl mx-auto p-4 sm:p-6 pb-28 animate-in fade-in duration-150 select-none"
      >
        {/* Barra superior de navegación */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedToneGroup(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#202124] hover:bg-gray-100 dark:hover:bg-[#2A2B2D] border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver a Tonalidades</span>
          </button>

          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium select-none">
            Desliza a la derecha para volver
          </span>
        </div>

        {/* Banner Hero de Tonalidad al estilo Keep */}
        <div className="bg-white dark:bg-[#202124] border border-gray-200 dark:border-gray-700/80 rounded-2xl p-5 sm:p-6 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{activeInstrument === 'trumpet' ? '🎺' : '🎹'}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                {currentGroup.primaryKey}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span>Equivalencia instrumental:</span>
              <DualKeyBadge
                trumpetKey={currentGroup.trumpetKey}
                concertKey={currentGroup.concertKey}
                activeInstrument={activeInstrument}
                size="sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 px-3.5 py-1.5 rounded-full shrink-0">
            <Music2 size={15} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {currentGroup.songs.length} {currentGroup.songs.length === 1 ? 'canción' : 'canciones'}
            </span>
          </div>
        </div>

        {/* Cuadrícula de Canciones en la Tonalidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentGroup.songs.map((song) => {
            const displayContent = activeInstrument === 'trumpet'
              ? normalizeFlatsToSharps(song.content || '')
              : (song.content || '');

            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group bg-white dark:bg-[#202124] hover:bg-gray-50/80 dark:hover:bg-[#28292A] border border-gray-200 dark:border-gray-700/80 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 flex-1 pr-2">
                    {song.title || 'Canción sin título'}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSongToDelete(song.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar canción"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Extracto musical con formato de partitura/cifrado */}
                <div className="font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap bg-gray-50 dark:bg-[#1A1A1C] p-3 rounded-xl border border-gray-100 dark:border-gray-800/80">
                  {displayContent || <span className="text-gray-400 dark:text-gray-500 italic">Sin notas escritas...</span>}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                  <span>Tocar para abrir en editor</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-amber-500" />
                </div>
              </div>
            );
          })}
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

  // =========================================================================
  // VISTA GENERAL EN CUADRÍCULA (ESTILO TARJETAS GOOGLE KEEP)
  // =========================================================================
  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 pb-28">
      {/* Cabecera Principal */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers className="text-amber-500" size={22} />
          <span>Biblioteca por Tonalidades</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Organización armónica automática para trompeta y teclado • {toneKeys.length} {toneKeys.length === 1 ? 'tonalidad' : 'tonalidades'} ({notes.length} canciones)
        </p>
      </div>

      {notes.length === 0 ? (
        /* Estado vacío limpio al estilo Keep */
        <div className="text-center py-20 px-6 bg-white dark:bg-[#202124] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Music size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
            Tu repertorio está vacío
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
            Crea tu primera canción y se agrupará automáticamente por su tonalidad de trompeta y teclado.
          </p>
          {onCreateNewSong && (
            <button
              type="button"
              onClick={onCreateNewSong}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>Crear Canción</span>
            </button>
          )}
        </div>
      ) : (
        /* Cuadrícula Uniforme de Tarjetas: 2 Columnas en Móvil, Misma Altura en Todas las Tarjetas */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {toneKeys.map((toneGroupKey) => {
            const group = groupedNotes[toneGroupKey];

            return (
              <div
                key={toneGroupKey}
                onClick={() => setSelectedToneGroup(toneGroupKey)}
                className="group bg-white dark:bg-[#202124] border border-gray-200/90 dark:border-gray-800 hover:border-amber-400/80 dark:hover:border-amber-500/60 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between h-[216px] sm:h-[224px] overflow-hidden select-none"
              >
                {/* 1. Cabecera Fija de la Tarjeta Tonal con Insignia Dual y Contador */}
                <div className="pb-2 mb-2 border-b border-gray-100/90 dark:border-gray-800/80 flex items-center justify-between gap-1.5 shrink-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <DualKeyBadge
                      trumpetKey={group.trumpetKey}
                      concertKey={group.concertKey}
                      activeInstrument={activeInstrument}
                      size="xs"
                    />
                  </div>

                  <span 
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-gray-100/90 dark:bg-[#2A2B2D] text-gray-600 dark:text-gray-300 shrink-0 border border-gray-200/50 dark:border-gray-700/50"
                    title={`${group.songs.length} ${group.songs.length === 1 ? 'canción' : 'canciones'}`}
                  >
                    {group.songs.length}
                  </span>
                </div>

                {/* 2. Lista de Canciones: Espacio proporcional con extractos limpios */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden justify-start">
                  {group.songs.slice(0, 2).map((song) => {
                    const displayContent = activeInstrument === 'trumpet'
                      ? normalizeFlatsToSharps(song.content || '')
                      : (song.content || '');
                    const previewLines = displayContent
                      .split('\n')
                      .map(l => l.trim())
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(' • ');

                    return (
                      <div
                        key={song.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSong(song);
                        }}
                        className="p-2 rounded-xl bg-gray-50/80 dark:bg-[#28292A]/60 hover:bg-amber-50/70 dark:hover:bg-[#2E2F32] border border-gray-100/80 dark:border-gray-800/70 transition-colors group/item"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="font-semibold text-xs sm:text-[13px] text-gray-800 dark:text-gray-100 group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors truncate flex-1 pr-0.5">
                            {song.title || 'Canción sin título'}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSongToDelete(song.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer shrink-0"
                            title="Eliminar canción"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <p className="font-mono text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {previewLines || <span className="italic text-gray-400">Sin notas...</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Pie de Tarjeta Uniforme con Indicador y Chevron */}
                <div className="pt-2 border-t border-gray-100/90 dark:border-gray-800/60 shrink-0 flex items-center justify-between text-[10px] sm:text-[11px]">
                  {group.songs.length > 2 ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      + {group.songs.length - 2} {group.songs.length - 2 === 1 ? 'canción más' : 'canciones más'}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 font-medium text-[10px]">
                      Ver tono completo
                    </span>
                  )}
                  <ChevronRight size={13} className="text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform" />
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
