import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { SyncPackageAuthenticationProvider } from '@/core/application/ports/sync-package-authentication';

export class HmacSha256AuthenticationProvider implements SyncPackageAuthenticationProvider {
  private readonly passphrase: Uint8Array;

  constructor(passphrase: string) {
    if (passphrase.trim() === '') {
      throw new Error('Sync package shared passphrase must not be empty');
    }

    this.passphrase = utf8ToBytes(passphrase);
  }

  authenticate(canonicalPackage: string): string {
    return `hmac-sha256:${bytesToHex(hmac(sha256, this.passphrase, utf8ToBytes(canonicalPackage)))}`;
  }

  verify(canonicalPackage: string, authTag: string): boolean {
    const expected = this.authenticate(canonicalPackage);
    let difference = expected.length ^ authTag.length;

    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected.charCodeAt(index) ^ (authTag.charCodeAt(index) || 0);
    }

    return difference === 0;
  }
}
