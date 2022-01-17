import { NonNullProperties } from '~/types'

function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
  if (!host) {
    throw new Error('>>Error<<: Could not determine domain URL')
  }
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return '>>Error<<: Unknown Error'
}

function getErrorStack(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.stack
  return '>>Error<<: Unknown Error'
}

function getNonNull<Type extends Record<string, null | undefined | unknown>>(
  obj: Type
): NonNullProperties<Type> {
  for (const [key, val] of Object.entries(obj)) {
    assertNonNull(val, `The value of ${key} is null but it should not be.`)
  }
  return obj as NonNullProperties<Type>
}

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string
): asserts possibleNull is Exclude<PossibleNullType, null | undefined> {
  if (possibleNull == null) throw new Error(errorMessage)
}

function removeTrailingSlash(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

function typedBoolean<T>(
  value: T
): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value)
}

export {
  getDomainUrl,
  getErrorMessage,
  getErrorStack,
  getNonNull,
  removeTrailingSlash,
  typedBoolean
}
