import React, { useState } from 'react';
import { Collection } from '../../services/collectionService';

interface CollectionTreeItemProps {
  collection: Collection;
  onSelect?: (collectionId: string) => void;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({ collection, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = collection.children && collection.children.length > 0;

  return (
    <div className="flex flex-col select-none">
      <div 
        className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          if (onSelect) onSelect(collection.id);
        }}
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          {hasChildren ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none w-4 text-center text-xs"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4" /> 
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {collection.name}
          </span>
        </div>
        
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
          {collection.document_count}
        </span>
      </div>

      {/* Renderizado recursivo de los hijos si está expandido */}
      {hasChildren && isOpen && (
        <div className="pl-4 border-l border-gray-200 dark:border-gray-700 ml-2 mt-1 space-y-1">
          {collection.children!.map((child) => (
            <CollectionTreeItem key={child.id} collection={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};