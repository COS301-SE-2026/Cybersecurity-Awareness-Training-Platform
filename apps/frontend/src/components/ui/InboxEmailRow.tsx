import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

type InboxEmailRowProps = {
  readonly sender: string;
  readonly subject: string;
  readonly preview: string;
  readonly time: string;
  readonly unread?: boolean;
  readonly onClick?: () => void;
};

function InboxEmailRow({
  sender,
  subject,
  preview,
  time,
  unread = false,
  onClick,
}: InboxEmailRowProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        backgroundColor: unread ? 'var(--ip-faint-purple)' : '#FFFFFF',
        border: unread
          ? '2px solid color-mix(in srgb, var(--ip-dark-pink) 40%, transparent)'
          : '2px solid #D1D5DB',
        boxSizing: 'border-box',
        userSelect: 'none',
        cursor: 'pointer',
        transition: '0.18s ease',
        position: 'relative',
        overflow: 'visible',
        width: '100%',
        flexShrink: 0,
        textAlign: 'left',
      }}
    >
      {unread && (
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '-2px',
            width: '10px',
            height: 'calc(100% + 4px)',
            backgroundColor: 'var(--ip-dark-pink)',
            zIndex: 3,
          }}
        />
      )}
      {/* AVATAR */}

      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          overflow: 'hidden',
          marginRight: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: unread ? '#E8DBFF' : '#EEF0F6',
          flexShrink: 0,
        }}
      >
        <AccountCircleOutlinedIcon
          style={{
            color: unread ? 'var(--ip-purple)' : '#6B7280',
            fontSize: '2rem',
          }}
        />
      </div>

      {/* SENDER */}

      <div
        style={{
          width: '210px',
          color: unread ? 'var(--ip-dark-pink)' : '#1F2937',
          fontFamily: 'Overpass',
          fontSize: '1.2rem',
          fontWeight: unread ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          letterSpacing: '0.08rem',
          paddingRight: '1rem',
        }}
      >
        {sender}
      </div>

      {/* SUBJECT */}

      <div
        style={{
          width: '380px',
          color: unread ? 'var(--ip-deep-purple)' : '#374151',
          fontFamily: 'Overpass',
          fontSize: '1.2rem',
          fontWeight: unread ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          paddingRight: '1rem',
        }}
      >
        {subject.replace(/\w\S*/g, (word) => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })}
      </div>

      {/* PREVIEW */}

      <div
        style={{
          flex: 1,
          color: unread ? '#4B5563' : '#6B7280',
          fontFamily: 'Overpass',
          fontSize: '1.1rem',
          fontWeight: 50,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingRight: '4rem',
        }}
      >
        {preview}
      </div>

      {/* TIME */}

      <div
        style={{
          color: unread ? 'var(--ip-dark-pink)' : '#6B7280',
          fontFamily: 'Overpass',
          fontSize: '1rem',
          fontWeight: unread ? 600 : 400,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {time}
      </div>
    </button>
  );
}

export default InboxEmailRow;
