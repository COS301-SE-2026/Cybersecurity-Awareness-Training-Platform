import { Link } from 'react-router-dom';
import BasicAlert from '../alerts/BasicAlert';
import { AuthPageFrame, AuthPageIntro } from './AuthPrimitives';

export type TokenVerificationStatus = 'pending' | 'success' | 'error';

type TokenVerificationPanelProps = Readonly<{
  title: string;
  introMessage: string;
  status: TokenVerificationStatus;
  message: string;
  showLoginLink?: boolean;
}>;

function TokenVerificationPanel({
  title,
  introMessage,
  status,
  message,
  showLoginLink = false,
}: TokenVerificationPanelProps) {
  const alertVariant = status === 'success' ? 'success' : 'danger';

  return (
    <AuthPageFrame
      leftWidth="78%"
      rightWidth="22%"
      rightPanelStyle={{ padding: '2rem' }}
      leftChildren={
        <>
          <AuthPageIntro
            title={title}
            message={introMessage}
            dividerStyle={{ marginBottom: '1rem' }}
            messageStyle={{ marginBottom: '1rem' }}
          />

          {status === 'pending' ? (
            <p style={{ color: 'white', fontFamily: 'Overpass' }}>{message}</p>
          ) : message ? (
            <BasicAlert variant={alertVariant}>{message}</BasicAlert>
          ) : null}

          {status === 'success' && showLoginLink ? (
            <Link to="/login" style={{ color: '#cca7ff', fontFamily: 'Jost', fontSize: '1.3rem' }}>
              Go to login
            </Link>
          ) : null}
        </>
      }
      rightChildren={
        <img
          src="/logo-motto.png"
          alt="Insightful Phish Logo"
          style={{ width: '100%', maxWidth: '300px' }}
        />
      }
    />
  );
}

export default TokenVerificationPanel;
