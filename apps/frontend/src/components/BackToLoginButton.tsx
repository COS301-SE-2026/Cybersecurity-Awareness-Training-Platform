import { Link } from 'react-router-dom';

type BackToLoginButtonProps = Readonly<{
  to?: string;
  label?: string;
}>;

function BackToLoginButton({ to = '/login', label = 'Back to Login' }: BackToLoginButtonProps) {
  return (
    <Link
      to={to}
      className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
    >
      <span className="material-icons-sharp">arrow_back</span>
      <span>{label}</span>
    </Link>
  );
}

export default BackToLoginButton;
