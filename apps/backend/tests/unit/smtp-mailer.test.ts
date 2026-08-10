import { describe, expect, it } from 'vitest';
import { classifySmtpFailure } from '../../src/services/smtp-mailer.js';

describe('SMTP failure classification', () => {
  it.each(['ETIMEDOUT', 'ECONNRESET', 'ESOCKET', 'EAI_AGAIN', 'ECONNREFUSED', 'ENOTFOUND'])(
    'classifies pre-submission %s failures as retryable',
    (code) => {
      expect(classifySmtpFailure({ code, command: 'CONN' })).toEqual({
        failureKind: 'RETRYABLE',
        reasonCode: 'SMTP_PRE_SUBMISSION_TRANSPORT_FAILURE',
      });
    },
  );

  it.each(['ETIMEDOUT', 'ECONNRESET', 'ESOCKET'])(
    'classifies %s after DATA as ambiguous',
    (code) => {
      expect(classifySmtpFailure({ code, command: 'DATA' })).toEqual({
        failureKind: 'AMBIGUOUS',
        reasonCode: 'SMTP_AMBIGUOUS_AFTER_DATA',
      });
    },
  );

  it('classifies transient SMTP response codes as retryable', () => {
    expect(classifySmtpFailure({ responseCode: 451, command: 'RCPT TO' })).toEqual({
      failureKind: 'RETRYABLE',
      reasonCode: 'SMTP_TEMPORARY_FAILURE',
    });
  });

  it('classifies permanent SMTP response codes as non-retryable', () => {
    expect(classifySmtpFailure({ responseCode: 550, command: 'RCPT TO' })).toEqual({
      failureKind: 'NON_RETRYABLE',
      reasonCode: 'SMTP_PERMANENT_FAILURE',
    });
  });
});
