import { SharpPitch, PITCH_CLASSES, normalizeToSharp, normalizeKeyName } from './PitchClass';

export const NATURAL_CLASSES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const;
export type NaturalPitch = typeof NATURAL_CLASSES[number];

export type NotationSystem = 'en' | 'natural';

export function toNatural(pitchEn: string): string {
    const normalized = normalizeToSharp(pitchEn) || pitchEn;
    const index = PITCH_CLASSES.indexOf(normalized as SharpPitch);
    if (index === -1) return pitchEn;
    return NATURAL_CLASSES[index];
}

export function toEnglish(pitchNat: string): string {
    const normalized = normalizeToSharp(pitchNat) || pitchNat;
    const index = PITCH_CLASSES.indexOf(normalized as SharpPitch);
    if (index !== -1) return PITCH_CLASSES[index];

    const natIndex = NATURAL_CLASSES.indexOf(pitchNat as NaturalPitch);
    if (natIndex !== -1) return PITCH_CLASSES[natIndex];

    return pitchNat;
}

export function formatKeyName(keyName: string, system: NotationSystem): string {
    if (!keyName || keyName === 'Indeterminada' || keyName === 'Sin tono' || keyName === 'Desconocido') {
        return keyName || 'Sin tono';
    }
    
    const normalizedKey = normalizeKeyName(keyName);
    const parts = normalizedKey.split(' ');
    if (parts.length !== 2) return normalizedKey;

    const root = parts[0];
    const type = parts[1];

    if (system === 'natural') {
        return `${toNatural(root)} ${type}`;
    }
    
    return `${toEnglish(root)} ${type}`;
}

/**
 * Formats a key name for the dual tonal badge:
 * English mode: "Am / La Menor" or "C / Do Mayor"
 * Solfège/Natural mode: "Lam / La Menor" or "Do / Do Mayor"
 * Exclusively uses natural and sharp pitch classes.
 */
export function formatDualKeyDisplay(keyName: string, system: NotationSystem): string {
    if (!keyName || keyName === 'Indeterminada' || keyName === 'Sin tono' || keyName === 'Desconocido') {
        return keyName || 'Sin tono';
    }
    
    const normalizedKey = normalizeKeyName(keyName);
    const parts = normalizedKey.split(' ');
    if (parts.length !== 2) return normalizedKey;

    const root = parts[0];
    const type = parts[1];
    const isMinor = type === 'Menor';
    const enRoot = toEnglish(root);
    const natRoot = toNatural(root);

    if (system === 'natural') {
        const natChord = isMinor ? `${natRoot}m` : natRoot;
        return `${natChord} / ${natRoot} ${type}`;
    } else {
        const enChord = isMinor ? `${enRoot}m` : enRoot;
        return `${enChord} / ${natRoot} ${type}`;
    }
}
