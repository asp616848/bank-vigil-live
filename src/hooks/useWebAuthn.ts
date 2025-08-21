// Lightweight WebAuthn helpers focused on platform (built-in) authenticators

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    // Ensure API exists
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
    // Check for built-in (Touch ID / Windows Hello / Android fingerprint)
    const available = await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return !!available;
  } catch {
    return false;
  }
}

// Create a random challenge. In a production app this must come from the server.
function randomChallenge(length = 32): Uint8Array {
  const challenge = new Uint8Array(length);
  crypto.getRandomValues(challenge);
  return challenge;
}

export type WebAuthnResult = {
  ok: boolean;
  error?: string;
  assertion?: AuthenticationResponseJSON;
};

// Minimal JSON-friendly shape for potential backend use later
export type AuthenticationResponseJSON = {
  id: string;
  type: string;
  rawId: string; // base64url
  response: {
    authenticatorData: string; // base64url
    clientDataJSON: string; // base64url
    signature: string; // base64url
    userHandle: string | null; // base64url
  };
  clientExtensionResults: any;
};

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function authenticateWithPlatform(): Promise<WebAuthnResult> {
  try {
    if (!('credentials' in navigator) || !(window as any).PublicKeyCredential) {
      return { ok: false, error: 'WebAuthn not supported' };
    }

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: randomChallenge(),
      // Ask for platform/built-in authenticator and strong user verification
      userVerification: 'required',
      timeout: 60_000,
    } as any;

    // Attempt auth
    const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
    if (!cred) return { ok: false, error: 'Authentication was cancelled' };

    const resp = cred.response as AuthenticatorAssertionResponse;
    const json: AuthenticationResponseJSON = {
      id: cred.id,
      rawId: toBase64Url(cred.rawId),
      type: cred.type,
      response: {
        authenticatorData: toBase64Url(resp.authenticatorData),
        clientDataJSON: toBase64Url(resp.clientDataJSON),
        signature: toBase64Url(resp.signature),
        userHandle: resp.userHandle ? toBase64Url(resp.userHandle) : null,
      },
      clientExtensionResults: (cred.getClientExtensionResults && cred.getClientExtensionResults()) || {},
    };

    // NOTE: For a real app, send json + original challenge to backend for verification.
    return { ok: true, assertion: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Authentication failed' };
  }
}

// Registration (Passkey creation) — demo-only client-side generator
export type RegistrationResult = { ok: true; credentialId: string } | { ok: false; error: string };

function strToUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export async function registerPlatformPasskey(user: { id: string; name: string; displayName: string }): Promise<RegistrationResult> {
  try {
    if (!('credentials' in navigator) || !(window as any).PublicKeyCredential) {
      return { ok: false, error: 'WebAuthn not supported' };
    }
    const rpId = window.location.hostname; // e.g., localhost or your-ngrok-subdomain.ngrok-free.app
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: randomChallenge(),
      rp: { name: 'Bank of India Demo', id: rpId },
      user: {
        id: strToUtf8Bytes(user.id),
        name: user.name,
        displayName: user.displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      timeout: 60_000,
      attestation: 'none',
    } as any;

    const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!cred) return { ok: false, error: 'User cancelled' };
    const id = cred.id;
    return { ok: true, credentialId: id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Registration failed' };
  }
}
