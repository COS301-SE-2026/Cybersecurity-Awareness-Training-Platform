import BackToLoginButton from '../../BackToLoginButton';

type SuccessfulPasswordResetModalProps = Readonly<{
  isOpen: boolean;
}>;

function SuccessfulPasswordResetModal({ isOpen }: SuccessfulPasswordResetModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-emerald-600 tracking-wider font-medium">
              Password Reset Successful
            </h3>
          </div>
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            <p className="font-overpass text-left text-regular text-[1.3rem] tracking-wider text-purple mb-1">
              Your password has been <strong>successfully</strong> reset.
            </p>

            <p className="font-overpass text-left text-regular text-[1.2rem] tracking-wider text-pink mb-1">
              You can now <strong>access your account using your new password</strong>.
            </p>

            {/* BACK TO LOGIN LINK */}
            <BackToLoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuccessfulPasswordResetModal;
