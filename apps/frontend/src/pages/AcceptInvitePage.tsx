import { useState } from 'react';
import AcceptInviteResultModal from '../components/layout/modals/AcceptInviteResultModal';

/* 
  Note to Zoë
  Please use the AcceptInviteResultModal for Success, Declined, Error States
*/

type InvitationErrorType = 'Expired' | 'Invalid' | 'Revoked' | 'Already Used';

type InvitationType = 'Platform Administrator Upgrade' | 'Organisation Administrator Upgrade';

interface MockInvitation {
  invitationType: InvitationType;
  targetEmail: string;
  organisationName?: string;
  grantedRole: string;
}

const mockInvitations: MockInvitation[] = [
  {
    invitationType: 'Platform Administrator Upgrade',
    targetEmail: 'email@example.com',
    grantedRole: 'Platform Administrator',
  },
  {
    invitationType: 'Organisation Administrator Upgrade',
    targetEmail: 'email@example.com',
    organisationName: 'Example Organisation (Pty) Ltd',
    grantedRole: 'Organisation Administrator',
  },
];

function AcceptInvitePage() {
  const invitation = mockInvitations[0]; // CHANGE TO SEE DIFFERENT LAYOUTS

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [errorType, setErrorType] = useState<InvitationErrorType | undefined>();

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO  */}
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
          success={success}
          errorType={errorType}
          declined={declined}
        />

        <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
          {/* HEADING */}
          <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
            Accept Invitation
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink mb-6">
            You have been selected for a role change. Please review the details below before
            accepting or declining this invitation.
          </p>

          {/* Invitation Type */}
          {/* Heading */}
          <p className=" block font-jost tracking-wide text-xl font-medium text-pink">
            Invitation Type
          </p>
          <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
            {invitation.invitationType}
          </p>
          {/* ======================== */}

          {/* Email Address */}
          {/* Heading */}
          <p className=" block font-jost tracking-wide text-xl font-medium text-pink">
            Email Address
          </p>
          <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
            {invitation.targetEmail}
          </p>
          {/* ======================== */}

          {/* Organisation */}
          {/* Heading */}
          {invitation.organisationName && (
            <p className=" block font-jost tracking-wide text-xl font-medium text-pink">
              Organisation
            </p>
          )}
          {invitation.organisationName && (
            <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
              {invitation.organisationName}
            </p>
          )}

          {/* ======================== */}
          {/* Role */}
          {/* Heading */}
          <p className=" block font-jost tracking-wide text-xl font-medium text-pink">
            Granted Role
          </p>
          <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
            {invitation.grantedRole}
          </p>
          {/* ======================== */}

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              type="button"
              onClick={() => {
                setSuccess(true);
                setDeclined(false);
                setErrorType(undefined);
                setIsResultModalOpen(true);
              }}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Accept Invite
            </button>

            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                // setDeclined(false);
                // setErrorType('Expired');
                setDeclined(true);
                setErrorType(undefined);
                setIsResultModalOpen(true);
              }}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-red-600 hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Decline Invite
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AcceptInvitePage;
