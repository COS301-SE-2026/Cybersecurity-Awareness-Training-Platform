type ButtonProps = {
  text: string;
  onClick?: () => void;
  backgroundColor?: string;
  hoverColor?: string;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
  width?: string;
  height?: string;
  fontSize?: string;
  marginTop?: string;
};

function Button({
  text,
  onClick,
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
      onClick={onClick}
      style={{
        width,
        height,
        backgroundColor,
        border: `2px solid ${borderColor}`,
        color: textColor,
        opacity,
        fontFamily: 'Jost',
        fontWeight: 500,
        fontSize,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: '0.2s ease',
        marginTop: '0.3rem',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor;
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
