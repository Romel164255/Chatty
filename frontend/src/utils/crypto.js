// Cache derived keys so we don't re-run PBKDF2 on every message
const keyCache = new Map();

/**
 * Derives a deterministic AES-GCM key for a given conversationId using PBKDF2.
 *
 * NOTE: In a production E2E-encrypted app you would exchange per-user keypairs
 * (e.g. via ECDH) so the server never sees plaintext. This demo derives the
 * key from the conversationId + a shared passphrase so that all participants
 * can decrypt without a separate key-exchange round-trip. The key never leaves
 * the browser.
 */
async function deriveConversationKey(conversationId) {
    if (keyCache.has(conversationId)) return keyCache.get(conversationId);

    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode("rchat-v1-demo"),   // shared passphrase (would be secret in prod)
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(conversationId),   // conversation-specific salt
            iterations: 100_000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    keyCache.set(conversationId, key);
    return key;
}

/**
 * Encrypts a plaintext string for the given conversation.
 * Returns { ciphertext, iv } — both base64-encoded strings safe for JSON/DB.
 */
export async function encryptMessage(message, conversationId) {
    const key = await deriveConversationKey(conversationId);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(message)
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
    };
}

/**
 * Decrypts a ciphertext+iv pair for the given conversation.
 * Throws if the key or ciphertext is wrong (caller should catch).
 */
export async function decryptMessage(ciphertext, iv, conversationId) {
    const key = await deriveConversationKey(conversationId);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)),
        },
        key,
        Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    );

    return new TextDecoder().decode(decrypted);
}