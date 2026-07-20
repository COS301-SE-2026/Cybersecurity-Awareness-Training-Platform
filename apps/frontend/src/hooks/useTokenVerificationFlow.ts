import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionTokenStateDto } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import type { ResendTokenResponseDto, TokenContextResponseDto } from '../services/auth.service';
import type { TokenVerificationStatus } from '../components/auth/TokenVerificationPanel';

type TokenVerificationResponse = {
  state: ActionTokenStateDto;
};

type ResendFeedbackStatus = 'success' | 'error';

export type TokenVerificationMessages = Readonly<{
  pending: string;
  success: string;
  used: string;
  missingToken: string;
  invalid: string;
  expired: string;
  revoked: string;
  generic: string;
  resendSuccess: string;
  resendGeneric: string;
  resendIneligible: string;
  resendCooldown: (seconds: number) => string;
}>;

type UseTokenVerificationFlowInput<TResponse extends TokenVerificationResponse> = Readonly<{
  token: string;
  messages: TokenVerificationMessages;
  verifyToken: (token: string) => Promise<TResponse>;
  getTokenContext: (token: string) => Promise<TokenContextResponseDto>;
  resendToken: (token: string) => Promise<ResendTokenResponseDto>;
}>;

function getStateMessage(
  state: ActionTokenStateDto,
  messages: TokenVerificationMessages,
): { status: TokenVerificationStatus; message: string } {
  if (state === 'VALID') return { status: 'success', message: messages.success };
  if (state === 'USED') return { status: 'success', message: messages.used };
  if (state === 'EXPIRED') return { status: 'error', message: messages.expired };
  if (state === 'REVOKED') return { status: 'error', message: messages.revoked };

  return { status: 'error', message: messages.invalid };
}

function getApiErrorCode(error: ApiError): string | null {
  const body = error.body;

  if (body && typeof body === 'object' && 'error' in body) {
    const code = (body as { error?: unknown }).error;
    return typeof code === 'string' ? code : null;
  }

  return null;
}

function getCooldownSeconds(error: ApiError): number {
  const body = error.body;

  if (body && typeof body === 'object' && 'cooldownSeconds' in body) {
    const cooldownSeconds = (body as { cooldownSeconds?: unknown }).cooldownSeconds;
    return typeof cooldownSeconds === 'number' && cooldownSeconds > 0 ? cooldownSeconds : 0;
  }

  return 0;
}

export function useTokenVerificationFlow<TResponse extends TokenVerificationResponse>({
  token,
  messages,
  verifyToken,
  getTokenContext,
  resendToken,
}: UseTokenVerificationFlowInput<TResponse>) {
  const isMounted = useRef(true);
  const [status, setStatus] = useState<TokenVerificationStatus>('pending');
  const [message, setMessage] = useState(messages.pending);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendFeedbackMessage, setResendFeedbackMessage] = useState<string | null>(null);
  const [resendFeedbackStatus, setResendFeedbackStatus] = useState<ResendFeedbackStatus>('success');

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    let isCurrentRequest = true;

    async function verifyAndLoadContext() {
      setCanResend(false);
      setResendCooldownSeconds(0);
      setResendFeedbackMessage(null);

      if (!token) {
        setStatus('error');
        setMessage(messages.missingToken);
        return;
      }

      setStatus('pending');
      setMessage(messages.pending);

      try {
        const result = await verifyToken(token);
        if (!isMounted.current || !isCurrentRequest) return;

        const nextState = getStateMessage(result.state, messages);
        setStatus(nextState.status);
        setMessage(nextState.message);

        if (result.state === 'VALID') return;

        try {
          const context = await getTokenContext(token);
          if (!isMounted.current || !isCurrentRequest) return;

          setCanResend(context.canResend);
          setResendCooldownSeconds(context.resendCooldownSeconds);
        } catch {
          if (!isMounted.current || !isCurrentRequest) return;
          setCanResend(false);
          setResendCooldownSeconds(0);
        }
      } catch {
        if (!isMounted.current || !isCurrentRequest) return;
        setStatus('error');
        setMessage(messages.generic);
      }
    }

    void verifyAndLoadContext();

    return () => {
      isCurrentRequest = false;
    };
  }, [getTokenContext, messages, token, verifyToken]);

  const handleResend = useCallback(async () => {
    if (!token || !canResend || isResending || resendCooldownSeconds > 0) {
      return;
    }

    setIsResending(true);
    setResendFeedbackMessage(null);

    try {
      await resendToken(token);
      if (!isMounted.current) return;

      setCanResend(false);
      setResendCooldownSeconds(0);
      setResendFeedbackStatus('success');
      setResendFeedbackMessage(messages.resendSuccess);
    } catch (error) {
      if (!isMounted.current) return;

      if (error instanceof ApiError) {
        const errorCode = getApiErrorCode(error);

        if (errorCode === 'RESEND_COOLDOWN_ACTIVE') {
          const cooldownSeconds = getCooldownSeconds(error);
          setResendCooldownSeconds(cooldownSeconds);
          setResendFeedbackStatus('error');
          setResendFeedbackMessage(messages.resendCooldown(cooldownSeconds));
          return;
        }

        if (errorCode === 'TOKEN_RESEND_INELIGIBLE') {
          setCanResend(false);
          setResendFeedbackStatus('error');
          setResendFeedbackMessage(messages.resendIneligible);
          return;
        }
      }

      setResendFeedbackStatus('error');
      setResendFeedbackMessage(messages.resendGeneric);
    } finally {
      if (isMounted.current) {
        setIsResending(false);
      }
    }
  }, [canResend, isResending, messages, resendCooldownSeconds, resendToken, token]);

  return {
    status,
    message,
    canResend,
    resendCooldownSeconds,
    isResending,
    resendFeedbackMessage,
    resendFeedbackStatus,
    handleResend,
  };
}
