import type { CSSProperties } from 'react';

export const authFormStyle = {
  display: 'flex',
  flexDirection: 'column',
} satisfies CSSProperties;

export const authFieldRowStyle = {
  display: 'flex',
  gap: '2.5rem',
} satisfies CSSProperties;

export const authPrimaryButtonStyle = {
  border: 'none',
  cursor: 'pointer',
  background: '#8400FF',
  color: '#D6B3FF',
  fontFamily: 'Jost',
  fontWeight: 400,
  letterSpacing: '0.02em',
} satisfies CSSProperties;

export const authLightTitleStyle = {
  color: 'var(--ip-dark-pink)',
} satisfies CSSProperties;

export const authLightMessageStyle = {
  color: 'var(--ip-deep-purple)',
} satisfies CSSProperties;

export const authLightFieldLabelStyle = {
  color: 'var(--ip-dark-pink)',
  fontSize: 'clamp(1.15rem, 4vw, 1.5rem)',
} satisfies CSSProperties;

export const authLightFieldInputStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  color: 'var(--ip-deep-purple)',
  fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
} satisfies CSSProperties;

export const authResponsiveFieldRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '1.5rem',
} satisfies CSSProperties;

export const authResponsiveActionRowStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
} satisfies CSSProperties;
