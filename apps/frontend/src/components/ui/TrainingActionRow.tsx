import { ChevronRight, LockOutlined } from '@mui/icons-material';

type TrainingActionRowProps = {
  label: string;
  status: string;
  disabled?: boolean;
  showLockIcon?: boolean;
  large?: boolean;
  onClick?: () => void;
};

function TrainingActionRow({
  label,
  status,
  disabled = false,
  showLockIcon = false,
  large = false,
  onClick,
}: TrainingActionRowProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        backgroundColor: disabled ? '#2A0844' : 'rgba(53, 0, 94, 0.75)',
        opacity: disabled ? 0.65 : 1,
        padding: large ? '1.5rem 1.8rem' : '1rem 1.4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: '0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            color: disabled ? '#9A7AB8' : 'white',
            fontFamily: 'Overpass',
            fontSize: large ? '1.8rem' : '1.4rem',
            fontWeight: 500,
            letterSpacing: '0.08rem',
            width: '120px',
            flexShrink: 0,
          }}
        >
          {label}
        </div>

        {!large && (
          <div
            style={{
              color: disabled ? '#8E63B3' : '#C98FFF',
              fontFamily: 'Jost',
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.08rem',
              minWidth: '260px',
            }}
          >
            {status}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {large && (
          <div
            style={{
              color: disabled ? '#8E63B3' : '#C98FFF',
              fontFamily: 'Jost',
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.08rem',
            }}
          >
            {status}
          </div>
        )}
        {showLockIcon ? (
          <LockOutlined
            style={{
              color: '#8E63B3',
              fontSize: '2.2rem',
            }}
          />
        ) : (
          <ChevronRight
            style={{
              color: disabled ? '#8E63B3' : '#C98FFF',
              fontSize: '2.5rem',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default TrainingActionRow;
