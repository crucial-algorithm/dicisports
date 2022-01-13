import crypto from 'crypto'
import Config from '~/utils/config.server'

const algorithm = 'aes-256-ctr'
const secret = Config().MAGIC_LINK_SECRET
const ENCRYPTION_KEY = crypto.scryptSync(secret, 'salt', 32)
const IV_LENGTH = 16

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(text: string) {
  const [ivPart, encryptedPart] = text.split(':')
  if (!ivPart || !encryptedPart) {
    throw new Error('>>Error<<: Invalid decrypt text')
  }

  const iv = Buffer.from(ivPart, 'hex')
  const encryptedText = Buffer.from(encryptedPart, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv)
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final()
  ])
  return decrypted.toString()
}

export { encrypt, decrypt }
