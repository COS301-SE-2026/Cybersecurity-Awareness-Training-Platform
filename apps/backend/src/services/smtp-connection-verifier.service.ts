import { Resolver } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

export type SmtpConnectionVerificationInput = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  credential: string;
};
export type SmtpConnectionVerificationFailureReason =
  | 'SMTP_CONFIGURATION_INVALID'
  | 'SMTP_TARGET_NOT_ALLOWED'
  | 'SMTP_DNS_LOOKUP_FAILED'
  | 'SMTP_AUTHENTICATION_FAILED'
  | 'SMTP_CONNECTION_FAILED';
export type SmtpConnectionVerificationResult =
  | { connected: true }
  | { connected: false; reasonCode: SmtpConnectionVerificationFailureReason };

type SmtpAddressResolution =
  | { approved: true; address: string }
  | { approved: false; reasonCode: 'SMTP_TARGET_NOT_ALLOWED' | 'SMTP_DNS_LOOKUP_FAILED' };
type SmtpVerificationError = { code?: string; responseCode?: number };
type AddressRange = readonly [address: string, prefixLength: number, addressType: 'ipv4' | 'ipv6'];

const SMTP_DNS_TIMEOUT_MS = 5_000;
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 20_000;
const BLOCKED_SMTP_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'home.arpa']);
const BLOCKED_SMTP_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.localdomain',
  '.internal',
  '.lan',
  '.home',
  '.home.arpa',
  '.test',
  '.example',
  '.invalid',
];
const BLOCKED_IPV4_RANGES: readonly AddressRange[] = [
  ['0.0.0.0', 8, 'ipv4'],
  ['10.0.0.0', 8, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'],
  ['192.0.2.0', 24, 'ipv4'],
  ['192.88.99.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['198.18.0.0', 15, 'ipv4'],
  ['198.51.100.0', 24, 'ipv4'],
  ['203.0.113.0', 24, 'ipv4'],
  ['224.0.0.0', 4, 'ipv4'],
  ['240.0.0.0', 4, 'ipv4'],
];
const BLOCKED_IPV6_RANGES: readonly AddressRange[] = [
  ['2001::', 23, 'ipv6'],
  ['2001:db8::', 32, 'ipv6'],
  ['2002::', 16, 'ipv6'],
  ['3fff::', 20, 'ipv6'],
];
const PUBLIC_IPV6_RANGES: readonly AddressRange[] = [['2000::', 3, 'ipv6']];
const BLOCKED_IPV4_ADDRESSES = createAddressBlockList(BLOCKED_IPV4_RANGES);
const BLOCKED_IPV6_ADDRESSES = createAddressBlockList(BLOCKED_IPV6_RANGES);
const PUBLIC_IPV6_ADDRESSES = createAddressBlockList(PUBLIC_IPV6_RANGES);

export async function verifySmtpConnection(
  input: SmtpConnectionVerificationInput,
): Promise<SmtpConnectionVerificationResult> {
  const smtpHostname = input.smtpHost.trim().toLowerCase();

  if (
    smtpHostname.length === 0 ||
    input.smtpUsername.trim().length === 0 ||
    input.credential.length === 0 ||
    hasSupportedSmtpSecurity(input.smtpPort, input.smtpSecure) === false
  ) {
    return { connected: false, reasonCode: 'SMTP_CONFIGURATION_INVALID' };
  }

  if (isDisallowedSmtpHostname(smtpHostname) === true) {
    return { connected: false, reasonCode: 'SMTP_TARGET_NOT_ALLOWED' };
  }

  const resolution = await resolveApprovedSmtpAddress(smtpHostname);
  if (resolution.approved === false) {
    return { connected: false, reasonCode: resolution.reasonCode };
  }

  const transportOptions: SMTPTransport.Options = {
    host: resolution.address,
    port: input.smtpPort,
    secure: input.smtpSecure,
    requireTLS: input.smtpPort === 587,
    auth: { user: input.smtpUsername, pass: input.credential },
    tls: { servername: smtpHostname, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    dnsTimeout: SMTP_DNS_TIMEOUT_MS,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    logger: false,
    debug: false,
    transactionLog: false,
  };
  const transporter = nodemailer.createTransport(transportOptions);

  try {
    await transporter.verify();
    return { connected: true };
  } catch (error: unknown) {
    return mapSmtpVerificationFailure(error);
  } finally {
    transporter.close();
  }
}

function hasSupportedSmtpSecurity(smtpPort: number, smtpSecure: boolean): boolean {
  if (smtpPort === 465 && smtpSecure === true) {
    return true;
  }

  if (smtpPort === 587 && smtpSecure === false) {
    return true;
  }

  return false;
}

function isDisallowedSmtpHostname(smtpHostname: string): boolean {
  if (
    isIP(smtpHostname) !== 0 ||
    smtpHostname.includes('.') === false ||
    BLOCKED_SMTP_HOSTNAMES.has(smtpHostname) === true
  ) {
    return true;
  }

  for (const blockedSuffix of BLOCKED_SMTP_HOSTNAME_SUFFIXES) {
    if (smtpHostname.endsWith(blockedSuffix) === true) {
      return true;
    }
  }

  return false;
}

async function resolveApprovedSmtpAddress(smtpHostname: string): Promise<SmtpAddressResolution> {
  const resolver = new Resolver();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const lookup = Promise.allSettled([
      resolver.resolve4(smtpHostname),
      resolver.resolve6(smtpHostname),
    ]);
    const timeoutReached = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        resolver.cancel();
        reject(new Error('SMTP DNS lookup timed out'));
      }, SMTP_DNS_TIMEOUT_MS);
    });

    const results = await Promise.race([lookup, timeoutReached]);
    const addresses = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    );

    if (addresses.length === 0) {
      return { approved: false, reasonCode: 'SMTP_DNS_LOOKUP_FAILED' };
    }

    for (const address of addresses) {
      if (isPublicSmtpAddress(address) === false) {
        return { approved: false, reasonCode: 'SMTP_TARGET_NOT_ALLOWED' };
      }
    }

    return { approved: true, address: addresses[0] };
  } catch {
    return { approved: false, reasonCode: 'SMTP_DNS_LOOKUP_FAILED' };
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function isPublicSmtpAddress(address: string): boolean {
  const addressType = isIP(address);

  if (addressType === 4) {
    return BLOCKED_IPV4_ADDRESSES.check(address, 'ipv4') === false;
  }

  if (addressType === 6) {
    if (PUBLIC_IPV6_ADDRESSES.check(address, 'ipv6') === false) {
      return false;
    }

    return BLOCKED_IPV6_ADDRESSES.check(address, 'ipv6') === false;
  }

  return false;
}

function mapSmtpVerificationFailure(error: unknown): SmtpConnectionVerificationResult {
  const smtpError =
    typeof error === 'object' && error !== null ? (error as SmtpVerificationError) : undefined;

  if (smtpError?.code === 'EAUTH' || smtpError?.responseCode === 535) {
    return { connected: false, reasonCode: 'SMTP_AUTHENTICATION_FAILED' };
  }

  return { connected: false, reasonCode: 'SMTP_CONNECTION_FAILED' };
}

function createAddressBlockList(addressRanges: readonly AddressRange[]): BlockList {
  const blockList = new BlockList();

  for (const [address, prefixLength, addressType] of addressRanges) {
    blockList.addSubnet(address, prefixLength, addressType);
  }

  return blockList;
}
