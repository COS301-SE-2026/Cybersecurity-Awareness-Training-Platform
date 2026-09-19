type ButtonProps = {
  readonly text: string;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly disabled?: boolean;
  readonly ariaBusy?: boolean;
  readonly ariaLabel?: string;
  readonly backgroundColor?: string;
  readonly hoverColor?: string;
  readonly textColor?: string;
  readonly borderColor?: string;
  readonly opacity?: number;
  readonly width?: string;
  readonly height?: string;
  readonly fontSize?: string;
  readonly marginTop?: string;
};

function Button({
  text,
  onClick,
  type = 'button',
  disabled = false,
  ariaBusy = false,
  ariaLabel,
  backgroundColor = '#39006E',
  hoverColor = '#8400FF',
  textColor = '#D6B3FF',
  borderColor = '#8400FF',
  opacity = 1,
  width = '170px',
  height = '44px',
  fontSize = '1.2rem',
  marginTop = '0.3rem',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={ariaBusy}
      aria-label={ariaLabel}
      style={{
        width,
        height,
        backgroundColor,
        border: `2px solid ${borderColor}`,
        color: textColor,
        opacity: disabled === true ? Math.min(opacity, 0.6) : opacity,
        fontFamily: 'Jost',
        fontWeight: 500,
        fontSize,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        cursor: disabled === true ? 'not-allowed' : 'pointer',
        transition: '0.2s ease',
        marginTop,
      }}
      onMouseEnter={(e) => {
        if (disabled === false) {
          e.currentTarget.style.backgroundColor = hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
      }}
    >
      {text}
    </button>
  );
}

export default Button;
