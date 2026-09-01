import type { ChangeEventHandler, CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import { Link } from 'react-router-dom';

type AuthPageFrameProps = Readonly<{
  leftWidth: string;
  rightWidth: string;
  leftChildren: ReactNode;
  rightChildren: ReactNode;
  leftPanelStyle?: CSSProperties;
  rightPanelStyle?: CSSProperties;
  responsive?: boolean;
  leftPanelClassName?: string;
  rightPanelClassName?: string;
}>;

type AuthPageIntroProps = Readonly<{
  title: string;
  logo?: ReactNode;
  afterDivider?: ReactNode;
  message?: string | null;
  titleStyle?: CSSProperties;
  dividerStyle?: CSSProperties;
  messageStyle?: CSSProperties;
}>;

type AuthFormFieldProps = Readonly<{
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  wrapperStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  autoComplete?: string;
  rightLabel?: ReactNode;
  disabled?: boolean;
}>;

type AuthActionLinkProps = Readonly<{
  to: string;
  prefix: string;
  emphasis: string;
  outerStyle?: CSSProperties;
  rowStyle?: CSSProperties;
  iconStyle?: CSSProperties;
  emphasisStyle?: CSSProperties;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}>;

export function AuthPageFrame({
  leftWidth,
  rightWidth,
  leftChildren,
  rightChildren,
  leftPanelStyle,
  rightPanelStyle,
  responsive = false,
  leftPanelClassName = '',
  rightPanelClassName = '',
}: AuthPageFrameProps) {
  if (responsive) {
    return (
      <main className="flex min-h-screen w-full flex-col overflow-y-auto bg-light-purple lg:flex-row">
        <section
          className={`flex w-full flex-col justify-center bg-white-purple px-6 py-8 sm:px-10 lg:min-h-screen ${leftPanelClassName}`}
          style={leftPanelStyle}
        >
          {leftChildren}
        </section>

        <section
          className={`hidden bg-faint-purple px-6 py-8 lg:flex lg:min-h-screen lg:items-center lg:justify-center ${rightPanelClassName}`}
          style={rightPanelStyle}
        >
          {rightChildren}
        </section>
      </main>
    );
  }

  return (
    <main style={pageFrameStyle}>
      <section
        style={{
          ...leftPanelBaseStyle,
          width: leftWidth,
          ...leftPanelStyle,
        }}
      >
        {leftChildren}
      </section>

      <section
        style={{
          ...rightPanelBaseStyle,
          width: rightWidth,
          ...rightPanelStyle,
        }}
      >
        {rightChildren}
      </section>
    </main>
  );
}

export function AuthPageIntro({
  title,
  logo,
  afterDivider,
  message,
  titleStyle,
  dividerStyle,
  messageStyle,
}: AuthPageIntroProps) {
  return (
    <>
      {logo}

      <h1
        style={{
          ...authTitleStyle,
          ...titleStyle,
        }}
      >
        {title}
      </h1>

      <div
        style={{
          ...authDividerStyle,
          ...dividerStyle,
        }}
      />

      {afterDivider}

      {message ? (
        <p
          style={{
            ...authMessageStyle,
            ...messageStyle,
          }}
        >
          {message}
        </p>
      ) : null}
    </>
  );
}

export function AuthFormField({
  label,
  type,
  value,
  onChange,
  wrapperStyle,
  labelStyle,
  inputStyle,
  autoComplete,
  rightLabel,
  disabled,
}: AuthFormFieldProps) {
  const inputId = useId();

  return (
    <div
      style={{
        ...authFieldWrapperStyle,
        ...wrapperStyle,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.4rem',
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            ...authFieldLabelStyle,
            ...labelStyle,
            marginBottom: 0,
          }}
        >
          {label}
        </label>
        {rightLabel}
      </div>

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          ...authFieldInputStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          ...inputStyle,
        }}
      />
    </div>
  );
}

export function AuthActionLink({
  to,
  prefix,
  emphasis,
  outerStyle,
  rowStyle,
  iconStyle,
  emphasisStyle,
  onClick,
}: AuthActionLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        ...authActionLinkStyle,
        ...outerStyle,
      }}
    >
      <div
        style={{
          ...authActionRowStyle,
          ...rowStyle,
        }}
      >
        <span>
          {prefix}{' '}
          <span
            style={{
              ...authActionEmphasisStyle,
              ...emphasisStyle,
            }}
          >
            {emphasis}
          </span>
        </span>

        <span
          className="material-symbols-outlined"
          style={{
            ...authActionIconStyle,
            ...iconStyle,
          }}
        >
          arrow_forward
        </span>
      </div>
    </Link>
  );
}

const pageFrameStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  overflow: 'hidden',
  backgroundColor: '#040025',
} satisfies CSSProperties;

const leftPanelBaseStyle = {
  backgroundColor: '#2F0360',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingLeft: '5vw',
  paddingRight: '4vw',
} satisfies CSSProperties;

const rightPanelBaseStyle = {
  backgroundColor: '#090054',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
} satisfies CSSProperties;

const authTitleStyle = {
  fontFamily: 'Jost',
  fontWeight: 400,
  fontSize: '5rem',
  letterSpacing: '0.03em',
  color: '#D6B3FF',
  margin: 0,
  marginBottom: '1rem',
  lineHeight: 1,
} satisfies CSSProperties;

const authDividerStyle = {
  width: '100%',
  height: '5px',
  backgroundColor: '#8400FF',
  marginBottom: '1rem',
} satisfies CSSProperties;

const authMessageStyle = {
  margin: 0,
  color: '#FFFFFF',
  fontFamily: 'Jost',
  fontWeight: 500,
  fontSize: '1.2rem',
  letterSpacing: '0.03em',
} satisfies CSSProperties;

const authFieldWrapperStyle = {
  width: '100%',
} satisfies CSSProperties;

const authFieldLabelStyle = {
  display: 'block',
  fontFamily: 'Jost',
  fontWeight: 400,
  fontSize: '1.5rem',
  letterSpacing: '0.05em',
  color: '#B37DFF',
  marginBottom: '0.4rem',
} satisfies CSSProperties;

const authFieldInputStyle = {
  width: '100%',
  height: '60px',
  backgroundColor: '#090054',
  border: 'none',
  outline: 'none',
  padding: '0 1rem',
  letterSpacing: '0.05em',
  color: '#FFFFFF',
  fontFamily: 'Overpass',
  fontSize: '1.4rem',
} satisfies CSSProperties;

const authActionLinkStyle = {
  textDecoration: 'none',
  width: 'fit-content',
} satisfies CSSProperties;

const authActionRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
  fontFamily: 'Jost',
  fontSize: '1.4rem',
  letterSpacing: '0.05em',
  color: '#B37DFF',
  fontWeight: 400,
} satisfies CSSProperties;

const authActionEmphasisStyle = {
  fontWeight: 500,
} satisfies CSSProperties;

const authActionIconStyle = {
  fontSize: '2rem',
  color: '#B37DFF',
} satisfies CSSProperties;
