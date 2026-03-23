'use client';

export const BackgroundDecor = () => {
  return (
    <div className="pointer-events-none fixed left-0 top-0 -z-10 h-full w-full overflow-hidden opacity-50 dark:opacity-20">
      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-emerald-500/20 blur-[120px]" />
      <div
        className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-teal-500/20 blur-[120px]"
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
};
