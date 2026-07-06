import { Link } from 'react-router-dom';

function BackToLoginButton() {
  return (
    <Link
      to="/login"
      className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
    >
      <span className="material-icons-sharp">arrow_back</span>
      <span> Back to Login</span>
    </Link>
  );
}

export default BackToLoginButton;
