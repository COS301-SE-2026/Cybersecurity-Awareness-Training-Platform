import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

type PageBackButtonProps = {
  readonly marginBottom?: CSSProperties['marginBottom'];
};

function PageBackButton({ marginBottom = '-1.2rem' }: PageBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <button
      onClick={handleBack}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.12rem',
        width: 'fit-content',
        cursor: 'pointer',
        marginBottom,
        color: '#b882ff',
        transition: '0.18s ease',
        userSelect: 'none',
        background: 'none',
        border: 'none',
        padding: 0,
      }}
    >
      <ChevronLeftIcon
        style={{
          fontSize: '2.2rem',
        }}
      />

      <span
        style={{
          fontFamily: 'Jost',
          fontSize: '1rem',
          fontWeight: 500,
          letterSpacing: '0.12rem',
        }}
      >
        BACK
      </span>
    </button>
  );
}

export default PageBackButton;
