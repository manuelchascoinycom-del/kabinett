import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface DropzoneProps {
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  getRootProps,
  getInputProps,
  isDragActive,
}) => {
  const T = APP_TEXTS.upload.dropzone;
  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 mb-6 ${
        isDragActive
          ? 'border-emerald-400 bg-slate-900/80 scale-[1.01]'
          : 'border-slate-800/80 hover:border-slate-700 bg-[#0d1322]/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-2xl mb-1">{T.sheetMusicIcon}</div>
      <p className="text-slate-400 text-xs font-medium">
        {T.instruction}
      </p>
    </div>
  );
};