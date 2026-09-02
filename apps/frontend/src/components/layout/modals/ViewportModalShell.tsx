import { useEffect, type ReactNode } from 'react';

type ViewportModalShellProps = Readonly<{
  id: string;
  isOpen: boolean;
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}>;

function ViewportModalShell({ id, isOpen, header, children, footer }: ViewportModalShellProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div
      id={id}
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-xl"
    >
      <div className="relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-md  flex-col overflow-hidden border border-default bg-white-purple p-4 shadow-md md:p-6">
        <div className="shrink-0 border-b border-default pb-4 md:pb-5">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pr-1">
          {children}
        </div>

        <div className="shrink-0 pt-4">{footer}</div>
      </div>
    </div>
  );
}

export default ViewportModalShell;
