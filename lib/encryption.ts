/**
 * API Key Encryption Utilities
 * 
 * Provides functions to encrypt/decrypt API keys using AES-256-GCM.
 * API keys are encrypted at rest but can be retrieved for programmatic use.
 * 
 * Uses Web Crypto API for encryption (available in Node.js 15+ and browsers)
 */

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256
const IV_LENGTH = 12
const TAG_LENGTH = 128

/**
 * Get encryption key from environment
 * Falls back to a default for development (should be changed in production)
 */
function getEncryptionKey(): string {
  return process.env.ENCRYPTION_KEY || process.env.SUPABASE_ENCRYPTION_KEY || "default-key-change-in-production-32-chars!"
}

/**
 * Derive a crypto key from the encryption key string
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const keyString = getEncryptionKey()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)

  // Import key for AES-GCM
  return await crypto.subtle.importKey(
    "raw",
    keyData.slice(0, 32), // Use first 32 bytes
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  )
}

/**
 * Encrypt an API key
 */
export async function encryptApiKey(apiKey: string | null | undefined): Promise<string | null> {
  if (!apiKey || apiKey.trim() === "") {
    return null
  }

  try {
    const key = await getCryptoKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      data
    )

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    // Return base64 encoded
    return Buffer.from(combined).toString("base64")
  } catch (error) {
    console.error("[Authority] Error encrypting API key:", error)
    throw error
  }
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(encryptedKey: string | null | undefined): Promise<string | null> {
  if (!encryptedKey) {
    return null
  }

  try {
    const key = await getCryptoKey()
    const combined = Buffer.from(encryptedKey, "base64")
    const iv = combined.slice(0, IV_LENGTH)
    const encrypted = combined.slice(IV_LENGTH)

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encrypted
    )

    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error("[Authority] Error decrypting API key:", error)
    throw error
  }
}
