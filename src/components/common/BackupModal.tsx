import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ListMusic,
  Music,
  Settings,
  HelpCircle
} from 'lucide-react';
import { BackupService } from '../../services/storage/BackupService';
import { NoteStorageService } from '../../services/storage/NoteStorageService';
import { SetlistStorageService } from '../../services/storage/SetlistStorageService';
import { ImportPlan, ImportValidationResult, ImportExecutionResult } from '../../types/backup';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

type ModalTab = 'export' | 'import';

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('export');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [importSettings, setImportSettings] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSongs = NoteStorageService.getAll();
  const currentSetlists = SetlistStorageService.getAll();

  const handleDownload = () => {
    try {
      BackupService.downloadBackup();
    } catch (e: any) {
      alert(`Error al generar el respaldo: ${e?.message || 'Error desconocido'}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setExecutionResult(null);
    setIsProcessing(true);

    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
      }

      const val = BackupService.validateBackupText(content);
      setValidationResult(val);

      if (val.isValid && val.payload) {
        const plan = BackupService.buildImportPlan(val.payload);
        setImportPlan(plan);
      } else {
        setImportPlan(null);
      }
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        errors: [`Error al leer el archivo: ${err?.message || 'Error de lectura'}`],
        warnings: []
      });
      setImportPlan(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!importPlan) return;
    setIsProcessing(true);

    try {
      const result = BackupService.executeImportPlan(importPlan, { importSettings });
      setExecutionResult(result);
      if (result.success) {
        onDataRestored?.();
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        songsAddedCount: 0,
        songsSkippedCount: 0,
        setlistsAddedCount: 0,
        setlistsSkippedCount: 0,
        unresolvedReferencesCount: 0,
        settingsImported: false,
        error: err?.message || 'Fallo durante la importación.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFileName(null);
    setValidationResult(null);
    setImportPlan(null);
    setExecutionResult(null);
    setImportSettings(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleResetImport();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-neutral-200 dark:border-neutral-800 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Download size={20} />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-neutral-100">
                Respaldo y Recuperación
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Copia de seguridad local sin conexión (.tnotes)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white dark:bg-[#1E1E1E] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Download size={16} />
            <span>Descargar Respaldo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white dark:bg-[#1E1E1E] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Upload size={16} />
            <span>Restaurar Copia</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ================= PESTAÑA EXPORTAR ================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <FileCheck size={18} />
                  <span>Tu biblioteca actual está lista para respaldarse</span>
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  El archivo generado incluirá todas tus alabanzas, listas de reproducción y tonalidades para que nunca pierdas tu repertorio.
                </p>
              </div>

              {/* Estadísticas de la biblioteca */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <Music size={20} />
                  </span>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">Canciones</span>
                    <span className="text-lg font-black text-neutral-800 dark:text-neutral-100">{currentSongs.length}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <ListMusic size={20} />
                  </span>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">Listas</span>
                    <span className="text-lg font-black text-neutral-800 dark:text-neutral-100">{currentSetlists.length}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 bg-neutral-50 dark:bg-neutral-900/30 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  ¿Cómo funciona el respaldo?
                </p>
                <p>• Se guardará un archivo <code>.tnotes</code> en tu carpeta de Descargas.</p>
                <p>• Puedes enviártelo por WhatsApp, guardarlo en Google Drive o restaurarlo en otro dispositivo.</p>
                <p>• La exportación es 100% segura y no modifica tus canciones actuales.</p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={18} />
                <span>Descargar Copia de Seguridad (.tnotes)</span>
              </button>
            </div>
          )}

          {/* ================= PESTAÑA IMPORTAR ================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Selector de Archivo */}
              {!selectedFileName && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-3xl p-8 text-center cursor-pointer transition bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 group"
                >
                  <Upload size={36} className="mx-auto mb-3 text-neutral-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                    Selecciona tu archivo de respaldo
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                    Formatos admitidos: <code>.tnotes</code> o <code>.json</code>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tnotes,.json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Archivo Seleccionado */}
              {selectedFileName && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">
                      {selectedFileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetImport}
                    className="text-xs text-neutral-500 hover:text-red-500 dark:hover:text-red-400 font-semibold px-2 py-1 rounded-lg transition"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {/* Errores de Validación */}
              {validationResult && !validationResult.isValid && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2">
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <AlertCircle size={16} />
                    <span>No se pudo procesar el archivo</span>
                  </h4>
                  <ul className="text-xs text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias */}
              {validationResult?.warnings && validationResult.warnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={15} />
                    Advertencias de compatibilidad:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Previsualización del Plan de Fusión */}
              {importPlan && !executionResult && (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                    <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                      <span>Resumen de Fusión Segura</span>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Modo Fusión (Merge)
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Canciones nuevas:</span>
                        <strong className="text-green-600 dark:text-green-400 text-sm">+{importPlan.songsToAdd.length}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Duplicados omitidos:</span>
                        <strong className="text-neutral-600 dark:text-neutral-400 text-sm">{importPlan.songsToSkipIdentical.length}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Listas nuevas:</span>
                        <strong className="text-blue-600 dark:text-blue-400 text-sm">+{importPlan.setlistsToAdd.length}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Listas omitidas:</span>
                        <strong className="text-neutral-600 dark:text-neutral-400 text-sm">{importPlan.setlistsToSkipIdentical.length}</strong>
                      </div>
                    </div>

                    {/* Conflictos resueltos */}
                    {importPlan.songConflicts.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                        <strong>{importPlan.songConflicts.length} conflicto(s) de identificador:</strong> Se conservaron ambas canciones asignando un nuevo identificador único a la entrante.
                      </div>
                    )}

                    {/* Referencias no resueltas */}
                    {importPlan.unresolvedReferences.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-xs text-orange-800 dark:text-orange-300">
                        <strong>Aviso de listas:</strong> Se encontraron {importPlan.unresolvedReferences.length} referencia(s) a canciones que no existen en el archivo ni en tu biblioteca. Las listas se importarán omitiendo esos huecos para evitar referencias rotas.
                      </div>
                    )}

                    {/* Checkbox de Preferencias */}
                    {importPlan.settings && (importPlan.settings.notation || importPlan.settings.theme) && (
                      <label className="flex items-center gap-2.5 pt-1 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={importSettings}
                          onChange={e => setImportSettings(e.target.checked)}
                          className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>
                          Importar preferencias de entorno ({importPlan.settings.notation ? `Notación: ${importPlan.settings.notation}` : ''} {importPlan.settings.theme ? `Tema: ${importPlan.settings.theme}` : ''})
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResetImport}
                      className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isProcessing}
                      className="flex-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 active:scale-98 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      <span>{isProcessing ? 'Procesando...' : 'Confirmar Fusión'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Resultado de la Ejecución */}
              {executionResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    executionResult.success
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  } space-y-2.5 text-center`}
                >
                  {executionResult.success ? (
                    <>
                      <CheckCircle2 size={32} className="mx-auto text-green-600 dark:text-green-400" />
                      <h4 className="text-sm font-bold text-green-800 dark:text-green-200">
                        ¡Restauración completada con éxito!
                      </h4>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        +{executionResult.songsAddedCount} canciones añadidas ({executionResult.songsSkippedCount} idénticas omitidas).<br/>
                        +{executionResult.setlistsAddedCount} listas añadidas.
                      </p>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="mt-2 py-2 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                      >
                        Entendido
                      </button>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={32} className="mx-auto text-red-600 dark:text-red-400" />
                      <h4 className="text-sm font-bold text-red-800 dark:text-red-200">
                        Error durante la importación
                      </h4>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {executionResult.error}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
