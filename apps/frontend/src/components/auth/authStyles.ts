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
