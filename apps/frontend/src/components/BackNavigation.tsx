import { Link } from 'react-router-dom';

type BackNavigationProps = Readonly<{
  to?: string;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}>;

function BackNavigation({
  to = '/login',
  label = 'Back to Login',
  onClick,
  disabled = false,
}: BackNavigationProps) {
  const content = (
    <>
      <span className="material-icons-sharp" aria-hidden="true">
        arrow_back
      </span>
      <span className="hover:underline">{label}</span>
    </>
  );

  if (onClick !== undefined) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="-mt-4 inline-flex cursor-pointer items-center gap-2 font-jost text-base font-regular tracking-wide text-purple transition-colours hover:text-purple disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="-mt-4 inline-flex cursor-pointer items-center gap-2 font-jost text-base font-regular tracking-wide text-purple transition-colours hover:text-purple sm:text-lg"
    >
      {content}
    </Link>
  );
}

export default BackNavigation;
