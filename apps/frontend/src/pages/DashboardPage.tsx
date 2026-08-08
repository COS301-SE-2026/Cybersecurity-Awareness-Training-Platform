import Navbar from '../components/layout/Navbar';

import Sidebar from '../components/layout/Sidebar';

import Button from '../components/ui/Button';

import { MailOutlined, SchoolOutlined, QuizOutlined } from '@mui/icons-material';

function DashboardPage() {
  const cardStyle = {
    width: '520px',
    height: '160px',

    position: 'relative' as const,

    paddingTop: '0.55rem',
    paddingLeft: '2rem',
    paddingRight: '1.2rem',
    paddingBottom: '1.1rem',

    boxSizing: 'border-box' as const,

    overflow: 'visible',

    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  };

  const headingStyle = {
    display: 'flex',

    alignItems: 'center',

    gap: '0.5rem',

    color: 'white',

    fontSize: '1.95rem',

    fontWeight: 400,

    marginBottom: '0.1rem',
  };

  const subTextStyle = {
    margin: 0,

    fontFamily: 'Overpass',

    fontWeight: 400,

    fontSize: '1.2rem',

    paddingBottom: '0.15rem',
  };

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',

        overflow: 'hidden',

        backgroundColor: '#0E0020',

        display: 'flex',
        flexDirection: 'column',

        fontFamily: 'Jost',
      }}
    >
      {/* NAVBAR */}

      <Navbar />

      {/* BODY */}

      <div
        style={{
          flex: 1,

          display: 'flex',

          overflow: 'hidden',
        }}
      >
        {/* SIDEBAR */}

        <Sidebar />

        {/* DASHBOARD */}

        <section
          style={{
            flex: 1,

            display: 'flex',
            flexDirection: 'column',

            justifyContent: 'space-between',

            overflow: 'hidden',

            height: '100%',
          }}
        >
          {/* TOP CONTENT */}

          <div
            style={{
              padding: '1.4rem',
              paddingBottom: '0.8rem',

              boxSizing: 'border-box',

              flexShrink: 0,
            }}
          >
            {/* HEADING */}

            <h1
              style={{
                margin: 0,
                marginBottom: '1.6rem',
                fontSize: '3.8rem',
                fontWeight: 500,
                lineHeight: 1,
                color: 'white',
              }}
            >
              Dashboard
            </h1>

            {/* CARDS */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 540px)',

                gap: '1.5rem',
              }}
            >
              {/* EMAIL */}

              <div
                style={{
                  ...cardStyle,
                  border: '4px solid rgba(0,255,166,0.20)',
                  backgroundColor: 'rgba(0,255,166,0.12)',
                }}
              >
                {/* ACCENT BAR */}

                <div
                  style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '-4px',
                    width: '10px',
                    height: 'calc(100% + 8px)',
                    backgroundColor: '#00FFA6',
                    zIndex: 2,
                  }}
                />

                <div>
                  <div style={headingStyle}>
                    <MailOutlined
                      style={{
                        fontSize: '1.9rem',
                      }}
                    />
                    Simulated Email Inbox
                  </div>

                  <p
                    style={{
                      ...subTextStyle,

                      color: '#9EFFDD',
                    }}
                  >
                    3 NEW Emails
                  </p>
                </div>

                <Button
                  text="OPEN INBOX"
                  backgroundColor="rgba(0,255,166,0.10)"
                  hoverColor="rgba(0,255,166,0.20)"
                  textColor="#00FFA6"
                  borderColor="transparent"
                  width="215px"
                  height="64px"
                  fontSize="1.15rem"
                />
              </div>

              {/* TRAINING */}

              <div
                style={{
                  ...cardStyle,
                  border: '4px solid rgba(255,0,212,0.20)',
                  backgroundColor: 'rgba(255,0,212,0.12)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '-4px',
                    width: '10px',
                    height: 'calc(100% + 8px)',
                    backgroundColor: '#FF00D4',
                    zIndex: 2,
                  }}
                />

                <div>
                  <div style={headingStyle}>
                    <SchoolOutlined
                      style={{
                        fontSize: '1.9rem',
                      }}
                    />
                    Training Modules
                  </div>

                  <p
                    style={{
                      ...subTextStyle,

                      color: '#FF9AEC',
                    }}
                  >
                    4 Assigned • 2 Started • 2 Not Started
                  </p>
                </div>

                <Button
                  text="GO TO TRAINING"
                  backgroundColor="rgba(255,0,212,0.10)"
                  hoverColor="rgba(255,0,212,0.20)"
                  textColor="#FF00D4"
                  borderColor="transparent"
                  width="250px"
                  height="64px"
                  fontSize="1.15rem"
                />
              </div>

              {/* QUIZ */}

              <div
                style={{
                  ...cardStyle,

                  border: '4px solid rgba(0,187,255,0.20)',

                  backgroundColor: 'rgba(0,187,255,0.12)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',

                    left: '-4px',
                    top: '-4px',

                    width: '10px',

                    height: 'calc(100% + 8px)',

                    backgroundColor: '#00BBFF',

                    zIndex: 2,
                  }}
                />

                <div>
                  <div style={headingStyle}>
                    <QuizOutlined
                      style={{
                        fontSize: '1.9rem',
                      }}
                    />
                    Quiz Progress
                  </div>

                  <p
                    style={{
                      ...subTextStyle,

                      color: '#9EE7FF',
                    }}
                  >
                    2 Quizzes Pending
                  </p>
                </div>

                <Button
                  text="START A QUIZ"
                  backgroundColor="rgba(0,187,255,0.10)"
                  hoverColor="rgba(0,187,255,0.20)"
                  textColor="#00BBFF"
                  borderColor="transparent"
                  width="215px"
                  height="64px"
                  fontSize="1.15rem"
                />
              </div>

              {/* FEEDBACK */}

              {/* <div
                style={{
                  ...cardStyle,

                  border: '4px solid rgba(255,178,0,0.20)',

                  backgroundColor: 'rgba(255,178,0,0.12)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',

                    left: '-4px',
                    top: '-4px',

                    width: '10px',

                    height: 'calc(100% + 8px)',

                    backgroundColor: '#FFB200',

                    zIndex: 2,
                  }}
                />

                <div>
                  <div style={headingStyle}>
                    <FeedbackOutlined
                      style={{
                        fontSize: '1.9rem',
                      }}
                    />
                    Recent Feedback
                  </div>

                  <p
                    style={{
                      ...subTextStyle,

                      color: '#FFE2A1',
                    }}
                  >
                    Available
                  </p>
                </div>

                <Button
                  text="VIEW FEEDBACK"
                  backgroundColor="rgba(255,178,0,0.10)"
                  hoverColor="rgba(255,178,0,0.20)"
                  textColor="#FFB200"
                  borderColor="transparent"
                  width="240px"
                  height="64px"
                  fontSize="1.15rem"
                />
              </div> */}
            </div>
          </div>

          {/* RECENT ACTIVITY */}

          <div
            style={{
              height: '210px',
              paddingTop: '0.7rem',
              paddingLeft: '1.4rem',
              paddingRight: '1.4rem',
              paddingBottom: '0.9rem',

              boxSizing: 'border-box',

              overflow: 'hidden',

              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: '1.4rem',
                marginTop: '0.4rem',
                color: '#d1b0ff',
                fontSize: '2.5rem',
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              Recent Activity
            </h2>

            {/* ONLY HISTORY SCROLLS */}

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
                maxHeight: '88px',
                color: '#f8f5ffa5',
                fontSize: '1.08rem',
                lineHeight: 1.35,
                fontFamily: 'Overpass',
                paddingRight: '0.4rem',
              }}
            >
              <div>
                • Today at 10am, <strong>Opened Simulated Email:</strong> “Your Password is About to
                Expire”
              </div>

              <div>
                • Yesterday at 9pm, <strong>Completed a Quiz:</strong> “Recognising Phishing Emails:
                Level 1”
              </div>

              <div>
                • Yesterday at 8pm, <strong>Completed a Training Module:</strong> “Recognising
                Phishing Emails: Level 1”
              </div>

              <div>
                • Monday at 4pm, <strong>Opened Simulated Email:</strong> “Urgent Payroll Update”
              </div>

              <div>
                • Sunday at 11am, <strong>Completed Training Module:</strong> “Safe Password
                Practices”
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default DashboardPage;
