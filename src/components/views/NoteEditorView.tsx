import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, RefreshCw, Globe2 } from 'lucide-react';
import { transposeText, TranspositionEngine } from '../../domain/music/TranspositionEngine';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { NotationTranslator, NotationStyle } from '../../domain/music/NotationTranslator';
import { normalizeFlatsToSharps } from '../../domain/music/PitchClass';
import { KeyTransposeModal } from '../common/KeyTransposeModal';
import { TranspositionSaveModal } from '../common/TranspositionSaveModal';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';

interface NoteEditorViewProps {
  note: SongNote;
  onNoteChange: (updated: SongNote) => void;
  onSaveAndExit: () => void;
  notation: NotationSystem;
  onToggleNotation?: () => void;
}

export function NoteEditorView({ note, onNoteChange, onSaveAndExit, notation, onToggleNotation }: NoteEditorViewProps) {
  const [activeInstrument, setActiveInstrument] = useState<'keyboard' | 'trumpet'>(note.activeInstrument || 'keyboard');
  const [content, setContent] = useState<string>(note.content || '');
  const [title, setTitle] = useState<string>(note.title || '');
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [notationStyle, setNotationStyle] = useState<NotationStyle>(
    notation === 'natural' ? 'LATIN' : 'ENGLISH'
  );
  const [baseReference, setBaseReference] = useState<{ content: string; instrument: 'keyboard' | 'trumpet' }>(() => ({
    content: note.baseContent !== undefined ? note.baseContent : (note.content || ''),
    instrument: note.baseInstrument || note.activeInstrument || 'keyboard'
  }));
  const [isTransposeModalOpen, setIsTransposeModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [pendingTargetKey, setPendingTargetKey] = useState<string>('');

  // Sync state when active note changes (only on note.id change)
  useEffect(() => {
    const targetStyle: NotationStyle = notation === 'natural' ? 'LATIN' : 'ENGLISH';
    setNotationStyle(targetStyle);
    const inst = note.activeInstrument || 'keyboard';
    setActiveInstrument(inst);
    let syncContent = NotationTranslator.translateFullContent(note.content || '', targetStyle);
    if (inst === 'trumpet') {
      syncContent = normalizeFlatsToSharps(syncContent);
    }
    setContent(syncContent);
    const baseInst = note.baseInstrument || inst;
    const baseRaw = note.baseContent !== undefined ? note.baseContent : (note.content || '');
    const syncBaseContent = NotationTranslator.translateFullContent(baseRaw, targetStyle);
    setBaseReference({
      content: syncBaseContent,
      instrument: baseInst
    });
    setTitle(note.title || '');
    setIsKeyboardMode(false);
  }, [note.id]);

  // Sincronizar traducción cuando cambia la preferencia global de notación
  useEffect(() => {
    const targetStyle: NotationStyle = notation === 'natural' ? 'LATIN' : 'ENGLISH';
    if (targetStyle !== notationStyle) {
      setNotationStyle(targetStyle);
      const translated = NotationTranslator.translateFullContent(content, targetStyle);
      const translatedBase = NotationTranslator.translateFullContent(baseReference.content, targetStyle);
      setContent(translated);
      setBaseReference({ content: translatedBase, instrument: baseReference.instrument });
      updateStateAndStorage(title, translated, activeInstrument, translatedBase, baseReference.instrument, targetStyle);
    }
  }, [notation]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Detección tonal dual (Trompeta / Teclado)
  const dualKeyResult = useMemo(() => {
    const activeStyle: NotationStyle = notation === 'natural' ? 'LATIN' : 'ENGLISH';
    const res = KeyDetector.detectKey(content, activeStyle, activeInstrument);
    if (res.trumpetKey && res.trumpetKey !== 'Sin tono') {
      return res;
    }
    if (note.detectedKey && note.detectedKey !== 'Sin tono' && note.detectedKey !== 'Tono desconocido' && note.detectedKey !== 'Desconocido') {
      const trumpetK = formatKeyName(note.detectedKey, notation);
      const concertK = note.concertKey ? formatKeyName(note.concertKey, notation) : trumpetK;
      return {
        trumpetKey: trumpetK,
        concertKey: concertK,
        formatted: activeInstrument === 'keyboard'
          ? `🎹 ${concertK} | 🎺 ${trumpetK}`
          : `🎺 ${trumpetK} | 🎹 ${concertK}`,
        key: trumpetK,
        name: trumpetK,
        concertEquivalent: concertK,
        confidence: 1,
        root: trumpetK.split(' ')[0],
        mode: trumpetK.includes('Menor') ? 'Menor' as const : 'Mayor' as const
      };
    }
    return res;
  }, [content, notation, activeInstrument, note.detectedKey, note.concertKey]);

  const currentKey = activeInstrument === 'trumpet' ? dualKeyResult.trumpetKey : dualKeyResult.concertKey;

  const handleToggleNotation = () => {
    if (onToggleNotation) {
      onToggleNotation();
    } else {
      const nextStyle = notationStyle === 'ENGLISH' ? 'LATIN' : 'ENGLISH';
      setNotationStyle(nextStyle);
      const translated = NotationTranslator.translateFullContent(content, nextStyle);
      const translatedBase = NotationTranslator.translateFullContent(baseReference.content, nextStyle);
      setContent(translated);
      setBaseReference({ content: translatedBase, instrument: baseReference.instrument });
      updateStateAndStorage(title, translated, activeInstrument, translatedBase, baseReference.instrument, nextStyle);
    }
  };

  const handleSelectTargetKey = (targetKeyStr: string) => {
    setPendingTargetKey(targetKeyStr);
    setIsTransposeModalOpen(false);
    setIsSaveModalOpen(true);
  };

  const handleUpdateExisting = () => {
    if (!pendingTargetKey) return;
    const semitones = TranspositionEngine.calculateShift(currentKey, pendingTargetKey);
    const transposedContent = TranspositionEngine.transposeBySemitones(content, semitones);
    setBaseReference({ content: transposedContent, instrument: activeInstrument });
    updateStateAndStorage(title, transposedContent, activeInstrument, transposedContent, activeInstrument);
    setIsSaveModalOpen(false);
    setPendingTargetKey('');
  };

  const handleSaveAsNew = (suggestedTitle: string) => {
    if (!pendingTargetKey) return;
    const semitones = TranspositionEngine.calculateShift(currentKey, pendingTargetKey);
    const transposedContent = TranspositionEngine.transposeBySemitones(content, semitones);

    const keyResult = KeyDetector.detectKey(transposedContent, notationStyle, activeInstrument);

    const newNoteId = Date.now().toString();
    const newNote: SongNote = {
      id: newNoteId,
      title: suggestedTitle,
      content: transposedContent,
      activeInstrument: activeInstrument,
      baseContent: transposedContent,
      baseInstrument: activeInstrument,
      detectedKey: keyResult.trumpetKey,
      concertKey: keyResult.concertKey,
      updatedAt: Date.now()
    };

    NoteStorageService.save(newNote);
    onNoteChange(newNote);

    setTitle(suggestedTitle);
    setContent(transposedContent);
    setBaseReference({ content: transposedContent, instrument: activeInstrument });
    setIsSaveModalOpen(false);
    setPendingTargetKey('');
  };

  const handleCancelSave = () => {
    setIsSaveModalOpen(false);
    setPendingTargetKey('');
  };

  const updateStateAndStorage = (
    newTitle: string,
    newContent: string,
    newInstrument: 'keyboard' | 'trumpet',
    newBaseContent?: string,
    newBaseInstrument?: 'keyboard' | 'trumpet',
    explicitStyle?: NotationStyle
  ) => {
    setTitle(newTitle);
    setContent(newContent);
    setActiveInstrument(newInstrument);

    const effectiveBaseContent = newBaseContent !== undefined ? newBaseContent : newContent;
    const effectiveBaseInstrument = newBaseInstrument !== undefined ? newBaseInstrument : newInstrument;

    setBaseReference({ content: effectiveBaseContent, instrument: effectiveBaseInstrument });

    const activeStyle = explicitStyle || (notation === 'natural' ? 'LATIN' : 'ENGLISH');
    const keyResult = KeyDetector.detectKey(newContent, activeStyle, newInstrument);
    const detectedKey = keyResult.trumpetKey;
    const concertKey = keyResult.concertKey;

    const updated: SongNote = {
      ...note,
      title: newTitle,
      content: newContent,
      activeInstrument: newInstrument,
      baseContent: effectiveBaseContent,
      baseInstrument: effectiveBaseInstrument,
      detectedKey,
      concertKey,
      updatedAt: Date.now()
    };
    onNoteChange(updated);

    const isTitleEmpty = !newTitle || newTitle.trim() === '';
    const isContentEmpty = !newContent || newContent.trim() === '';
    if (!isTitleEmpty || !isContentEmpty) {
      NoteStorageService.save(updated);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateStateAndStorage(e.target.value, content, activeInstrument, baseReference.content, baseReference.instrument);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = activeInstrument === 'trumpet' ? normalizeFlatsToSharps(e.target.value) : e.target.value;
    updateStateAndStorage(title, newText, activeInstrument, newText, activeInstrument);
  };

  const handleToggleInstrument = () => {
    const nextInstrument: 'keyboard' | 'trumpet' = activeInstrument === 'keyboard' ? 'trumpet' : 'keyboard';
    let nextContent: string;
    if (nextInstrument === baseReference.instrument) {
      nextContent = nextInstrument === 'trumpet'
        ? normalizeFlatsToSharps(baseReference.content)
        : baseReference.content;
    } else if (nextInstrument === 'trumpet') {
      nextContent = normalizeFlatsToSharps(transposeText(baseReference.content, 'KEYBOARD_TO_TRUMPET'));
    } else {
      nextContent = transposeText(baseReference.content, 'TRUMPET_TO_KEYBOARD');
    }

    updateStateAndStorage(title, nextContent, nextInstrument, baseReference.content, baseReference.instrument);
  };

  const handleSaveAndExit = () => {
    const isTitleEmpty = !title || title.trim() === '';
    const isContentEmpty = !content || content.trim() === '';

    if (isTitleEmpty && isContentEmpty) {
      if (note?.id) {
        NoteStorageService.delete(note.id);
      }
      onSaveAndExit();
      return;
    }

    let finalTitle = title.trim();
    if (!finalTitle) {
      const firstLine = content.split('\n')[0].trim();
      finalTitle = firstLine ? firstLine.substring(0, 30) : 'Canción sin título';
    }

    const keyResult = KeyDetector.detectKey(content, notationStyle, activeInstrument);

    const noteToSave: SongNote = {
      id: note?.id || Date.now().toString(),
      title: finalTitle,
      content: content,
      activeInstrument: activeInstrument || 'keyboard',
      baseContent: baseReference.content,
      baseInstrument: baseReference.instrument,
      detectedKey: keyResult.trumpetKey,
      concertKey: keyResult.concertKey,
      updatedAt: Date.now()
    };

    NoteStorageService.save(noteToSave);
    onNoteChange(noteToSave);
    onSaveAndExit();
  };

  const dismissKeyboard = () => {
    if (isKeyboardMode) {
      if (textareaRef.current) textareaRef.current.blur();
      setIsKeyboardMode(false);
    }
  };

  const handleNaturalNoteInsert = (e: React.SyntheticEvent, noteStr: string) => {
    e.preventDefault();
    dismissKeyboard();
    const textarea = textareaRef.current;
    if (!textarea) {
      const needsSpace = content.length > 0 && !content.endsWith(' ') && !content.endsWith('\n');
      const toInsert = `${needsSpace ? ' ' : ''}${noteStr} `;
      updateStateAndStorage(title, `${content}${toInsert}`, activeInstrument);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const needsSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const toInsert = `${needsSpace ? ' ' : ''}${noteStr} `;
    const newContent = `${before}${toInsert}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);
    const nextPos = start + toInsert.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
        textarea.focus();
      }
    });
  };

  const handleSharpInsert = (e: React.SyntheticEvent) => {
    e.preventDefault();
    dismissKeyboard();
    const textarea = textareaRef.current;
    if (!textarea) {
      const trimmed = content.replace(/\s+$/, '');
      const toInsert = `# `;
      updateStateAndStorage(title, `${trimmed}${toInsert}`, activeInstrument);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    let before = content.substring(0, start).replace(/\s+$/, '');
    const after = content.substring(end);
    const toInsert = `# `;
    const newContent = `${before}${toInsert}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);
    const nextPos = before.length + toInsert.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
        textarea.focus();
      }
    });
  };

  const handleInsertSymbol = (e: React.SyntheticEvent, symbol: string) => {
    e.preventDefault();
    dismissKeyboard();

    const textarea = textareaRef.current;
    if (!textarea) {
      updateStateAndStorage(title, `${content}${symbol}`, activeInstrument);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = `${before}${symbol}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);

    const nextPos = start + symbol.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
        textarea.focus();
      }
    });
  };

  const handleBackspace = (e: React.SyntheticEvent) => {
    e.preventDefault();
    dismissKeyboard();

    const textarea = textareaRef.current;
    if (!textarea) {
      const newContent = content.trimEnd().replace(/(\S+|\n)\s*$/, '');
      updateStateAndStorage(title, newContent, activeInstrument);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;

    if (start === 0 && end === 0) return;

    let before = content.substring(0, start);
    const after = content.substring(end);

    if (start !== end) {
      const newContent = `${content.substring(0, start)}${after}`;
      updateStateAndStorage(title, newContent, activeInstrument);
      requestAnimationFrame(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = start;
        textarea.focus();
      });
      return;
    }

    const match = before.match(/(\S+|\n)\s*$/);
    let deleteCount = 1;
    if (match) {
      deleteCount = match[0].length;
    }

    const newBefore = before.slice(0, -deleteCount);
    const newContent = `${newBefore}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);

    const nextPos = Math.max(0, start - deleteCount);
    requestAnimationFrame(() => {
      textarea.selectionStart = nextPos;
      textarea.selectionEnd = nextPos;
      textarea.focus();
    });
  };

  const handleToggleKeyboard = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsKeyboardMode(true);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const baseNotesEn = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const baseNotesNat = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  const quickAssistNotes = notationStyle === 'ENGLISH' ? baseNotesEn : baseNotesNat;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto h-full pt-4 px-4 sm:px-6 pb-48 sm:pb-52 animate-in fade-in duration-150">
      
      {/* Cabecera Limpia al Estilo Google Keep */}
      <div className="flex flex-col gap-3.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
        
        {/* Fila 1: Botón Guardar / Salir y Título */}
        <div className="flex items-center justify-between gap-3">
          <input 
            type="text" 
            placeholder="Título de la canción..."
            className="text-2xl sm:text-3xl font-extrabold bg-transparent outline-none w-full text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 tracking-tight"
            value={title}
            onChange={handleTitleChange}
          />

          <button
            type="button"
            onClick={handleSaveAndExit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-sm hover:shadow-md transition transform active:scale-95 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
            title="Guardar y volver a la biblioteca"
          >
            <Check size={18} strokeWidth={2.8} />
            <span className="hidden sm:inline">Listo</span>
          </button>
        </div>
        
        {/* Fila 2: Insignias de Tonalidad y Controles Agrupados */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Bloque Armónico: Tonalidades Duales */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeInstrument === 'trumpet' ? (
              <>
                <div className="inline-flex items-center gap-1.5 bg-amber-100/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                  <span>🎺 Trompeta:</span>
                  <span className="bg-white dark:bg-[#1A1A1C] px-2 py-0.5 rounded-full font-black text-amber-900 dark:text-amber-200">
                    {dualKeyResult.trumpetKey}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800/80 dark:text-blue-300/80 border border-blue-200/50 dark:border-blue-900/40 px-2.5 py-1 rounded-full text-xs font-medium">
                  <span>🎹 Teclado:</span>
                  <span className="font-semibold">{dualKeyResult.concertKey}</span>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 bg-blue-100/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border border-blue-300/80 dark:border-blue-700/60 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                  <span>🎹 Teclado:</span>
                  <span className="bg-white dark:bg-[#1A1A1C] px-2 py-0.5 rounded-full font-black text-blue-900 dark:text-blue-200">
                    {dualKeyResult.concertKey}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800/80 dark:text-amber-300/80 border border-amber-200/50 dark:border-amber-900/40 px-2.5 py-1 rounded-full text-xs font-medium">
                  <span>🎺 Trompeta:</span>
                  <span className="font-semibold">{dualKeyResult.trumpetKey}</span>
                </div>
              </>
            )}
          </div>

          {/* Bloque de Acciones Rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button"
              onClick={() => setIsTransposeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#202124] hover:bg-gray-100 dark:hover:bg-[#2A2B2D] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700/80 transition shadow-2xs cursor-pointer active:scale-95"
              title="Cambiar Tonalidad de la canción"
            >
              <RefreshCw size={13} className="text-amber-500" />
              <span>Cambiar Tono</span>
            </button>

            <button 
              type="button"
              onClick={handleToggleNotation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#202124] hover:bg-gray-100 dark:hover:bg-[#2A2B2D] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700/80 transition shadow-2xs cursor-pointer active:scale-95"
              title="Conmutar notación (Inglés ↔ Solfeo)"
            >
              <Globe2 size={13} className="text-amber-500" />
              <span>{notationStyle === 'ENGLISH' ? 'EN' : 'Solfeo'}</span>
            </button>

            <button 
              type="button"
              onClick={handleToggleInstrument}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 ${
                activeInstrument === 'keyboard' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              title="Alternar instrumento activo (transpone notas actuales)"
            >
              <span>{activeInstrument === 'keyboard' ? '🎹 Teclado' : '🎺 Trompeta'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Área de Escritura Protagonista */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleTextChange}
        inputMode={isKeyboardMode ? 'text' : 'none'}
        placeholder="Escribe aquí las notas o acordes (ej. C E G B o Do Mi Sol)..."
        className="w-full flex-1 bg-transparent resize-none outline-none text-xl sm:text-2xl text-gray-900 dark:text-gray-100 leading-relaxed font-mono min-h-[55vh]"
      />

      {/* Barra Asistente Táctil de 2 Niveles (Estilo Piano Card Keep) */}
      <div className="fixed sm:absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#202124]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/90 dark:border-gray-700/80 p-2 sm:p-2.5 flex flex-col gap-1.5 z-40 w-[96%] max-w-[620px]">
        
        {/* FILA SUPERIOR: NOTAS NATURALES Y SOSTENIDO (#) */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full">
          {quickAssistNotes.map((n) => (
            <button 
              type="button"
              key={n} 
              onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
              onClick={(e) => handleNaturalNoteInsert(e, n)}
              className="flex-1 min-w-[32px] sm:min-w-[42px] h-12 sm:h-13 flex items-center justify-center bg-white dark:bg-[#28292A] hover:bg-amber-50 dark:hover:bg-amber-950/30 active:bg-amber-100 text-amber-700 dark:text-amber-400 border border-gray-200/80 dark:border-gray-700/70 rounded-xl font-bold text-base sm:text-lg transition-all active:scale-95 cursor-pointer select-none shadow-2xs"
            >
              {n}
            </button>
          ))}
          
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleSharpInsert(e)}
            className="flex-1 min-w-[32px] sm:min-w-[42px] h-12 sm:h-13 flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl font-black text-lg sm:text-xl transition-all active:scale-95 cursor-pointer select-none shadow-xs"
            title="Sostenido (#)"
          >
            #
          </button>
        </div>

        {/* FILA INFERIOR: UTILIDADES, COMPÁS, BORRADO NEUTRAL Y TECLADO VIRTUAL */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full pt-1 border-t border-gray-100 dark:border-gray-800">
          {/* Salto de línea */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '\n')}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center bg-gray-100/90 dark:bg-[#28292A] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm sm:text-base transition active:scale-95 cursor-pointer select-none"
            title="Salto de línea (↵)"
          >
            ↵
          </button>

          {/* Separador de compás */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '/ ')}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center bg-gray-100/90 dark:bg-[#28292A] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm sm:text-base transition active:scale-95 cursor-pointer select-none"
            title="Separador de compás (/)"
          >
            /
          </button>

          {/* Asterisco para anotaciones */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '*')}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center bg-gray-100/90 dark:bg-[#28292A] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm sm:text-base transition active:scale-95 cursor-pointer select-none"
            title="Anotación (*)"
          >
            *
          </button>

          {/* Botón Borrar: Aspecto NEUTRAL (no destructivo como requerido) */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={handleBackspace}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center bg-gray-200/80 dark:bg-[#323336] hover:bg-gray-300 dark:hover:bg-[#3D3E42] active:bg-gray-400 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-sm sm:text-base transition active:scale-95 cursor-pointer select-none border border-gray-300/40 dark:border-gray-600/40"
            title="Borrar nota o símbolo anterior (⌫)"
          >
            ⌫
          </button>

          {/* Abrir Teclado Virtual del Celular */}
          <button 
            type="button"
            onClick={handleToggleKeyboard}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:bg-blue-200 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 rounded-xl font-bold text-sm sm:text-base transition active:scale-95 cursor-pointer select-none"
            title="Abrir teclado del teléfono para texto libre"
          >
            ⌨️
          </button>
        </div>
      </div>

      {/* Modal para Seleccionar Tonalidad */}
      <KeyTransposeModal
        isOpen={isTransposeModalOpen}
        currentKey={currentKey}
        onConfirm={handleSelectTargetKey}
        onCancel={() => setIsTransposeModalOpen(false)}
      />

      {/* Modal de Confirmación y Guardado de Transposición */}
      <TranspositionSaveModal
        isOpen={isSaveModalOpen}
        targetKey={pendingTargetKey}
        songTitle={title}
        onUpdateExisting={handleUpdateExisting}
        onSaveAsNew={handleSaveAsNew}
        onCancel={handleCancelSave}
      />
    </div>
  );
}
