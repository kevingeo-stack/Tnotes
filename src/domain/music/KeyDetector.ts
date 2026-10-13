import { SharpPitch, normalizeToSharp, PITCH_CLASSES, NOTE_REGEX } from './PitchClass';

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

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

export function detectKey(input: string | string[]): string {
    const frequencies: number[] = new Array(12).fill(0);
    let totalNotes = 0;

    const processMatch = (match: string) => {
        const pitch = normalizeToSharp(match);
        if (pitch) {
            const index = PITCH_CLASSES.indexOf(pitch);
            frequencies[index]++;
            totalNotes++;
        }
    };

    if (Array.isArray(input)) {
        for (const token of input) {
            processMatch(token);
        }
    } else {
        const matches = input.match(/([A-Ga-g][#b]?)/g);
        if (matches) {
            for (const match of matches) {
                processMatch(match);
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
        
        const scoreMajor = pearsonCorrelation(vector, rotatedMajor);
        const scoreMinor = pearsonCorrelation(vector, rotatedMinor);
        
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
