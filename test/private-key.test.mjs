import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, webcrypto } from "node:crypto";
import { pkcs8Bytes } from "../src/private-key.js";

test("GitHub PKCS#1 RSA App key is converted into an importable PKCS#8 key", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const der = pkcs8Bytes(pem);
  const key = await webcrypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode("vault-app-jwt-test"));
  assert.equal(signature.byteLength, 256);
});

test("PKCS#8 private keys pass through unchanged", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const expected = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ""), "base64");
  assert.deepEqual(Buffer.from(pkcs8Bytes(pem)), expected);
});

test("unsupported private key PEM formats fail closed", () => {
  assert.throws(() => pkcs8Bytes("-----BEGIN EC PRIVATE KEY-----\nAA==\n-----END EC PRIVATE KEY-----"));
});
