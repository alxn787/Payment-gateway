// src/types/shamirs-secret-sharing.d.ts

declare module 'shamirs-secret-sharing' {
  /**
   * Splits a secret (Buffer) into 'shares' number of shares,
   * requiring 'threshold' of them to reconstruct the secret.
   * @param secret The secret value as a Buffer.
   * @param options An object with 'shares' (total number of shares) and 'threshold' (minimum required shares).
   * @returns An array of Buffer objects, each representing a share.
   */
  function split(secret: Buffer, options: { shares: number; threshold: number }): Buffer[];

  /**
   * Combines an array of shares (Buffers) to reconstruct the original secret.
   * @param shares An array of Buffer objects, each representing a share.
   * @returns The reconstructed secret as a Buffer.
   */
  function combine(shares: Buffer[]): Buffer;
}