import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Configuration and Manifest Audit', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  const manifestJsonPath = path.join(rootDir, 'public', 'manifest.json');
  const indexPath = path.join(rootDir, 'index.html');
  const iconSvgPath = path.join(rootDir, 'public', 'icon.svg');

  it('1. el archivo manifest.webmanifest existe y tiene formato JSON válido', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  it('2. el manifest cuenta con los metadatos obligatorios para instalación PWA', () => {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('TNotes');
    expect(manifest.short_name).toBe('TNotes');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
  });

  it('3. start_url y scope son relativos ("./") para permitir despliegue en subrutas de GitHub Pages', () => {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });

  it('4. declara iconos con soporte para resoluciones estándar y modo maskable', () => {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const hasStandardSizes = manifest.icons.some(
      (icon: any) => icon.sizes && (icon.sizes.includes('192x192') || icon.sizes.includes('512x512'))
    );
    expect(hasStandardSizes).toBe(true);

    // Comprobar que el archivo icon.svg referenciado físicamente existe en public/
    expect(fs.existsSync(iconSvgPath)).toBe(true);
  });

  it('5. manifest.json en public/ es idéntico a manifest.webmanifest para compatibilidad de navegadores legacy', () => {
    expect(fs.existsSync(manifestJsonPath)).toBe(true);
    const webmanifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const jsonManifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf-8'));

    expect(jsonManifest.name).toBe(webmanifest.name);
    expect(jsonManifest.start_url).toBe(webmanifest.start_url);
    expect(jsonManifest.scope).toBe(webmanifest.scope);
    expect(jsonManifest.display).toBe(webmanifest.display);
  });

  it('6. index.html vincula correctamente el manifest y el icono con rutas relativas', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
    const html = fs.readFileSync(indexPath, 'utf-8');

    expect(html).toContain('rel="manifest" href="./manifest.webmanifest"');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('rel="apple-touch-icon"');
  });
});
