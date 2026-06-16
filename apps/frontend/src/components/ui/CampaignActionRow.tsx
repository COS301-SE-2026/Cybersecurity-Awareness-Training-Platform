import { KeyboardArrowRight, LockOutlined } from '@mui/icons-material';

type CampaignActionRowProps = {
  title: string;
  status: string;
  disabled?: boolean;
  showLockIcon?: boolean;
  onClick?: () => void;
};

function CampaignActionRow({
  title,
  status,
  disabled = false,
  showLockIcon = false,
  onClick,
}: CampaignActionRowProps) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      type="button"
      style={{
        backgroundColor: disabled ? 'rgba(40, 0, 60, 0.54)' : 'rgba(49, 0, 90, 0.54)',
        opacity: disabled ? 0.71 : 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.21rem 1.61rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: '0.2s ease',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      {/* LEFT SIDE */}

      <div
        style={{
          color: disabled ? '#B08BCF' : 'white',
          fontFamily: 'Jost',
          fontSize: '1.8rem',
          letterSpacing: '0.08rem',
          fontWeight: 400,
        }}
      >
        {title}
      </div>

      {/* RIGHT SIDE */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            color: disabled ? '#8E63B3' : '#C98FFF',

            fontFamily: 'Jost',
            fontSize: '1.2rem',
            letterSpacing: '0.08rem',
            fontWeight: 500,
            minWidth: '260px',
            textAlign: 'right',
          }}
        >
          {status}
        </div>

        {showLockIcon ? (
          <LockOutlined
            style={{
              color: '#8E63B3',
              fontSize: '2rem',
            }}
          />
        ) : (
          <KeyboardArrowRight
            style={{
              color: disabled ? '#8E63B3' : '#C98FFF',
              fontSize: '2.4rem',
            }}
          />
        )}
      </div>
    </button>
  );
}

export default CampaignActionRow;
