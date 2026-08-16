import React from 'react';

export const VersionFooter = () => {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

  return (
    <footer className="fixed bottom-2 right-4 text-[10px] text-[var(--text-secondary)] opacity-50 pointer-events-none select-none">
      {version}
    </footer>
  );
};
