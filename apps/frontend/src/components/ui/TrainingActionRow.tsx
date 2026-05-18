import { ChevronRight } from '@mui/icons-material';

type TrainingActionRowProps = {
  label: string;
  status: string;
  disabled?: boolean;
  large?: boolean;
  onClick?: () => void;
};

function TrainingActionRow({
  label,
  status,
  disabled = false,
  large = false,
  onClick,
}: TrainingActionRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: disabled ? 'rgba(80, 40, 120, 0.45)' : 'rgba(53, 0, 94, 0.75)',
        opacity: disabled ? 0.65 : 1,
        padding: large ? '1.5rem 1.8rem' : '1rem 1.4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
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
            color: 'white',
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
              color: '#C98FFF',
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
              color: '#C98FFF',
              fontFamily: 'Jost',
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.08rem',
            }}
          >
            {status}
          </div>
        )}

        <ChevronRight
          style={{
            color: '#C98FFF',
            fontSize: '2.5rem',
          }}
        />
      </div>
    </div>
  );
}

export default TrainingActionRow;
