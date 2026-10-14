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

    // Compute concert pitch key for categorization
    const concertContent = newInstrument === 'trumpet'
      ? transposeText(newContent, 'TRUMPET_TO_KEYBOARD')
      : newContent;
    const detectedKey = detectKey(concertContent);

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

    const concertContent = activeInstrument === 'trumpet'
      ? transposeText(content, 'TRUMPET_TO_KEYBOARD')
      : content;
    const detectedKey = detectKey(concertContent);

    const noteToSave: SongNote = {
      id: note?.id || Date.now().toString(),
      title: finalTitle,
      content: content,
      activeInstrument: activeInstrument || 'keyboard',
      detectedKey: detectedKey,
      updatedAt: Date.now()
    };

    NoteStorageService.save(noteToSave);
    onNoteChange(noteToSave);
    onSaveAndExit();
  };

  const handleQuickNoteInsert = (e: React.SyntheticEvent, noteToAdd: string) => {
    // CRÍTICO: Prevenir el comportamiento por defecto para que el celular NO despliegue el teclado virtual QWERTY
    e.preventDefault();

    const textarea = textareaRef.current;
    if (!textarea) {
      const spaceBefore = content.length > 0 && !content.endsWith(' ') && !content.endsWith('\n') ? ' ' : '';
      const inserted = `${spaceBefore}${noteToAdd} `;
      updateStateAndStorage(title, content + inserted, activeInstrument);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.substring(0, start);
    const after = content.substring(end);

    // Espaciado inteligente
    let inserted = '';
    if (noteToAdd === '#') {
      inserted = '# ';
    } else {
      const spaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
      inserted = `${spaceBefore}${noteToAdd} `;
    }

    const newContent = `${before}${inserted}${after}`;
    updateStateAndStorage(title, newContent, activeInstrument);

    // Actualizar posición del cursor internamente sin provocar focus invasivo
    const nextPos = start + inserted.length;
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = nextPos;
        textarea.selectionEnd = nextPos;
      }
    });
  };

  const baseNotesEn = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const baseNotesNat = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  const quickAssistNotes = notation === 'en' ? baseNotesEn : baseNotesNat;

  return (
    <div className="flex flex-col w-full h-full pt-4 px-4 pb-32">
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

      {/* Bottom Bar: absolute inside the parent wrapper */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#28292A] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-wrap justify-center gap-1 sm:gap-2 z-40 w-[95%] sm:w-auto max-w-[460px]">
        <button 
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={(e) => handleQuickNoteInsert(e, '#')}
          className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[#1F1F1F] hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl font-bold text-lg sm:text-xl text-gray-800 dark:text-gray-200 transition active:scale-95 cursor-pointer select-none"
        >
          #
        </button>
        <div className="w-px bg-gray-200 dark:bg-gray-700 my-2 mx-1 hidden sm:block"></div>
        {quickAssistNotes.map(n => (
          <button 
            key={n} 
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onClick={(e) => handleQuickNoteInsert(e, n)}
            className="flex-1 min-w-[36px] h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-[#28292A] hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-500 border border-amber-100 dark:border-amber-900/30 rounded-xl font-bold text-sm sm:text-lg transition active:scale-95 cursor-pointer select-none"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
