import AppLayout from '../components/layout/AppLayout';

import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

import InboxEmailRow from '../components/ui/InboxEmailRow';

import { useState } from 'react';

function InboxPage() {
  const [hovered, setHovered] = useState(false);
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
            backgroundColor: 'rgb(12, 0, 99)',
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
          <InboxEmailRow
            sender="Virgin Active"
            subject="We’re Moving Updates to the App"
            preview="Gym updates can now be found from within the Virgin Active app..."
            time="Today 12:33 PM"
            unread
          />

          <InboxEmailRow
            sender="Virgin Active"
            subject="We’re Moving Updates to the App"
            preview="Gym updates can now be found from within the Virgin Active app..."
            time="Today 12:33 PM"
          />

          <InboxEmailRow
            sender="Discovery Health"
            subject="Important Policy Reminder"
            preview="Please review the attached policy update before next month..."
            time="Today 11:02 AM"
          />

          <InboxEmailRow
            sender="Steam"
            subject="Your Account Security Notice"
            preview="A login attempt was detected from a new location..."
            time="Yesterday 9:14 PM"
          />

          <InboxEmailRow
            sender="FNB"
            subject="Verify Your Banking Details"
            preview="Your banking profile requires verification to avoid interruption..."
            time="Yesterday 6:48 PM"
            unread
          />

          <InboxEmailRow
            sender="Takealot"
            subject="Order Delivery Update"
            preview="Your parcel has been delayed due to weather conditions..."
            time="Yesterday 2:12 PM"
          />

          <InboxEmailRow
            sender="LinkedIn"
            subject="Connor, you appeared in 12 searches"
            preview="See who’s viewing your profile this week..."
            time="Monday 8:22 AM"
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default InboxPage;
