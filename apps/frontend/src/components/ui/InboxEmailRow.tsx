import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

type InboxEmailRowProps = {
  sender: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  onClick?: () => void;
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
    <div
      onClick={onClick}
      style={{
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        backgroundColor: unread ? 'rgba(44, 0, 79, 0.72)' : 'rgba(22, 0, 43, 0.65)',
        border: unread ? '3px solid #3c0081' : '3px solid #210046',
        boxSizing: 'border-box',
        userSelect: 'none',
        cursor: 'pointer',
        transition: '0.18s ease',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {unread && (
        <div
          style={{
            position: 'absolute',
            left: '-3px',
            top: '-3px',
            width: '10px',
            height: 'calc(100% + 6px)',
            backgroundColor: '#7700ff',
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
          backgroundColor: unread ? 'rgba(170, 110, 255, 0.22)' : 'rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <AccountCircleOutlinedIcon
          style={{
            color: unread ? '#D7A7FF' : '#B9A7CC',
            fontSize: '2rem',
          }}
        />
      </div>

      {/* SENDER */}

      <div
        style={{
          width: '210px',
          color: unread ? '#E8D0FF' : 'white',
          fontFamily: 'Overpass',
          fontSize: '1.2rem',
          fontWeight: unread ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          letterSpacing: '0.08rem',
        }}
      >
        {sender}
      </div>

      {/* SUBJECT */}

      <div
        style={{
          width: '380px',
          color: unread ? 'white' : '#E2D8F1',
          fontFamily: 'Overpass',
          fontSize: '1.1rem',
          fontWeight: unread ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
        }}
      >
        {subject}
      </div>

      {/* PREVIEW */}

      <div
        style={{
          flex: 1,
          color: unread ? '#D4B7F5' : '#A88FC2',
          fontFamily: 'Overpass',
          fontSize: '1.1rem',
          fontWeight: 50,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingRight: '1.2rem',
        }}
      >
        {preview}
      </div>

      {/* TIME */}

      <div
        style={{
          color: unread ? '#F2D7FF' : '#C3AFD9',
          fontFamily: 'Overpass',
          fontSize: '1.1rem',
          fontWeight: unread ? 600 : 400,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {time}
      </div>
    </div>
  );
}

export default InboxEmailRow;
