import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  Trash2, 
  ListMusic, 
  Edit3, 
  Calendar, 
  Music,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { SongNote, Setlist } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { getAllSetlists, saveSetlist, deleteSetlist, Setlist } from '../../services/storage/SetlistStorageService';
import { formatDualKeyDisplay, NotationSystem } from '../../domain/music/NotationSystem';
import { transposeKeyName } from '../../domain/music/TranspositionEngine';
import { ConfirmModal } from '../common/ConfirmModal';

interface SetlistViewProps {
  onOpenNoteInEditor?: (note: SongNote) => void;
  notation: NotationSystem;
  onActiveListChange?: (isInside: boolean) => void;
}

export function renderFormattedMusicContent(rawContent: string) {
  if (!rawContent) return <span>(Sin notas)</span>;

  // Segmentos delimitados por *...* se estilizan como anotaciones de guía
  const parts = rawContent.split(/(\*[^*]*\*?)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*')) {
      return (
        <span
          key={index}
          className="text-xs md:text-sm font-sans italic font-normal text-neutral-400 dark:text-neutral-500 opacity-75 mx-1 select-text"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function SetlistView({ onOpenNoteInEditor, notation, onActiveListChange }: SetlistViewProps) {
  // Navigation states: null = Estado 1 (Catálogo de Listas), string = Estado 2 (ID de Lista Seleccionada)
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);

  // Data states
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [allNotes, setAllNotes] = useState<SongNote[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  // Editing setlist title inline
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Notify parent if inside an active setlist
  useEffect(() => {
    onActiveListChange?.(selectedSetlistId !== null);
  }, [selectedSetlistId, onActiveListChange]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedSetlists = getAllSetlists();
    const loadedNotes = NoteStorageService.getAll();
    setSetlists(loadedSetlists);
    setAllNotes(loadedNotes);
  };

  // Currently active setlist in Estado 2
  const currentSetlist = useMemo(() => {
    if (!selectedSetlistId) return null;
    return setlists.find(s => s.id === selectedSetlistId) || null;
  }, [selectedSetlistId, setlists]);

  // Sync title input when entering a setlist
  useEffect(() => {
    if (currentSetlist) {
      setEditedTitle(currentSetlist.name);
      setIsEditingTitle(false);
    }
  }, [currentSetlist?.id]);

  // Handle creating a new setlist cleanly without prompt
  const handleConfirmCreate = () => {
    const finalName = newListName.trim() || `Lista ${setlists.length + 1}`;
    const newList: Setlist = {
      id: Date.now().toString(),
      name: finalName,
      songIds: [],
      updatedAt: Date.now()
    };
    saveSetlist(newList);
    setSetlists(getAllSetlists());
    setSelectedSetlistId(newList.id); // Abre la lista recién creada
    setNewListName('');
    setIsCreateModalOpen(false);
  };

  // Handle saving inline edited title
  const handleSaveTitle = () => {
    if (!currentSetlist) return;
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== currentSetlist.name) {
      const updated: Setlist = {
        ...currentSetlist,
        name: trimmed,
        updatedAt: Date.now()
      };
      saveSetlist(updated);
      setSetlists(getAllSetlists());
    }
    setIsEditingTitle(false);
  };

  // Toggle a song into/out of current setlist
  const handleToggleSongInSetlist = (noteId: string) => {
    if (!currentSetlist) return;
    const exists = currentSetlist.songIds.includes(noteId);
    let newSongIds: string[];
    if (exists) {
      newSongIds = currentSetlist.songIds.filter(id => id !== noteId);
    } else {
      newSongIds = [...currentSetlist.songIds, noteId];
    }

    const updated: Setlist = {
      ...currentSetlist,
      songIds: newSongIds,
      updatedAt: Date.now()
    };

    saveSetlist(updated);
    setSetlists(getAllSetlists());
  };

  // Remove song directly from current setlist
  const handleRemoveSongFromSetlist = (noteId: string) => {
    if (!currentSetlist) return;
    const updated: Setlist = {
      ...currentSetlist,
      songIds: currentSetlist.songIds.filter(id => id !== noteId),
      updatedAt: Date.now()
    };
    saveSetlist(updated);
    setSetlists(getAllSetlists());
  };

  // Calculate concert key for any song note
  const getConcertKeyForNote = (note: SongNote): string => {
    if (note.detectedKey && note.detectedKey !== 'Indeterminada') {
      return note.detectedKey;
    }
    let detected = detectKey(note.content || '');
    if (detected === 'Indeterminada') return 'Sin tono';
    if (note.activeInstrument === 'trumpet') {
      detected = transposeKeyName(detected, -2);
    }
    return detected || 'Sin tono';
  };

  // Defensive validation of songs in active setlist
  const validSongs = useMemo(() => {
    if (!currentSetlist) return [];
    return (currentSetlist.songIds || [])
      .map(id => allNotes.find(n => n && n.id === id))
      .filter((s): s is SongNote => Boolean(s && s.id));
  }, [currentSetlist, allNotes]);

  // Group songs of the current setlist by detected key (Strict Tonal Grouping)
  const tonalGroups = useMemo(() => {
    if (!currentSetlist || validSongs.length === 0) return [];

    // Group preserving sequential overall index
    const groupMap = new Map<string, { song: SongNote; overallIndex: number }[]>();
    
    validSongs.forEach((song, idx) => {
      const key = getConcertKeyForNote(song);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push({
        song,
        overallIndex: idx + 1
      });
    });

    // Format group results
    const groups: {
      rawKey: string;
      formattedKey: string;
      songs: { song: SongNote; overallIndex: number }[];
    }[] = [];

    groupMap.forEach((songsInGroup, rawKey) => {
      groups.push({
        rawKey,
        formattedKey: formatDualKeyDisplay(rawKey, notation),
        songs: songsInGroup
      });
    });

    return groups;
  }, [currentSetlist, validSongs, notation]);

  // Filter notes for the Add Songs modal
  const filteredLibraryNotes = useMemo(() => {
    if (!songSearchQuery.trim()) return allNotes;
    const query = songSearchQuery.toLowerCase();
    return allNotes.filter(n =>
      (n.title && n.title.toLowerCase().includes(query)) ||
      (n.content && n.content.toLowerCase().includes(query))
    );
  }, [allNotes, songSearchQuery]);

  // =========================================================================
  // ESTADO 2: VISOR Y EDITOR DE LA LISTA SELECCIONADA (AGRUPACIÓN TONAL)
  // =========================================================================
  if (currentSetlist) {
    const totalSongsInList = validSongs.length;

    return (
      <div className="w-full mx-auto p-3 sm:p-5 pb-28 max-w-5xl animate-in fade-in duration-150">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSelectedSetlistId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold transition text-xs sm:text-sm cursor-pointer active:scale-95"
            >
              <ArrowLeft size={16} />
              <span>Volver a Mis Listas</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListToDelete(currentSetlist.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold transition text-xs sm:text-sm cursor-pointer active:scale-95 border border-red-200 dark:border-red-900/50"
                title="Eliminar esta lista completa"
              >
                <Trash2 size={15} />
                <span>Eliminar Lista</span>
              </button>

              <button
                onClick={() => setIsSongSelectorOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition active:scale-95 cursor-pointer text-xs sm:text-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Añadir Alabanza</span>
              </button>
            </div>
          </div>

          {/* Editable Title Section */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="text-xl sm:text-2xl font-extrabold bg-white dark:bg-[#28292A] border-2 border-amber-500 rounded-xl px-3 py-1 outline-none text-[#202124] dark:text-[#E8EAED] w-full"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-xl font-bold text-xs sm:text-sm"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#202124] dark:text-[#E8EAED] tracking-tight">
                  {currentSetlist.name}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  title="Editar nombre de la lista"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">
              {totalSongsInList} {totalSongsInList === 1 ? 'alabanza' : 'alabanzas'} en total
            </span>
            <span>•</span>
            <span>{tonalGroups.length} {tonalGroups.length === 1 ? 'tonalidad distinta' : 'tonalidades distintas'}</span>
          </div>
        </div>

        {/* Empty State in Estado 2 */}
        {validSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-[#28292A] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Music size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Esta lista está vacía
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 text-sm">
              Esta lista está vacía. Toca '+ Añadir Canciones' para seleccionar de tu biblioteca.
            </p>
            <button
              onClick={() => setIsSongSelectorOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>+ Añadir Canciones</span>
            </button>
          </div>
        ) : (
          /* AGRUPACIÓN TONAL ESTRICTA: Cabecera compacta por tono con notas ampliadas para atril */
          <div className="space-y-4">
            {tonalGroups.map(group => (
              <section key={group.rawKey}>
                {/* 1. Cabecera de Tono Compacta (Una sola por grupo) */}
                <div className="text-xs font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1.5 rounded-md mb-2 flex items-center justify-between">
                  <span>TONO: {group.formattedKey}</span>
                  <span className="font-normal opacity-75">{group.songs.length} {group.songs.length === 1 ? 'canción' : 'canciones'}</span>
                </div>

                {/* Bloque de Canciones bajo esa Tonalidad */}
                <div className="space-y-2.5">
                  {group.songs.map(({ song, overallIndex }) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-[#28292A] rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 shadow-xs transition flex flex-col"
                    >
                      {/* 2. Nombre de la Canción (Compacto, semibold mediano) */}
                      <div className="flex items-center justify-between gap-2 text-sm md:text-base text-neutral-700 dark:text-neutral-300 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-neutral-400 dark:text-neutral-500 shrink-0">
                            {overallIndex}.
                          </span>
                          <h3 className="font-semibold truncate text-neutral-800 dark:text-neutral-200">
                            {song.title || 'Sin título'}
                          </h3>
                          {song.activeInstrument === 'trumpet' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0">
                              🎺 Sib
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 shrink-0">
                              🎹 Teclado
                            </span>
                          )}
                        </div>

                        {/* Acciones discretas */}
                        <div className="flex items-center gap-1 shrink-0">
                          {onOpenNoteInEditor && (
                            <button
                              onClick={() => onOpenNoteInEditor(song)}
                              className="p-1 rounded-md text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Abrir en editor de notas"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveSongFromSetlist(song.id)}
                            className="p-1 rounded-md text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="Quitar de esta lista"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* NOTAS MUSICALES (Elemento Dominante de la Pantalla) */}
                      <div className="mt-1">
                        <div className="text-xl md:text-2xl font-mono font-bold tracking-wide leading-relaxed text-amber-600 dark:text-amber-400 whitespace-pre-wrap select-none break-words">
                          {renderFormattedMusicContent(song.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Modal: Selector de Canciones */}
        {isSongSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              className="bg-white dark:bg-[#28292A] rounded-3xl border border-gray-200 dark:border-gray-700 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Añadir a "{currentSetlist.name}"
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Selecciona las alabanzas para agrupar en este repertorio ({currentSetlist.songIds.length} seleccionadas)
                  </p>
                </div>
                <button
                  onClick={() => setIsSongSelectorOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#202124]">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar alabanza por título o acorde..."
                    value={songSearchQuery}
                    onChange={e => setSongSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#28292A] border border-gray-200 dark:border-gray-700 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Song List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {filteredLibraryNotes.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                    {allNotes.length === 0 
                      ? 'No hay canciones en la biblioteca de TNotes todavía.' 
                      : 'No se encontraron alabanzas con esa búsqueda.'}
                  </div>
                ) : (
                  filteredLibraryNotes.map(note => {
                    const isSelected = currentSetlist.songIds.includes(note.id);
                    const concertKey = getConcertKeyForNote(note);
                    const formattedKey = formatDualKeyDisplay(concertKey, notation);

                    return (
                      <div
                        key={note.id}
                        onClick={() => handleToggleSongInSetlist(note.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs' 
                            : 'bg-white dark:bg-[#1F1F1F] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 border-amber-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#28292A]'
                          }`}>
                            {isSelected && <Check size={16} strokeWidth={3} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                              {note.title || 'Sin título'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                TONO: {formattedKey}
                              </span>
                              <span>•</span>
                              <span>{note.activeInstrument === 'trumpet' ? '🎺 Trompeta' : '🎹 Teclado'}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-xs font-semibold px-2 py-1 rounded-md shrink-0 ${
                          isSelected 
                            ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {isSelected ? 'En Lista' : 'Agregar'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202124] flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentSetlist.songIds.length} {currentSetlist.songIds.length === 1 ? 'canción en la lista' : 'canciones en la lista'}
                </span>
                <button
                  onClick={() => setIsSongSelectorOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación: Eliminar Lista */}
        <ConfirmModal
          isOpen={!!listToDelete}
          title="Eliminar lista"
          onCancel={() => setListToDelete(null)}
          onConfirm={() => {
            if (listToDelete) {
              deleteSetlist(listToDelete);
              setSetlists(prev => prev.filter(l => l.id !== listToDelete));
              if (selectedSetlistId === listToDelete) {
                setSelectedSetlistId(null);
              }
              setListToDelete(null);
            }
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // ESTADO 1: CATÁLOGO DE LISTAS GUARDADAS (GESTIÓN GENERAL)
  // =========================================================================
  return (
    <div className="w-full mx-auto p-4 md:p-6 pb-32 max-w-6xl animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202124] dark:text-[#E8EAED] flex items-center gap-2.5">
            <span>🎶</span> Mis Listas de Alabanzas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Organiza tus repertorios por servicio o reunión con agrupación tonal automática.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Nueva Lista</span>
        </button>
      </div>

      {/* Empty State */}
      {setlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-[#28292A] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <ListMusic size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            No tienes listas de alabanzas creadas aún
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 text-sm">
            Crea una lista para tu próximo servicio o concierto (ej. "Servicio Domingo 10 AM") y agrupa las alabanzas por tono con sus acordes.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Crear Mi Primera Lista</span>
          </button>
        </div>
      ) : (
        /* Cuadrícula Responsiva de Listas Guardadas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {setlists.map(list => {
            const count = list.songIds.length;
            const updatedDate = new Date(list.updatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={list.id}
                onClick={() => setSelectedSetlistId(list.id)}
                className="group bg-white dark:bg-[#28292A] rounded-2xl border border-gray-200 dark:border-gray-700/80 p-5 shadow-xs hover:shadow-lg transition cursor-pointer flex flex-col justify-between h-48 relative hover:border-amber-400 dark:hover:border-amber-600"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <ListMusic size={20} />
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita abrir la lista al tocar el basurero
                        setListToDelete(list.id);
                      }}
                      className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Eliminar lista"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-xl text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    {list.name}
                  </h3>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/30">
                    {count} {count === 1 ? 'alabanza' : 'alabanzas'}
                  </span>
                  
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {updatedDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mini-Modal: Crear Nueva Lista */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-xs bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 text-center">
              Nueva Lista de Alabanzas
            </h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
              placeholder="Ej. Servicio Domingo"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNewListName(''); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación: Eliminar Lista */}
      <ConfirmModal
        isOpen={!!listToDelete}
        title="Eliminar lista"
        onCancel={() => setListToDelete(null)}
        onConfirm={() => {
          if (listToDelete) {
            deleteSetlist(listToDelete);
            setSetlists(prev => prev.filter(l => l.id !== listToDelete));
            if (selectedSetlistId === listToDelete) {
              setSelectedSetlistId(null);
            }
            setListToDelete(null);
          }
        }}
      />
    </div>
  );
}
