import { AlertVariants, type AlertVariant } from './alertVariants';
import { useState } from 'react';

type BasicAlertProps = {
  variant: AlertVariant;
  children: React.ReactNode;
};

function BasicAlert({ variant, children }: BasicAlertProps) {
  const style = AlertVariants[variant];
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }
  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-md">
      <div
        className={`flex sm:items-center p-4 mb-4 text-sm border-t-4 ${style.container}`}
        role="alert"
      >
        {/* ALERT MESSAGE  */}
        <div className="font-overpass font-medium tracking-wide ms-2 text-[1.2rem]">{children}</div>

        {/* CLOSE BUTTON */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setVisible(false)}
          className={`ms-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 shrink-0 focus:ring-2 ${style.button}`}
        >
          <span className="material-icons-sharp">close</span>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

export default BasicAlert;
