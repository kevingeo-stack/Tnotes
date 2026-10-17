export type NotationStyle = 'ENGLISH' | 'LATIN';

const ENG_TO_LAT: Record<string, string> = {
  'C#': 'Do#', 'DB': 'Reb', 'C': 'Do',
  'D#': 'Re#', 'EB': 'Mib', 'D': 'Re',
  'E': 'Mi',
  'F#': 'Fa#', 'GB': 'Solb', 'F': 'Fa',
  'G#': 'Sol#', 'AB': 'Lab', 'G': 'Sol',
  'A#': 'La#', 'BB': 'Sib', 'A': 'La',
  'B': 'Si'
};

const LAT_TO_ENG: Record<string, string> = {
  'DO#': 'C#', 'REB': 'Db', 'DO': 'C',
  'RE#': 'D#', 'MIB': 'Eb', 'RE': 'D',
  'MI': 'E',
  'FA#': 'F#', 'SOLB': 'Gb', 'FA': 'F',
  'SOL#': 'G#', 'LAB': 'Ab', 'SOL': 'G',
  'LA#': 'A#', 'SIB': 'Bb', 'LA': 'A',
  'SI': 'B'
};

export class NotationTranslator {
  public static translateText(text: string, targetStyle: NotationStyle): string {
    if (!text) return text;

    // Dividir en bloques para no traducir comentarios entre asteriscos (*...*)
    return text.split(/(\*[^*]*\*?)/g).map(part => {
      if (part.startsWith('*')) return part; // Mantener comentarios intactos

      if (targetStyle === 'LATIN') {
        // Convertir de Inglés a Solfeo
        return part.replace(/(?<![a-zA-Z])(C#|Db|C|D#|Eb|D|E|F#|Gb|F|G#|Ab|G|A#|Bb|A|B)(?![a-zA-Z#b])/gi, match => {
          const key = match.toUpperCase();
          return ENG_TO_LAT[key] || match;
        });
      } else {
        // Convertir de Solfeo a Inglés
        return part.replace(/(?<![a-zA-Z])(Do#|Reb|Do|Re#|Mib|Re|Mi|Fa#|Solb|Fa|Sol#|Lab|Sol|La#|Sib|La|Si)(?![a-zA-Z#b])/gi, match => {
          const key = match.toUpperCase();
          return LAT_TO_ENG[key] || match;
        });
      }
    }).join('');
  }
}
