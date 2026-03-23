'use client';

import { ChangeEvent, DragEvent, RefObject } from 'react';

type ResumeDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  isDragging: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onDragEnter: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
  onOpenFilePicker: () => void;
};

const formatFileSize = (fileSize: number) => {
  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
};

export const ResumeDropzone = ({
  fileInputRef,
  selectedFile,
  isDragging,
  onFileChange,
  onDrop,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onOpenFilePicker,
}: ResumeDropzoneProps) => {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              Step 1
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50 sm:text-3xl">
              Upload your CV
            </h2>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
            1 file
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Drop in the resume you want to tailor. The file will be uploaded to the
          project storage before the application workflow continues.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={onFileChange}
      />

      <label
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-dashed p-5 transition-all duration-300 sm:p-6 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-500/10 dark:bg-emerald-400/10'
            : 'border-slate-300 bg-gradient-to-br from-stone-50 to-white hover:border-emerald-400 hover:bg-emerald-50/60 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/70 dark:hover:bg-emerald-400/5'
        }`}
        onClick={onOpenFilePicker}
      >
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                isDragging
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7"
              >
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 20h14" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isDragging ? 'Release to attach resume' : 'Drag resume here'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                or browse from your device
              </p>
            </div>
          </div>
          <div className="hidden rounded-full border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-600 transition-colors group-hover:border-emerald-500 group-hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:group-hover:border-emerald-400 dark:group-hover:text-emerald-300 sm:block">
            Select file
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
          <span>Accepted</span>
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white dark:bg-slate-100 dark:text-slate-900">
            PDF
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            DOC
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            DOCX
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          {selectedFile ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                Attached
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No file selected yet. Add the version of your resume you want to
              optimize.
            </p>
          )}
        </div>
      </label>
    </>
  );
};
