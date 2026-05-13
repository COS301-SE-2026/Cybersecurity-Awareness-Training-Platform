import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
};

function deriveKey(password: string, salt: string, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, SCRYPT_PARAMS);

  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derivedKey.toString('hex'),
  ].join('$');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, derivedKeyHex] = hash.split('$');

  if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !derivedKeyHex) {
    return false;
  }

  const expectedKey = Buffer.from(derivedKeyHex, 'hex');

  if (expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = await deriveKey(password, salt, expectedKey.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  if (actualKey.length !== expectedKey.length) {
    return false;
  }

  if (timingSafeEqual(expectedKey, actualKey)) {
    return true;
  }

  return false;
}
