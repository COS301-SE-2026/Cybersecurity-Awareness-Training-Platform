import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GetSimulatedEmailResponseDto } from '@insightful-phish/shared';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/useAuth';
import { getSimulatedEmail } from '../services/campaigns.service';

function EmailDetailPage() {
  const navigate = useNavigate();

  const { campaignItemId, emailId } = useParams<{
    campaignItemId: string;
    emailId: string;
  }>();

  const { token } = useAuth();
  const [email, setEmail] = useState<GetSimulatedEmailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmail() {
      if (!campaignItemId || !emailId || !token) {
        return;
      }

      try {
        const data = await getSimulatedEmail(campaignItemId, emailId, token);

        setEmail(data);
      } catch (error) {
        console.error('FAILED TO LOAD SIMULATED EMAIL', error);
      } finally {
        setLoading(false);
      }
    }

    void loadEmail();
  }, [campaignItemId, emailId, token]);

  function formatEmailTime(dateString: string): string {
    const parsedDate = new Date(dateString);

    if (Number.isNaN(parsedDate.getTime())) {
      return dateString;
    }

    const day = parsedDate.getDate().toString().padStart(2, '0');

    const month = parsedDate.toLocaleString('en-GB', {
      month: 'short',
    });

    const year = parsedDate.getFullYear();

    const time = parsedDate.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return `${day} ${month} ${year}, ${time}`;
  }

  function toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  if (loading) {
    return (
      <AppLayout>
        <div
          style={{
            padding: '1.4rem',
            color: 'white',
            fontFamily: 'Overpass',
            fontSize: '1.2rem',
          }}
        >
          LOADING EMAIL...
        </div>
      </AppLayout>
    );
  }

  if (!email) {
    return (
      <AppLayout>
        <div
          style={{
            padding: '1.4rem',
            color: 'white',
            fontFamily: 'Overpass',
            fontSize: '1.2rem',
          }}
        >
          FAILED TO LOAD EMAIL
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          height: '100%',
          userSelect: 'none',
        }}
      >
        <div
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.1rem',
            width: 'fit-content',
            cursor: 'pointer',
            marginBottom: '-1rem',
            color: '#b882ff',
            transition: '0.18s ease',
            userSelect: 'none',
          }}
        >
          <ChevronLeftIcon
            style={{
              fontSize: '2.2rem',
            }}
          />

          <span
            style={{
              fontFamily: 'Jost',
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.12rem',
            }}
          >
            BACK
          </span>
        </div>

        <h1
          style={{
            color: 'white',
            fontFamily: 'Jost',
            fontSize: '3.8rem',
            fontWeight: 500,
            margin: 0,
            marginBottom: '0.2rem',
            lineHeight: 1,
          }}
        >
          Simulated Email
        </h1>

        <div
          style={{
            backgroundColor: 'rgba(46, 0, 85, 0.56)',
            border: '4px solid #7700ff47',
            padding: '1.1rem 1.2rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '2rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: '#CE9AFF',
                fontFamily: 'Jost',
                fontSize: '1.2rem',
                fontWeight: 500,
                letterSpacing: '0.08rem',
              }}
            >
              From
            </div>

            <div
              style={{
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '2rem',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {email.senderLabel}
            </div>

            <div
              style={{
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.4rem',
                fontWeight: 200,
                marginBottom: '1.5rem',
              }}
            >
              {email.senderAddress}
            </div>

            <div
              style={{
                color: '#CE9AFF',
                fontFamily: 'Jost',
                fontSize: '1.2rem',
                fontWeight: 500,
                letterSpacing: '0.08rem',
              }}
            >
              Subject
            </div>

            <div
              style={{
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.6rem',
                fontWeight: 400,
                lineHeight: 1.3,
              }}
            >
              {toTitleCase(email.subject)}
            </div>
          </div>

          <div
            style={{
              minWidth: '240px',
              textAlign: 'right',
            }}
          >
            <div
              style={{
                color: '#CE9AFF',
                fontFamily: 'Jost',
                fontSize: '1.2rem',
                fontWeight: 500,
                letterSpacing: '0.08rem',
              }}
            >
              Received
            </div>

            <div
              style={{
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.2rem',
                fontWeight: 400,
              }}
            >
              {formatEmailTime(email.receivedAt)}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              color: '#CE9AFF',
              fontFamily: 'Jost',
              fontSize: '1.2rem',
              fontWeight: 500,
              letterSpacing: '0.08rem',
            }}
          >
            Body
          </div>

          <div
            className="email-body"
            style={{
              color: 'white',
              fontFamily: 'Overpass',
              fontSize: '1.5rem',
              fontWeight: 400,
              lineHeight: 1.7,
              maxWidth: '1100px',
            }}
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />

          <style>
            {`
              .email-body p {
                margin: 0 0 1rem 0;
              }

              .email-body a {
                color: #CE9AFF;
              }
            `}
          </style>
        </div>
      </div>
    </AppLayout>
  );
}

export default EmailDetailPage;
