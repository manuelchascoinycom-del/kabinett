import React, { useState, useMemo } from 'react';
import { APP_TEXTS } from '@/app/constants/texts';
import { HasRole } from '@/components/auth/HasRole';
import { Collection as BaseCollection, collectionService } from '@/services/collectionService';

export interface Collection extends BaseCollection {
  // Aseguramos que los campos necesarios existen
  document_ids?: string[];
  children?: Collection[];
}

// Función auxiliar mejorada para calcular el total acumulado de la rama recursivamente
const calculateUniqueTotalDocuments = (collection: Collection): number => {
  const uniqueIds = new Set<string>();
  let fallbackSum = 0;
  let hasDocumentIds = false;

  const traverse = (col: Collection) => {
    // Si existen IDs detallados, los metemos al Set para asegurar unicidad
    if (col.document_ids && Array.isArray(col.document_ids) && col.document_ids.length > 0) {
      hasDocumentIds = true;
      col.document_ids.forEach((id) => uniqueIds.add(id));
    }
    
    // Sumamos también el conteo directo de este nodo (tanto propio como acumulado si viene del server)
    fallbackSum += col.document_count ?? 0;
    
    // Recorremos hijos recursivamente
    if (col.children && col.children.length > 0) {
      col.children.forEach(traverse);
    }
  };

  traverse(collection);
  
  // Si tenemos IDs reales, usamos el tamaño del Set único. Si no, usamos la suma recursiva de los contadores.
  return hasDocumentIds ? uniqueIds.size : fallbackSum;
};

// Subcomponente recursivo interno para las colecciones y subcolecciones
interface CollectionTreeItemProps {
  collection: Collection;
  selectedCollectionId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddSubcollection?: (parentId: string) => void;
  onUpdate?: () => void; // Añadido
  depth?: number;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({
  collection,
  selectedCollectionId,
  onSelect,
  onDelete,
  onAddSubcollection,
  onUpdate,
  depth = 0,
}) => {
  // Sincronizar el nombre si la prop cambia (ej. al refrescar datos)
  React.useEffect(() => {
    setEditedName(collection.name);
  }, [collection.name]);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(collection.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleRename = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();

    if (editedName.trim() === collection.name) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await collectionService.update(collection.id, editedName.trim());
    // 3. Opcional: Actualización optimista del estado local
    // Como la estructura de datos es jerárquica, una forma sencilla de refrescar 
    // sin recargar toda la página es llamar a una función proporcionada por el padre
    // que vuelva a solicitar las colecciones.
    // Ya lo estamos haciendo mediante 'onUpdate()' que llama a 'fetchCollections()'.
    
    // Cerramos el modo edición inmediatamente para mostrar el nuevo nombre
    setIsEditing(false);

    // Notificar al padre para que refresque la lista sin recargar la página
    if (onUpdate) {
      onUpdate();
    }
    } catch (error) {
      console.error('Error al renombrar:', error);
      alert('No se pudo renombrar la colección.');
      setEditedName(collection.name); // Revertir en caso de error
    } finally {
      setIsSaving(false);
    }
  };


  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedCollectionId === collection.id;
  const hasChildren = collection.children && collection.children.length > 0;

  // Calculamos el total acumulado usando useMemo para optimizar
  const totalDocuments = useMemo(() => {
    return calculateUniqueTotalDocuments(collection);
  }, [collection]);

  return (
    <div className="w-full">
      <div
        onClick={() => onSelect(collection.id)}
        className={`group w-full px-2 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center cursor-pointer transition-all ${
          isSelected
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate pr-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] focus:outline-none w-4 text-center transition-transform"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4" />
          )}
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={handleRename}
              autoFocus
              className="w-full bg-[var(--panel-bg)] text-[color:var(--text-primary)] border border-emerald-500 rounded px-1 outline-none text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate" title={collection.name}>
              {APP_TEXTS.sidebar.collectionIcon} {collection.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isEditing && (
            <>
              {onAddSubcollection && (
                <HasRole canEdit>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(true);
                      onAddSubcollection(collection.id);
                    }}
                    className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-lg leading-none items-center justify-center"
                    title="Añadir subcolección"
                  >
                    +
                  </button>
                </HasRole>
              )}

              <HasRole canEdit>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-xs items-center justify-center"
                  title="Renombrar colección"
                >
                  ✎
                </button>
              </HasRole>

              {onDelete && (
                <HasRole canDelete>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(collection.id);
                    }}
                    className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] p-0.5 transition-all text-xs items-center justify-center"
                    title={APP_TEXTS.sidebar.deleteCollectionTooltip}
                  >
                    {APP_TEXTS.sidebar.deleteIcon}
                  </button>
                </HasRole>
              )}
            </>
          )}

          <span className="text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-muted)] px-2 py-0.5 rounded-full">
            {totalDocuments}
          </span>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="space-y-1 mt-1 ml-3 pl-2 border-l border-[color:var(--border-color)]/30">
          {collection.children?.map((child) => (
            <CollectionTreeItem
              key={child.id}
              collection={child}
              selectedCollectionId={selectedCollectionId}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddSubcollection={onAddSubcollection}
              onUpdate={onUpdate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};