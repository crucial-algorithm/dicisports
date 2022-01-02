import * as crypto from 'crypto'

const UNMISTAKABLE_CHARS =
  '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz'
const BASE64_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'

// `type` is one of `RandomGenerator.Type` as defined below.
//
// options:
// - seeds: (required, only for RandomGenerator.Type.ALEA) an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm
abstract class RandomGenerator {
  /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */
  // eslint-disable-next-line class-methods-use-this
  fraction(): number {
    throw new Error(`Unknown random generator type`)
  }

  /**
   * @name hexString
   * @summary Return a random string of `n` hexadecimal digits.
   * @locus Anywhere
   * @param digits
   */
  hexString(digits: number) {
    return this.randomString(digits, '0123456789abcdef')
  }

  private randomString(charsCount: number, alphabet: string) {
    let result = ''
    for (let i = 0; i < charsCount; i++) {
      result += this.choice(alphabet)
    }
    return result
  }

  /**
   * @name Random.id
   * @summary Return a unique identifier, such as `"Jjwjg6gouWLXhMGKW"`, that is
   * likely to be unique in the whole world.
   * @param charsCount
   */
  id(charsCount = 20): string {
    return this.randomString(charsCount, UNMISTAKABLE_CHARS)
  }

  /**
   * @name Random.secret
   * @summary Return a random string of printable characters with 6 bits of
   * entropy per character. Use `Random.secret` for security-critical secrets
   * that are intended for machine, rather than human, consumption.
   * @locus Anywhere
   *   characters, or 256 bits of entropy)
   * @param charsCount
   */
  secret(charsCount: number | undefined) {
    // Default to 256 bits of entropy, or 43 characters at 6 bits per
    // character.
    let chars = charsCount
    if (chars === undefined) {
      chars = 43
    }

    return this.randomString(chars, BASE64_CHARS)
  }

  /**
   * @name Random.choice
   * @summary Return a random element of the given array or string.
   * @locus Anywhere
   * @param {Array|String} arrayOrString Array or string to choose from
   */
  choice(arrayOrString: Array<any> | string) {
    const index = Math.floor(this.fraction() * arrayOrString.length)
    if (typeof arrayOrString === 'string') {
      return arrayOrString.substr(index, 1)
    }
    return arrayOrString[index]
  }
}

class Random extends RandomGenerator {
  /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */
  fraction() {
    const numerator = Number.parseInt(this.hexString(8), 16)
    return numerator * 2.3283064365386963e-10 // 2^-3;
  }

  /**
   * @name Random.hexString
   * @summary Return a random string of `n` hexadecimal digits.
   * @locus Anywhere
   * @param {Number} digits Length of the string
   */
  // eslint-disable-next-line class-methods-use-this
  hexString(digits: number) {
    const numBytes = Math.ceil(digits / 2)
    let bytes: Buffer
    // Try to get cryptographically strong randomness. Fall back to
    // non-cryptographically strong if not available.
    try {
      bytes = crypto.randomBytes(numBytes)
    } catch (e) {
      // XXX should re-throw any error except insufficient entropy
      bytes = crypto.pseudoRandomBytes(numBytes)
    }
    const result = bytes.toString('hex')
    // If the number of digits is odd, we'll have generated an extra 4 bits
    // of randomness, so we need to trim the last digit.
    return result.substring(0, digits)
  }
}

const instance = new Random()

export default function id(): string {
  return instance.id()
}
