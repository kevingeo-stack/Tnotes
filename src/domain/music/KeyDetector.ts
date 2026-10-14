import { SharpPitch, normalizeToSharp, PITCH_CLASSES } from './PitchClass';

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const LATIN_TO_SHARP: Record<string, SharpPitch> = {
    'do': 'C',
    're': 'D',
    'mi': 'E',
    'fa': 'F',
    'sol': 'G',
    'so': 'G',
    'la': 'A',
    'si': 'B',
    'ti': 'B'
};

function pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, _, i) => a + x[i] * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0) return 0;
    return numerator / denominator;
}

export const cleanMusicContent = (rawText: string): string => {
    if (!rawText) return '';
    // Elimina todo lo que esté entre asteriscos: *comentario* o *comentario sin cerrar
    return rawText.replace(/\*[^*]*\*?/g, ' ');
};

export function detectKey(input: string | string[]): string {
    const frequencies: number[] = new Array(12).fill(0);
    let totalNotes = 0;

    const processMatch = (match: string) => {
        const clean = match.replace(/♯/g, '#').replace(/♭/g, 'b');
        const pitch = normalizeToSharp(clean);
        if (pitch) {
            const index = PITCH_CLASSES.indexOf(pitch);
            frequencies[index]++;
            totalNotes++;
        }
    };

    if (Array.isArray(input)) {
        for (const token of input) {
            const sanitized = cleanMusicContent(token);
            if (sanitized.trim()) {
                processMatch(sanitized.trim());
            }
        }
    } else {
        const sanitized = cleanMusicContent(input);
        const cleanInput = sanitized.replace(/♯/g, '#').replace(/♭/g, 'b');
        
        // Detect Latin solfège notes if present
        const latinRegex = /\b(Do|Re|Mi|Fa|Sol|So|La|Si|Ti)([#b])?(\d+)?\b/gi;
        const latinMatches = cleanInput.match(latinRegex);
        if (latinMatches && latinMatches.length >= 3) {
            for (const m of latinMatches) {
                const sub = m.match(/^(Do|Re|Mi|Fa|Sol|So|La|Si|Ti)([#b])?/i);
                if (sub) {
                    const base = LATIN_TO_SHARP[sub[1].toLowerCase()];
                    if (base) processMatch(`${base}${sub[2] || ''}`);
                }
            }
        } else {
            // Process English notes while ignoring spaces, punctuation, numbers, and extra chars
            const matches = cleanInput.match(/([A-Ga-g][#b]?)/g);
            if (matches) {
                for (const match of matches) {
                    processMatch(match);
                }
            }
        }
    }

    if (totalNotes < 3) return "Indeterminada";

    // Normalize frequencies
    const vector = frequencies.map(f => f / totalNotes);

    let bestMatch = "Indeterminada";
    let maxScore = -Infinity;

    for (let i = 0; i < 12; i++) {
        // Rotate profiles
        const rotatedMajor = new Array(12);
        const rotatedMinor = new Array(12);
        for (let j = 0; j < 12; j++) {
            rotatedMajor[j] = MAJOR_PROFILE[(j - i + 12) % 12];
            rotatedMinor[j] = MINOR_PROFILE[(j - i + 12) % 12];
        }
        
        let scoreMajor = pearsonCorrelation(vector, rotatedMajor);
        let scoreMinor = pearsonCorrelation(vector, rotatedMinor);

        // Verification of root, third, and fifth presence
        const hasTonic = frequencies[i] > 0;
        const hasMinor3rd = frequencies[(i + 3) % 12] > 0;
        const hasMajor3rd = frequencies[(i + 4) % 12] > 0;
        const has5th = frequencies[(i + 7) % 12] > 0;

        // If tonic root is completely absent from the song, heavily penalize
        if (!hasTonic) {
            scoreMajor -= 0.5;
            scoreMinor -= 0.5;
        } else {
            // Ponder strongly tonic and minor third for minor profile
            if (hasMinor3rd) scoreMinor += 0.2;
            if (has5th && hasMinor3rd) scoreMinor += 0.15; // Complete minor triad

            if (hasMajor3rd) scoreMajor += 0.2;
            if (has5th && hasMajor3rd) scoreMajor += 0.15; // Complete major triad
        }
        
        if (scoreMajor > maxScore) {
            maxScore = scoreMajor;
            bestMatch = `${PITCH_CLASSES[i]} Mayor`;
        }
        if (scoreMinor > maxScore) {
            maxScore = scoreMinor;
            bestMatch = `${PITCH_CLASSES[i]} Menor`;
        }
    }

    return bestMatch;
}

export interface KeySignatureMatch {
    key: string;
    name: string;
    concertEquivalent: string;
    confidence: number;
    mode: 'major' | 'minor';
}

export class KeyDetector {
    static detect(input: any): string {
        const stringInput = Array.isArray(input) 
            ? input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item)))
            : (typeof input === 'string' ? input : String(input));
        return detectKey(stringInput);
    }

    static detectKey(input: any): KeySignatureMatch {
        const stringInput = Array.isArray(input) 
            ? input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item)))
            : (typeof input === 'string' ? input : String(input));
        const key = detectKey(stringInput);
        return { 
            key, 
            name: key,
            concertEquivalent: key,
            confidence: 1, 
            mode: key.includes('Mayor') ? 'major' : 'minor' 
        };
    }

    static detectDetailed(input: any): KeySignatureMatch {
        return this.detectKey(input);
    }
}
