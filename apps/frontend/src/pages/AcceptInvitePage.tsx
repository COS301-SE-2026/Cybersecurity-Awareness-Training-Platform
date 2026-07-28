import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { InvitationContextResponseDto } from '@insightful-phish/shared';
import AcceptInviteResultModal from '../components/layout/modals/AcceptInviteResultModal';
import InvitationRoleChangePanel from '../components/invitation/InvitationRoleChangePanel';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/apiClient';
import {
  acceptInvitation,
  getInvitationContext,
  rejectInvitation,
} from '../services/invitation.service';

type InvitationErrorType = 'Expired' | 'Invalid' | 'Revoked' | 'Already Used' | 'RateLimited';

function mapErrorToType(error: unknown): InvitationErrorType {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'RateLimited';
    const body = error.body;
    if (body && typeof body === 'object' && 'error' in body) {
      const code = (body as { error?: unknown }).error;
      if (code === 'AUTH_RATE_LIMITED') return 'RateLimited';
      if (code === 'INVITATION_EXPIRED') return 'Expired';
      if (code === 'INVITATION_REVOKED') return 'Revoked';
      if (code === 'TOKEN_USED') return 'Already Used';
    }
  }
  return 'Invalid';
}

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ token?: string }>();
  const token = (searchParams.get('token') || params.token || '').trim();

  const { user, isAuthenticated, logout } = useAuth();

  const [context, setContext] = useState<InvitationContextResponseDto | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorType, setErrorType] = useState<InvitationErrorType | undefined>();

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalDeclined, setModalDeclined] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      if (!token) {
        if (isMounted) {
          setErrorType('Invalid');
          setIsLoadingContext(false);
        }
        return;
      }

      setIsLoadingContext(true);
      setErrorType(undefined);

      try {
        const data = await getInvitationContext(token);
        if (!isMounted) return;

        if (data.requiredAction === 'CONTINUE_SETUP') {
          navigate(`/setup/token/${encodeURIComponent(token)}`, { replace: true });
          return;
        }

        setContext(data);

        if (
          data.requiredAction === 'TOKEN_UNAVAILABLE' ||
          data.status === 'EXPIRED' ||
          data.status === 'REVOKED' ||
          data.status === 'USED' ||
          data.status === 'REJECTED' ||
          data.status === 'ACCEPTED'
        ) {
          if (data.status === 'EXPIRED') setErrorType('Expired');
          else if (data.status === 'REVOKED') setErrorType('Revoked');
          else if (data.status === 'USED') setErrorType('Already Used');
          else setErrorType('Invalid');
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorType(mapErrorToType(err));
      } finally {
        if (isMounted) {
          setIsLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated, navigate]);

  const [modalSessionOutcome, setModalSessionOutcome] = useState<
    'REFRESH_AUTH_CONTEXT' | 'REAUTHENTICATE' | undefined
  >();
  const [modalRoleGranted, setModalRoleGranted] = useState<string | undefined>();

  async function handleAccept() {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await acceptInvitation(token, { confirmRoleChange: true });
      setModalSuccess(true);
      setModalDeclined(false);
      setModalSessionOutcome(res.sessionOutcome);
      setModalRoleGranted(res.roleGranted);
      setErrorType(undefined);
      setIsResultModalOpen(true);
    } catch (err) {
      setErrorType(mapErrorToType(err));
      setModalSuccess(false);
      setModalDeclined(false);
      setIsResultModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await rejectInvitation(token, { rejectionReason: 'User declined invitation' });
      setModalSuccess(false);
      setModalDeclined(true);
      setErrorType(undefined);
      setIsResultModalOpen(true);
    } catch (err) {
      setErrorType(mapErrorToType(err));
      setModalSuccess(false);
      setModalDeclined(false);
      setIsResultModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLoginToContinue() {
    const returnPath = `/accept-invite?token=${encodeURIComponent(token)}`;
    navigate(`/login?redirectTo=${encodeURIComponent(returnPath)}`);
  }

  async function handleSwitchAccount() {
    await logout();
    const returnPath = `/accept-invite?token=${encodeURIComponent(token)}`;
    navigate(`/login?redirectTo=${encodeURIComponent(returnPath)}`);
  }

  let content = null;

  if (isLoadingContext) {
    content = (
      <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8 text-center">
        <h3 className="font-jost text-3xl text-purple tracking-wider font-medium mb-4">
          Validating Invitation...
        </h3>
        <p className="font-overpass text-purple text-lg">
          Please wait while we check your invitation link.
        </p>
      </div>
    );
  } else if (errorType === 'RateLimited') {
    content = (
      <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
        <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium mb-4">
          Too Many Requests
        </h3>
        <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
          You have made too many authentication attempts. Please wait a few seconds and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none mb-4"
        >
          Try Again
        </button>
      </div>
    );
  } else if (errorType || context?.requiredAction === 'TOKEN_UNAVAILABLE') {
    content = (
      <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
        <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium mb-4">
          Invitation {errorType || 'Invalid'}
        </h3>
        <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
          This <span className="font-semibold">invitation</span> is <strong>no longer valid</strong>{' '}
          because it has either <em>expired</em>, <em>is invalid</em>,{' '}
          <em>has already been used</em>, or <em>has been revoked</em>.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
        >
          <span className="material-icons-sharp">arrow_back</span>
          <span>Back to Home Page</span>
        </Link>
      </div>
    );
  } else if (context?.requiredAction === 'LOGIN_REQUIRED') {
    content = (
      <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
        <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading mb-4">
          Authentication Required
        </h3>
        <p className="font-regular tracking-wide text-[1.1rem] font-jost text-dark-pink mb-6">
          Please log in to your account to review and accept this invitation.
        </p>
        <button
          type="button"
          onClick={handleLoginToContinue}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none"
        >
          Log In to Continue
        </button>
      </div>
    );
  } else if (context?.requiredAction === 'SWITCH_ACCOUNT') {
    content = (
      <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
        <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading mb-4">
          Wrong Account Signed In
        </h3>
        <p className="font-regular tracking-wide text-[1.1rem] font-jost text-dark-pink mb-4">
          This invitation cannot be accepted using the currently signed-in account. Please sign out
          and sign in with a different account to continue.
        </p>
        {user?.email && (
          <div className="mb-6 p-4 bg-faint-purple border border-default">
            <p className="font-jost text-sm font-medium text-dark-pink mb-1">
              Currently signed in as:
            </p>
            <p className="font-google_sans_code text-base font-semibold text-pink tracking-wider">
              {user.email}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleSwitchAccount}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none"
        >
          Sign Out &amp; Switch Account
        </button>
      </div>
    );
  } else if (context?.requiredAction === 'CONFIRM_ROLE_CHANGE') {
    content = (
      <InvitationRoleChangePanel
        organisationName={context.organisationName}
        grantedRole={context.roleGranted}
        invitationType={context.invitationType}
        permissions={context.permissions}
        currentAccountEmail={user?.email}
        rejectAllowed={context.rejectAllowed}
        isSubmitting={isSubmitting}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    );
  }

  return (
    <section className="bg-light-purple dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO */}
        <div className="mb-4 flex items-center space-x-3 rtl:space-x-reverse">
          <img src="/Phish Logo Light.png" className="h-14" alt="Insightful Phish Logo" />
          <span className="flex items-center gap-2 mt-2">
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-medium whitespace-nowrap tracking-wide">
              Insightful
            </span>
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-black whitespace-nowrap tracking-wide">
              Phish.
            </span>
          </span>
        </div>

        <AcceptInviteResultModal
          isOpen={isResultModalOpen}
          success={modalSuccess}
          errorType={errorType}
          declined={modalDeclined}
          sessionOutcome={modalSessionOutcome}
          roleGranted={modalRoleGranted}
        />

        {content}
      </div>
    </section>
  );
}

export default AcceptInvitePage;
