import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { transposeText } from '../../domain/music/TranspositionEngine';
import { detectKey } from '../../domain/music/KeyDetector';
import { formatKeyName, NotationSystem } from '../../domain/music/NotationSystem';
import { SongNote } from '../../types/note';
import { NoteStorageService } from '../../services/storage/NoteStorageService';

interface NoteEditorViewProps {
  note: SongNote;
  onNoteChange: (updated: SongNote) => void;
  onSaveAndExit: () => void;
  notation: NotationSystem;
}

export function NoteEditorView({ note, onNoteChange, onSaveAndExit, notation }: NoteEditorViewProps) {
  const [activeInstrument, setActiveInstrument] = useState<'keyboard' | 'trumpet'>(note.activeInstrument || 'keyboard');
  const [content, setContent] = useState<string>(note.content || '');
  const [title, setTitle] = useState<string>(note.title || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active note changes
  useEffect(() => {
    setActiveInstrument(note.activeInstrument || 'keyboard');
    setContent(note.content || '');
    setTitle(note.title || '');
  }, [note.id]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const currentKey = useMemo(() => detectKey(content), [content]);
  const formattedKey = useMemo(() => formatKeyName(currentKey, notation), [currentKey, notation]);

  const updateStateAndStorage = (newTitle: string, newContent: string, newInstrument: 'keyboard' | 'trumpet') => {
    setTitle(newTitle);
    setContent(newContent);
    setActiveInstrument(newInstrument);

    const detectedKey = detectKey(newContent);

    const updated: SongNote = {
      ...note,
      title: newTitle,
      content: newContent,
      activeInstrument: newInstrument,
      detectedKey,
      updatedAt: Date.now()
    };
    onNoteChange(updated);

    const isTitleEmpty = !newTitle || newTitle.trim() === '';
    const isContentEmpty = !newContent || newContent.trim() === '';
    // Only persist while typing if there is actual content or title
    if (!isTitleEmpty || !isContentEmpty) {
      NoteStorageService.save(updated);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateStateAndStorage(e.target.value, content, activeInstrument);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // When editing directly, text is taken as-is in the active instrument
    updateStateAndStorage(title, e.target.value, activeInstrument);
  };

  const handleToggleInstrument = () => {
    if (activeInstrument === 'keyboard') {
      // Transpose +2 semitones to trumpet
      const transposed = transposeText(content, 'KEYBOARD_TO_TRUMPET');
      updateStateAndStorage(title, transposed, 'trumpet');
    } else {
      // Transpose -2 semitones to keyboard
      const transposed = transposeText(content, 'TRUMPET_TO_KEYBOARD');
      updateStateAndStorage(title, transposed, 'keyboard');
    }
  };

  const handleSaveAndExit = () => {
    const isTitleEmpty = !title || title.trim() === '';
    const isContentEmpty = !content || content.trim() === '';

    if (isTitleEmpty && isContentEmpty) {
      // Si el usuario entró a la nota pero NO escribió nada:
      // NO guardarla. Si existía una nota previa con este ID que ahora quedó vacía, eliminarla.
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

    // Detección tonal sobre el cuerpo completo usando detectKey(content) como fuente de verdad absoluta
    const currentFullKey = detectKey(content);

    const noteToSave: SongNote = {
      id: note?.id || Date.now().toString(),
      title: finalTitle,
      content: content,
      activeInstrument: activeInstrument || 'keyboard',
      detectedKey: currentFullKey, // Fuente de verdad absoluta
      updatedAt: Date.now()
    };

    NoteStorageService.save(noteToSave);
    onNoteChange(noteToSave);
    onSaveAndExit();
  };

  const dismissKeyboard = () => {
    if (textareaRef.current) textareaRef.current.blur();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const handleNaturalNoteInsert = (e: React.SyntheticEvent, note: string) => {
    e.preventDefault();
    dismissKeyboard();
    const textarea = textareaRef.current;
    if (!textarea) {
      const needsSpace = content.length > 0 && !content.endsWith(' ') && !content.endsWith('\n');
      const toInsert = `${needsSpace ? ' ' : ''}${note} `;
      updateStateAndStorage(title, `${content}${toInsert}`, activeInstrument);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const needsSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const toInsert = `${needsSpace ? ' ' : ''}${note} `;
    const newContent = `${before}${toInsert}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);
    const nextPos = start + toInsert.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
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
    let before = content.substring(0, start).replace(/\s+$/, ''); // Une el '#' a la nota anterior
    const after = content.substring(end);
    const toInsert = `# `;
    const newContent = `${before}${toInsert}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);
    const nextPos = before.length + toInsert.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
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
      }
    });
  };

  const handleBackspace = (e: React.SyntheticEvent) => {
    e.preventDefault();
    dismissKeyboard();

    const textarea = textareaRef.current;
    if (!textarea) {
      const newContent = content.slice(0, -1);
      updateStateAndStorage(title, newContent, activeInstrument);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;

    if (start === 0 && end === 0) return;

    let before = content.substring(0, start);
    const after = content.substring(end);

    // Si hay selección, borra la selección; si no, borra el carácter anterior
    if (start === end) {
      before = before.slice(0, -1);
    }

    const newContent = `${before}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);

    const nextPos = Math.max(0, start === end ? start - 1 : start);
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
      }
    });
  };

  const handleOpenKeyboard = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const baseNotesEn = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const baseNotesNat = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  const quickAssistNotes = notation === 'en' ? baseNotesEn : baseNotesNat;

  return (
    <div className="flex flex-col w-full h-full pt-4 px-4 pb-36 sm:pb-40">
      <div className="flex flex-col gap-4 mb-6">
        
        {/* Header / Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSaveAndExit}
            className="w-11 h-11 flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-md transition transform active:scale-95"
            title="Confirmar y Guardar"
          >
            <Check size={24} strokeWidth={3} />
          </button>
        </div>

        <input 
          type="text" 
          placeholder="Título de la canción..."
          className="text-3xl font-bold bg-transparent outline-none w-full text-[#202124] dark:text-[#E8EAED] placeholder-gray-400 dark:placeholder-gray-500"
          value={title}
          onChange={handleTitleChange}
        />
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-3.5 py-1.5 rounded-full text-sm font-semibold shadow-sm flex items-center gap-2 border border-amber-200 dark:border-amber-800">
            <span>{activeInstrument === 'keyboard' ? '🎹 Tono Teclado:' : '🎺 Tono Trompeta:'}</span>
            <span className="bg-white dark:bg-[#1F1F1F] px-2 py-0.5 rounded-full">{formattedKey}</span>
          </div>

          <button 
            type="button"
            onClick={handleToggleInstrument}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition shadow-sm border cursor-pointer active:scale-95 ${
              activeInstrument === 'keyboard' 
                ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-700 dark:border-gray-600 hover:bg-gray-700 dark:hover:bg-gray-600' 
                : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
            }`}
            title="Conmutar instrumento (transpone ±2 semitonos el texto actual)"
          >
            {activeInstrument === 'keyboard' ? '🎹 Teclado' : '🎺 Trompeta'}
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleTextChange}
        placeholder="Escribe tus acordes o notas aquí..."
        className="w-full flex-1 bg-transparent resize-none outline-none text-xl text-[#202124] dark:text-[#E8EAED] leading-relaxed font-mono min-h-[50vh]"
      />

      {/* Two-Tier Assistant Toolbar */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#28292A] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 sm:p-2.5 flex flex-col gap-2 z-40 w-[96%] sm:w-auto max-w-[640px]">
        
        {/* FILA SUPERIOR: EXCLUSIVAMENTE NOTAS AMPLIADAS Y SOSTENIDO (#) */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full">
          {quickAssistNotes.map((n) => (
            <button 
              type="button"
              key={n} 
              onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
              onClick={(e) => handleNaturalNoteInsert(e, n)}
              className="flex-1 min-w-[32px] sm:min-w-[42px] h-12 sm:h-14 flex items-center justify-center bg-white dark:bg-[#28292A] hover:bg-amber-50 dark:hover:bg-amber-900/25 active:bg-amber-100 text-amber-700 dark:text-amber-500 border border-amber-200 dark:border-amber-800/40 rounded-xl font-bold text-base sm:text-xl transition active:scale-95 cursor-pointer select-none shadow-xs"
            >
              {n}
            </button>
          ))}
          
          {/* Botón Sostenido (#) integrado en la fila superior */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleSharpInsert(e)}
            className="flex-1 min-w-[32px] sm:min-w-[42px] h-12 sm:h-14 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/60 rounded-xl font-bold text-lg sm:text-2xl transition active:scale-95 cursor-pointer select-none shadow-xs"
            title="Sostenido (#)"
          >
            #
          </button>
        </div>

        {/* FILA INFERIOR: UTILIDADES, PUNTUACIÓN, BORRAR Y TECLADO */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full pt-1 border-t border-gray-100 dark:border-gray-700/60">
          {/* Salto de línea */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '\n')}
            className="flex-1 h-10 sm:h-11 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/60 rounded-xl font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer select-none"
            title="Salto de línea (↵)"
          >
            ↵
          </button>

          {/* Separador de compás */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '/ ')}
            className="flex-1 h-10 sm:h-11 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/60 rounded-xl font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer select-none"
            title="Separador de compás (/)"
          >
            /
          </button>

          {/* Asterisco para anotaciones */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={(e) => handleInsertSymbol(e, '*')}
            className="flex-1 h-10 sm:h-11 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/60 rounded-xl font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer select-none"
            title="Asterisco para anotaciones (*)"
          >
            *
          </button>

          {/* Botón Borrar (Backspace) */}
          <button 
            type="button"
            onPointerDown={(e) => { e.preventDefault(); dismissKeyboard(); }}
            onClick={handleBackspace}
            className="flex-1 h-10 sm:h-11 flex items-center justify-center bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer select-none"
            title="Borrar (⌫)"
          >
            ⌫
          </button>

          {/* Botón para Abrir el Teclado Virtual del Celular */}
          <button 
            type="button"
            onClick={handleOpenKeyboard}
            className="flex-1 h-10 sm:h-11 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 rounded-xl font-bold text-base sm:text-lg transition active:scale-95 cursor-pointer select-none"
            title="Abrir teclado virtual (⌨️)"
          >
            ⌨️
          </button>
        </div>
      </div>
    </div>
  );
}
