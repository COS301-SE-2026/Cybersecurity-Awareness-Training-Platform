import AppLayout from '../components/layout/AppLayout';

import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import InboxEmailRow from '../components/ui/InboxEmailRow';

import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import type { SimulatedEmailSummaryDto } from '@insightful-phish/shared';
import { useAuth } from '../context/useAuth';
import { getSimulatedInbox } from '../services/campaigns.service';

function InboxPage() {
  const [hovered, setHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  const { campaignItemId } = useParams<{ campaignItemId: string }>();

  const { token } = useAuth();

  const [emails, setEmails] = useState<SimulatedEmailSummaryDto[]>([]);
  const [openedEmailIds, setOpenedEmailIds] = useState<Set<string>>(() => {
    if (!campaignItemId) {
      return new Set();
    }

    const storedOpenedEmails = localStorage.getItem(`opened-simulated-emails-${campaignItemId}`);

    if (!storedOpenedEmails) {
      return new Set();
    }

    return new Set(JSON.parse(storedOpenedEmails) as string[]);
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInbox() {
      if (!campaignItemId || !token) {
        return;
      }

      try {
        const data = await getSimulatedInbox(campaignItemId, token);

        setEmails(data.emails);
      } catch (error) {
        console.error('FAILED TO LOAD SIMULATED INBOX', error);
      } finally {
        setLoading(false);
      }
    }

    void loadInbox();
  }, [campaignItemId, token]);

  const handleOpenEmail = (emailId: string) => {
    if (!campaignItemId) {
      return;
    }

    const updatedOpenedEmails = new Set(openedEmailIds);

    updatedOpenedEmails.add(emailId);

    setOpenedEmailIds(updatedOpenedEmails);

    localStorage.setItem(
      `opened-simulated-emails-${campaignItemId}`,
      JSON.stringify(Array.from(updatedOpenedEmails)),
    );

    navigate(`/trainee/campaign-items/${campaignItemId}/simulated-emails/${emailId}`);
  };

  const filteredEmails = emails.filter((email) => {
    const formattedDate = new Date(email.receivedAt).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const searchableContent = [email.senderLabel, email.subject, email.preview ?? '', formattedDate]
      .join(' ')
      .toLowerCase();

    return searchableContent.includes(searchQuery.toLowerCase());
  });

  return (
    <AppLayout>
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '1rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
          height: '100%',
          userSelect: 'none',
        }}
      >
        {/* HEADING */}

        <div
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.1rem',
            width: 'fit-content',
            cursor: 'pointer',
            marginBottom: '-1.2rem',
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
            margin: 0,
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'white',
            fontFamily: 'Jost',
          }}
        >
          Simulated Email Inbox
        </h1>

        {/* SEARCH */}

        <div
          style={{
            height: '58px',
            backgroundColor: 'rgba(12, 0, 99, 0.53)',
            border: '3px solid rgb(12, 0, 99)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: '1rem',
            paddingRight: '0',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{
              flex: 1,
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontFamily: 'Overpass',
              fontSize: '1.2rem',
              paddingLeft: '0',
              paddingRight: '1rem',
            }}
          />

          <button
            style={{
              height: '80%',
              width: '140px',
              border: 'none',
              marginRight: '0.36rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontFamily: 'Jost',
              fontSize: '1.15rem',
              cursor: 'pointer',
              backgroundColor: hovered ? 'rgba(140, 0, 255, 0.24)' : 'rgba(121, 0, 220, 0.21)',

              transition: '0.2s ease',
              letterSpacing: '0.08rem',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <SearchOutlinedIcon />
            SEARCH
          </button>
        </div>

        {/* EMAIL LIST */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
            overflowY: 'auto',
            paddingRight: '0.3rem',
          }}
        >
          {loading ? (
            <div
              style={{
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.2rem',
                padding: '1rem',
              }}
            >
              LOADING INBOX...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div
              style={{
                color: '#CE9AFF',
                fontFamily: 'Overpass',
                fontSize: '1.1rem',
                padding: '1rem',
              }}
            >
              NO EMAILS MATCH YOUR SEARCH
            </div>
          ) : (
            filteredEmails.map((email) => (
              <InboxEmailRow
                key={email.id}
                sender={email.senderLabel}
                subject={email.subject}
                preview={email.preview ?? ''}
                time={new Date(email.receivedAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
                unread={!openedEmailIds.has(email.id)}
                onClick={() => handleOpenEmail(email.id)}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default InboxPage;
