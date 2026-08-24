export interface SyncPackageAuthenticationProvider {
  authenticate(canonicalPackage: string): string;
  verify(canonicalPackage: string, authTag: string): boolean;
}
