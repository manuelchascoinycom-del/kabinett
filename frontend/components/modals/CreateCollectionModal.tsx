import React from 'react';

interface CreateCollectionModalProps {
  isOpen: boolean;
  newCollectionName: string;
  setNewCollectionName: (name: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  newCollectionName,
  setNewCollectionName,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="bg-[#0d1322] border border-slate-800 p-6 rounded-xl w-full max-w-md space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-200">Crear Colección Virtual</h3>
        <input
          type="text"
          placeholder="Nombre de la colección"
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
};