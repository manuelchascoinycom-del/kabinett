import React from 'react';

export const VersionFooter = () => {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

  return (
    <footer className="w-full flex justify-end text-[10px] text-[color:var(--text-secondary)] opacity-50 select-none px-8 py-2">
      {version}
    </footer>
  );
};
