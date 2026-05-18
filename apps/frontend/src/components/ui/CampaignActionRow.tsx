import { KeyboardArrowRight } from '@mui/icons-material';

type CampaignActionRowProps = {
  title: string;
  status: string;
  disabled?: boolean;
  onClick?: () => void;
};

function CampaignActionRow({ title, status, disabled = false, onClick }: CampaignActionRowProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        backgroundColor: disabled ? 'rgba(40, 0, 60, 0.55)' : 'rgba(49, 0, 90, 0.55)',
        opacity: disabled ? 0.72 : 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 1.6rem',
        cursor: disabled ? 'default' : 'pointer',
        transition: '0.2s ease',
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

        <KeyboardArrowRight
          style={{
            color: disabled ? '#8E63B3' : '#C98FFF',

            fontSize: '2.4rem',
          }}
        />
      </div>
    </div>
  );
}

export default CampaignActionRow;
