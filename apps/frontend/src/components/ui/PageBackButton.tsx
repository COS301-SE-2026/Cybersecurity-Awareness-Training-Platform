import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type PageBackButtonProps = {
  marginBottom?: CSSProperties['marginBottom'];
};

function PageBackButton({ marginBottom = '-1.2rem' }: PageBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleBack();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleBack}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.1rem',
        width: 'fit-content',
        cursor: 'pointer',
        marginBottom,
        color: '#b882ff',
        transition: '0.18s ease',
        userSelect: 'none',
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
    </div>
  );
}

export default PageBackButton;
