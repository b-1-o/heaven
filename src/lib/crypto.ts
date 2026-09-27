import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key() {
  const raw = process.env.HEAVEN_ENCRYPTION_KEY
  if (!raw) throw new Error('HEAVEN_ENCRYPTION_KEY is not configured')
  const value = Buffer.from(raw, 'base64')
  if (value.length !== 32) throw new Error('HEAVEN_ENCRYPTION_KEY must decode to 32 bytes')
  return value
}

export function encryptText(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptText(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.')
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid encrypted secret')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
