import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { GetSimulatedEmailResponseDto } from '@insightful-phish/shared';
import AppLayout from '../components/layout/AppLayout';
import PageBackButton from '../components/ui/PageBackButton';
import { useAuth } from '../context/useAuth';
import { formatEmailTime, toTitleCase } from '../lib/email.utils';
import { getSimulatedEmail, recordSimulatedEmailInteraction } from '../services/campaigns.service';
import { sanitizeSafeHtml } from '../lib/safeHtml';
import './SimulatedEmailPages.css';

const emailMetaLabelStyle = {
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '1.2rem',
  fontWeight: 500,
  letterSpacing: '0.08rem',
};

function EmailDetailPage() {
  const { campaignItemId, emailId } = useParams<{
    campaignItemId: string;
    emailId: string;
  }>();

  const { token } = useAuth();
  const [email, setEmail] = useState<GetSimulatedEmailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  const sanitizedBodyHtml = email ? sanitizeSafeHtml(email.bodyHtml) : '';

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

  useEffect(() => {
    async function recordEmailOpened() {
      if (!campaignItemId || !emailId || !token || !email) {
        return;
      }

      try {
        await recordSimulatedEmailInteraction(
          campaignItemId,
          emailId,
          'SIMULATED_EMAIL_OPENED',
          token,
        );
      } catch (error) {
        console.error('FAILED TO RECORD EMAIL OPEN EVENT', error);
      }
    }

    void recordEmailOpened();
  }, [campaignItemId, emailId, token, email]);

  if (loading) {
    return (
      <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
        <div
          className="simulated-email-state"
          style={{
            padding: '1.4rem',
            color: '#4B5563',
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
      <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
        <div
          className="simulated-email-state"
          style={{
            padding: '1.4rem',
            color: '#B91C1C',
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
    <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
      <div
        className="simulated-email-detail"
        style={{
          padding: '1.4rem',
          paddingBottom: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <PageBackButton className="simulated-email-back-button" marginBottom="-0.4rem" />

        <h1
          className="simulated-email-detail__title"
          style={{
            color: 'var(--ip-dark-pink)',
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
          className="simulated-email-detail__metadata"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderLeft: '6px solid var(--ip-purple)',
            padding: '1.1rem 1.2rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '2rem',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div className="simulated-email-detail__primary-metadata" style={{ flex: 1 }}>
            <div style={emailMetaLabelStyle}>From</div>

            <div
              className="simulated-email-detail__sender"
              style={{
                color: 'var(--ip-deep-purple)',
                fontFamily: 'Overpass',
                fontSize: '2rem',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {email.senderLabel}
            </div>

            <div
              className="simulated-email-detail__address"
              style={{
                color: '#6B7280',
                fontFamily: 'Overpass',
                fontSize: '1.4rem',
                fontWeight: 200,
                marginBottom: '1.5rem',
              }}
            >
              {email.senderAddress}
            </div>

            <div style={emailMetaLabelStyle}>Subject</div>

            <div
              className="simulated-email-detail__subject"
              style={{
                color: '#1F2937',
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
            className="simulated-email-detail__received"
            style={{
              minWidth: '200px',
              textAlign: 'right',
            }}
          >
            <div style={emailMetaLabelStyle}>Received</div>

            <div
              style={{
                color: '#4B5563',
                fontFamily: 'Overpass',
                fontSize: '1.2rem',
                fontWeight: 400,
              }}
            >
              {formatEmailTime(email.receivedAt)}
            </div>
          </div>
        </div>

        <div
          className="simulated-email-detail__body-card"
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            padding: '1.25rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            className="email-body"
            style={{
              color: '#1F2937',
              fontFamily: 'Overpass',
              fontSize: '1.5rem',
              fontWeight: 400,
              lineHeight: 1.7,
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: '0.75rem',
            }}
            dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default EmailDetailPage;
