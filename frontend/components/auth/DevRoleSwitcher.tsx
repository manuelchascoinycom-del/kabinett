'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export const DevRoleSwitcher: React.FC = () => {
  const auth = useAuth() as any;
  const userRole = auth?.userRole;
  const setUserRole = auth?.setUserRole;

  // Mostramos en consola qué está llegando exactamente
  console.log('DevRoleSwitcher auth context:', auth);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] p-3 bg-zinc-900 border border-amber-500/50 rounded-xl shadow-2xl text-xs font-sans text-amber-400 max-w-xs">
      <div className="flex items-center justify-between gap-2 mb-2 border-b border-amber-500/20 pb-1.5">
        <span className="font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Dev Role Switcher
        </span>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
          {userRole || 'Sin Rol'}
        </span>
      </div>
      <div className="flex gap-1.5">
        {(['Viewer', 'Editor', 'Admin'] as const).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => {
              if (typeof setUserRole === 'function') {
                setUserRole(role);
              } else {
                alert(`No se encontró la función setUserRole en el AuthContext. Valor de auth: ${JSON.stringify(auth)}`);
              }
            }}
            className={`flex-1 py-1 px-2 rounded font-medium transition-all ${
              userRole === role
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
};