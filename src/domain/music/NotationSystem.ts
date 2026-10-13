import { SharpPitch, PITCH_CLASSES } from './PitchClass';
import { transposeKeyName } from './TranspositionEngine';

export const NATURAL_CLASSES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const;
export type NaturalPitch = typeof NATURAL_CLASSES[number];

export type NotationSystem = 'en' | 'natural';

export function toNatural(pitchEn: string): string {
    const index = PITCH_CLASSES.indexOf(pitchEn as SharpPitch);
    if (index === -1) return pitchEn;
    return NATURAL_CLASSES[index];
}

export function toEnglish(pitchNat: string): string {
    const index = NATURAL_CLASSES.indexOf(pitchNat as NaturalPitch);
    if (index === -1) return pitchNat;
    return PITCH_CLASSES[index];
}

export function formatKeyName(keyName: string, system: NotationSystem): string {
    if (!keyName || keyName === 'Indeterminada') return 'Indeterminada';
    
    // keyName format: "C Mayor" or "D# Menor"
    const parts = keyName.split(' ');
    if (parts.length !== 2) return keyName;

    const root = parts[0];
    const type = parts[1];

    if (system === 'natural') {
        return `${toNatural(root)} ${type}`;
    }
    
    return keyName;
}

/**
 * Formats a key name for the dual tonal badge:
 * English mode: "Am / La Menor" or "C / Do Mayor"
 * Solfège/Natural mode: "Lam / La Menor" or "Do / Do Mayor"
 */
export function formatDualKeyDisplay(keyName: string, system: NotationSystem): string {
    if (!keyName || keyName === 'Indeterminada') return 'Indeterminada';
    
    const parts = keyName.split(' ');
    if (parts.length !== 2) return keyName;

    const root = parts[0];
    const type = parts[1];
    const isMinor = type === 'Menor';
    const natRoot = toNatural(root);

    if (system === 'natural') {
        const natChord = isMinor ? `${natRoot}m` : natRoot;
        return `${natChord} / ${natRoot} ${type}`;
    } else {
        const enChord = isMinor ? `${root}m` : root;
        return `${enChord} / ${natRoot} ${type}`;
    }
}
