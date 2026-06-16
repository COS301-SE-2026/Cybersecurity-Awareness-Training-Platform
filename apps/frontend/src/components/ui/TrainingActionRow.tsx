import {
  ChevronRight,
  LockOutlined,
  MenuBookSharp,
  QuizSharp,
  GamepadSharp,
} from '@mui/icons-material';

type TrainingActionRowProps = {
  readonly label: string;
  readonly status: string;
  readonly disabled?: boolean;
  readonly showLockIcon?: boolean;
  readonly large?: boolean;
  readonly iconType?: 'learn' | 'quiz' | 'simulation';
  readonly onClick?: () => void;
};

function TrainingActionRow({
  label,
  status,
  disabled = false,
  showLockIcon = false,
  large = false,
  iconType,
  onClick,
}: TrainingActionRowProps) {
  const cleanedLabel = label.replaceAll('"', '');

  const labelParts = cleanedLabel.split(': ');

  const labelPrefix = labelParts[0];

  const labelTitle = labelParts.slice(1).join(': ');

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      type="button"
      style={{
        backgroundColor: disabled ? '#2A0844' : 'rgba(53, 0, 93, 0.75)',
        opacity: disabled ? 0.64 : 1,
        padding: large ? '1.5rem 1.8rem' : '1rem 1.4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: '0.2s ease',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {iconType === 'learn' && (
          <MenuBookSharp
            style={{
              color: disabled ? '#9A7AB8' : '#C98FFF',
              fontSize: large ? '2rem' : '1.8rem',
            }}
          />
        )}
        {iconType === 'quiz' && (
          <QuizSharp
            style={{
              color: disabled ? '#9A7AB8' : '#C98FFF',
              fontSize: large ? '2rem' : '1.8rem',
            }}
          />
        )}
        {iconType === 'simulation' && (
          <GamepadSharp
            style={{
              color: disabled ? '#9A7AB8' : '#C98FFF',
              fontSize: large ? '2rem' : '1.8rem',
            }}
          />
        )}
        <div
          style={{
            color: disabled ? '#9A7AB8' : 'white',
            fontFamily: 'Overpass',
            fontSize: large ? '1.8rem' : '1.4rem',
            letterSpacing: '0.08rem',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontWeight: 800,
              color: disabled ? '#9A7AB8' : '#c383ff',
            }}
          >
            {labelPrefix}
          </span>

          <span
            style={{
              fontWeight: 100,
              color: disabled ? '#9A7AB8' : 'white',
            }}
          >
            {labelTitle}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
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
              fontSize: '2.51rem',
            }}
          />
        )}
      </div>
    </button>
  );
}

export default TrainingActionRow;
