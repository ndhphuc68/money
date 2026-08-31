import { HmacSha256AuthenticationProvider } from '@/data/sync/authentication/hmac-sha256-authentication-provider';

describe('HmacSha256AuthenticationProvider', () => {
  it('creates the standard SHA-256 HMAC tag for canonical package content', () => {
    const provider = new HmacSha256AuthenticationProvider('key');

    expect(provider.authenticate('The quick brown fox jumps over the lazy dog')).toBe(
      'hmac-sha256:f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('rejects a tag created with a different shared passphrase', () => {
    const trustedProvider = new HmacSha256AuthenticationProvider('trusted passphrase');
    const untrustedProvider = new HmacSha256AuthenticationProvider('different passphrase');
    const authTag = trustedProvider.authenticate(
      '{"checksum":"fnv1a-32:deadbeef","formatVersion":2}',
    );

    expect(
      untrustedProvider.verify('{"checksum":"fnv1a-32:deadbeef","formatVersion":2}', authTag),
    ).toBe(false);
  });
});
