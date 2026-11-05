import nacl from "tweetnacl";
import { blake2b } from "blakejs";

/**
 * GitHub Actions secret encryption, byte-compatible with libsodium crypto_box_seal.
 * Output is ephemeral Curve25519 public key followed by XSalsa20-Poly1305 ciphertext.
 */
export function encryptActionSecret(publicKey, value) {
  const recipient = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
  if (recipient.length !== nacl.box.publicKeyLength) {
    throw new Error("GitHub returned an invalid repository public key");
  }
  const ephemeral = nacl.box.keyPair();
  const nonceInput = new Uint8Array(ephemeral.publicKey.length + recipient.length);
  nonceInput.set(ephemeral.publicKey, 0);
  nonceInput.set(recipient, ephemeral.publicKey.length);
  const nonce = blake2b(nonceInput, undefined, nacl.box.nonceLength);
  const cipher = nacl.box(new TextEncoder().encode(value), nonce, recipient, ephemeral.secretKey);
  const sealed = new Uint8Array(ephemeral.publicKey.length + cipher.length);
  sealed.set(ephemeral.publicKey, 0);
  sealed.set(cipher, ephemeral.publicKey.length);
  let binary = "";
  for (const byte of sealed) binary += String.fromCharCode(byte);
  return btoa(binary);
}
