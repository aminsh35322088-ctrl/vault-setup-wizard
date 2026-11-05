function pemBytes(pem) {
  const clean = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function der(tag, value) {
  let length;
  if (value.length < 128) length = [value.length];
  else {
    let n = value.length;
    const bytes = [];
    while (n > 0) { bytes.unshift(n & 255); n >>>= 8; }
    length = [0x80 | bytes.length, ...bytes];
  }
  return Uint8Array.from([tag, ...length, ...value]);
}
export function pkcs8Bytes(pem) {
  const raw = pemBytes(pem);
  if (pem.includes("BEGIN PRIVATE KEY")) return raw;
  if (!pem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("GitHub App private key must be a PKCS#1 RSA or PKCS#8 PEM");
  }
  // Wrap GitHub's PKCS#1 RSA key in the PKCS#8 PrivateKeyInfo structure required by WebCrypto.
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const rsaAlgorithm = Uint8Array.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const privateKey = der(0x04, raw);
  const body = new Uint8Array(version.length + rsaAlgorithm.length + privateKey.length);
  body.set(version, 0);
  body.set(rsaAlgorithm, version.length);
  body.set(privateKey, version.length + rsaAlgorithm.length);
  return der(0x30, body);
}
