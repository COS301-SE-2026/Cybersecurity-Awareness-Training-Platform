import { ChevronRight, LockOutlined, MenuBookSharp, QuizSharp } from '@mui/icons-material';

type TrainingActionRowProps = {
  label: string;
  status: string;
  disabled?: boolean;
  showLockIcon?: boolean;
  large?: boolean;
  iconType?: 'learn' | 'quiz';
  onClick?: () => void;
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
  const cleanedLabel = label.replace(/"/g, '');

  const labelParts = cleanedLabel.split(': ');

  const labelPrefix = labelParts[0];

  const labelTitle = labelParts.slice(1).join(': ');

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
              fontWeight: 500,
              color: disabled ? '#9A7AB8' : 'white',
            }}
          >
            {labelPrefix}:
          </span>

          <span
            style={{
              fontWeight: 400,
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
              fontSize: '2.5rem',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default TrainingActionRow;
