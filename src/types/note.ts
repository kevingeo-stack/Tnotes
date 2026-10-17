export interface SongNote {
  id: string;
  title: string;
  content: string;
  activeInstrument: 'keyboard' | 'trumpet'; // Persiste si la nota está en tono de teclado o trompeta
  detectedKey: string;
  concertKey?: string;
  updatedAt: number;
}

export interface SetlistItem {
  noteId: string;
  order: number;
}

export interface Setlist {
  id: string;
  name: string; // Nombre de la reunión / servicio
  songIds: string[]; // IDs de canciones asociadas a esta lista
  updatedAt: number;
}
