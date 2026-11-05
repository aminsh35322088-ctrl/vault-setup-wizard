import test from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { blake2b } from "blakejs";
import { encryptActionSecret } from "../src/sealed-box.js";

const decode = value => Uint8Array.from(Buffer.from(value, "base64"));

test("GitHub sealed-box payload round-trips to the intended secret", () => {
  const recipient = nacl.box.keyPair();
  const encodedPublicKey = Buffer.from(recipient.publicKey).toString("base64");
  const secret = "CF_TEST_TOKEN_do_not_log_123456";
  const sealed = decode(encryptActionSecret(encodedPublicKey, secret));
  assert.equal(sealed.length, 32 + Buffer.byteLength(secret) + nacl.box.overheadLength);

  const ephemeralPublicKey = sealed.slice(0, nacl.box.publicKeyLength);
  const ciphertext = sealed.slice(nacl.box.publicKeyLength);
  const nonceInput = new Uint8Array(ephemeralPublicKey.length + recipient.publicKey.length);
  nonceInput.set(ephemeralPublicKey);
  nonceInput.set(recipient.publicKey, ephemeralPublicKey.length);
  const nonce = blake2b(nonceInput, undefined, nacl.box.nonceLength);
  const opened = nacl.box.open(ciphertext, nonce, ephemeralPublicKey, recipient.secretKey);
  assert.ok(opened);
  assert.equal(new TextDecoder().decode(opened), secret);
});

test("sealed-box payloads are randomized and authenticated", () => {
  const recipient = nacl.box.keyPair();
  const publicKey = Buffer.from(recipient.publicKey).toString("base64");
  const first = decode(encryptActionSecret(publicKey, "same secret"));
  const second = decode(encryptActionSecret(publicKey, "same secret"));
  assert.notDeepEqual(first, second);
  first[first.length - 1] ^= 1;
  const ephemeralPublicKey = first.slice(0, nacl.box.publicKeyLength);
  const nonceInput = new Uint8Array(ephemeralPublicKey.length + recipient.publicKey.length);
  nonceInput.set(ephemeralPublicKey);
  nonceInput.set(recipient.publicKey, ephemeralPublicKey.length);
  const nonce = blake2b(nonceInput, undefined, nacl.box.nonceLength);
  assert.equal(nacl.box.open(first.slice(nacl.box.publicKeyLength), nonce, ephemeralPublicKey, recipient.secretKey), null);
});
