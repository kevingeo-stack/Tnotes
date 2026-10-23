import React, { useMemo, useState, useEffect } from 'react';
import { PITCH_CLASSES, SharpPitch, normalizeKeyName } from '../../domain/music/PitchClass';
import { keyboardToTrumpet } from '../../domain/music/TranspositionEngine';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { formatKeyName, toNatural, toEnglish, NotationSystem } from '../../domain/music/NotationSystem';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { Music } from 'lucide-react';

export interface PitchSpaceViewProps {
  activeNote?: SongNote;
  notation: NotationSystem;
  notes?: SongNote[];
  onSelectNote?: (note: SongNote) => void;
}

export function PitchSpaceView({ activeNote, notation, notes: propNotes, onSelectNote }: PitchSpaceViewProps) {
  const availableNotes = useMemo(() => {
    return propNotes ?? NoteStorageService.getAll();
  }, [propNotes]);

  // Selección de canción: prioridad a activeNote válida; fallback a primera canción disponible
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    if (activeNote && activeNote.id && (activeNote.title || activeNote.content)) {
      return activeNote.id;
    }
    return availableNotes.length > 0 ? availableNotes[0].id : null;
  });

  // Sincronizar si cambia activeNote desde fuera
  useEffect(() => {
    if (activeNote && activeNote.id && (activeNote.title || activeNote.content)) {
      setSelectedNoteId(activeNote.id);
    }
  }, [activeNote?.id]);

  // Canción actualmente bajo análisis
  const currentSong = useMemo(() => {
    if (selectedNoteId) {
      const found = availableNotes.find(n => n.id === selectedNoteId);
      if (found) return found;
    }
    if (activeNote && (activeNote.title || activeNote.content)) {
      return activeNote;
    }
    return availableNotes.length > 0 ? availableNotes[0] : null;
  }, [selectedNoteId, availableNotes, activeNote]);

  const handleSongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setSelectedNoteId(nextId);
    const chosen = availableNotes.find(n => n.id === nextId);
    if (chosen && onSelectNote) {
      onSelectNote(chosen);
    }
  };

  // Separación exacta de tonalidades: Escrita (Trompeta) vs Concierto (Teclado)
  const { trumpetKey, concertKey } = useMemo(() => {
    if (!currentSong) {
      return { trumpetKey: 'Sin tono', concertKey: 'Sin tono' };
    }

    const hasDetected = currentSong.detectedKey &&
      currentSong.detectedKey !== 'Sin tono' &&
      currentSong.detectedKey !== 'Indeterminada' &&
      currentSong.detectedKey !== 'Desconocido';
    const hasConcert = currentSong.concertKey &&
      currentSong.concertKey !== 'Sin tono' &&
      currentSong.concertKey !== 'Indeterminada' &&
      currentSong.concertKey !== 'Desconocido';

    if (hasDetected && hasConcert) {
      return {
        trumpetKey: normalizeKeyName(currentSong.detectedKey!),
        concertKey: normalizeKeyName(currentSong.concertKey!)
      };
    }

    // Detección dinámica respetando el instrumento original de la canción
    const notationStyle = notation === 'natural' ? 'LATIN' : 'ENGLISH';
    const detected = KeyDetector.detectKey(
      currentSong.content || '',
      notationStyle,
      currentSong.activeInstrument || 'keyboard'
    );

    return {
      trumpetKey: detected.trumpetKey,
      concertKey: detected.concertKey
    };
  }, [currentSong, notation]);

  const displayTrumpetKey = useMemo(() => formatKeyName(trumpetKey, notation), [trumpetKey, notation]);
  const displayConcertKey = useMemo(() => formatKeyName(concertKey, notation), [concertKey, notation]);

  // Cálculo de las notas de la escala en tono de concierto
  const activeScaleNotes = useMemo(() => {
    if (!concertKey || concertKey === 'Sin tono' || concertKey === 'Indeterminada' || concertKey === 'Desconocido') {
      return new Set<string>();
    }

    const normalized = normalizeKeyName(concertKey);
    const parts = normalized.split(' ');
    if (parts.length !== 2) return new Set<string>();

    const rootName = parts[0];
    const mode = parts[1];

    const rootEnglish = toEnglish(rootName) as SharpPitch;
    if (!PITCH_CLASSES.includes(rootEnglish)) return new Set<string>();

    const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

    const intervals = mode === 'Mayor' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
    const rootIndex = PITCH_CLASSES.indexOf(rootEnglish);

    return new Set(intervals.map(i => PITCH_CLASSES[(rootIndex + i) % 12]));
  }, [concertKey]);

  return (
    <div className="w-full mx-auto p-4 md:p-6 pb-32 max-w-5xl">
      {/* Encabezado y Selector de Canción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202124] dark:text-[#E8EAED] tracking-tight">
            Espacio Armónico
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Análisis tonal y correspondencia cromática entre Trompeta y Teclado.
          </p>
        </div>

        {availableNotes.length > 0 && (
          <div className="flex items-center gap-2 bg-white dark:bg-[#28292A] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-xs shrink-0">
            <Music size={16} className="text-amber-500 shrink-0" />
            <label htmlFor="pitch-space-select" className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
              Canción:
            </label>
            <select
              id="pitch-space-select"
              value={currentSong?.id || ''}
              onChange={handleSongChange}
              className="bg-transparent text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 outline-none cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {availableNotes.map(n => {
                const keyLabel = formatKeyName(n.detectedKey || 'Sin tono', notation);
                return (
                  <option key={n.id} value={n.id} className="bg-white dark:bg-[#28292A] text-gray-800 dark:text-gray-200">
                    {`${n.title || 'Sin título'} (${keyLabel})`}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Estado Vacío cuando no hay canciones */}
      {!currentSong && availableNotes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#28292A] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 mb-8 shadow-xs">
          <Music className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">
            No hay canciones en la biblioteca
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Crea canciones en el Editor o en Tonalidades para visualizar su rueda cromática y correspondencia de transposición.
          </p>
        </div>
      ) : (
        <>
          {/* Tarjeta de Tonalidades Duales */}
          <div className="bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold block mb-0.5">
                Canción analizada
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate max-w-md">
                {currentSong?.title || 'Canción sin título'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Tonalidad Escrita de Trompeta */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3.5 py-2">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">
                  🎺 Trompeta (Escrita)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-900 dark:text-amber-200">
                  {displayTrumpetKey}
                </span>
              </div>

              {/* Tonalidad de Concierto / Teclado */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl px-3.5 py-2">
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 block">
                  🎹 Teclado (Concierto)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-blue-900 dark:text-blue-200">
                  {displayConcertKey}
                </span>
              </div>
            </div>
          </div>

          {/* Rueda Cromática de Concierto */}
          <div className="bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Rueda Cromática (Tono de Concierto)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activeScaleNotes.size > 0 
                  ? `${activeScaleNotes.size} notas en la escala de ${displayConcertKey}` 
                  : 'Sin escala proyectada'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-3 sm:gap-4">
              {PITCH_CLASSES.map(pitch => {
                const inScale = activeScaleNotes.has(pitch);
                const displayPitch = notation === 'natural' ? toNatural(pitch) : pitch;

                return (
                  <div
                    key={pitch}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition ${
                      inScale
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-400 shadow-xs scale-105'
                        : 'border-transparent bg-gray-50 dark:bg-[#1F1F1F] text-gray-400 dark:text-gray-600 opacity-60'
                    }`}
                  >
                    <span className="text-lg sm:text-xl font-bold">{displayPitch}</span>
                    {inScale && (
                      <span className="text-[9px] mt-1 uppercase font-bold text-center leading-tight">
                        En Escala
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mapeo de Transposición */}
          <div className="bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Mapeo de Transposición
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Correspondencia nota por nota entre Concierto y Trompeta en Sib (+2 semitonos)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1F1F1F]">
                    <th className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                      🎹 Teclado (Concierto)
                      {displayConcertKey !== 'Sin tono' && (
                        <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
                          {`• ${displayConcertKey}`}
                        </span>
                      )}
                    </th>
                    <th className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                      🎺 Trompeta (Sib)
                      {displayTrumpetKey !== 'Sin tono' && (
                        <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">
                          {`• ${displayTrumpetKey}`}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PITCH_CLASSES.map(pitch => {
                    const trumpetPitch = keyboardToTrumpet(pitch);
                    const displayConcert = notation === 'natural' ? toNatural(pitch) : pitch;
                    const displayTrumpet = notation === 'natural' ? toNatural(trumpetPitch) : trumpetPitch;
                    const inScale = activeScaleNotes.has(pitch);

                    return (
                      <tr
                        key={pitch}
                        className={`border-b border-gray-100 dark:border-gray-800/50 ${
                          inScale ? 'bg-amber-50/60 dark:bg-amber-900/15' : ''
                        }`}
                      >
                        <td className="p-3 sm:p-4 font-mono font-bold text-gray-800 dark:text-gray-300">
                          <span className={inScale ? 'text-blue-700 dark:text-blue-400' : ''}>
                            {displayConcert}
                          </span>
                          {inScale && (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 ml-2">
                              ✓ En Escala
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          <span>{displayTrumpet}</span>
                          <span className="text-xs font-normal opacity-50 ml-1.5">(+2)</span>
                          {inScale && (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 ml-2">
                              ✓ En Escala
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
