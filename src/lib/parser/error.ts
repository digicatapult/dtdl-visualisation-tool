import { ModelingException, ParsingException, ResolutionException } from '../../../interop/DtdlErr.js'

export type ExceptionOptions = 'Parsing' | 'Resolution'

const isParsingEx = (exception: ModelingException): exception is ParsingException => {
  return exception.ExceptionKind === 'Parsing'
}

const isResolutionEx = (exception: ModelingException): exception is ResolutionException => {
  return exception.ExceptionKind === 'Resolution'
}

export const isResolutionException = (err: unknown) => {
  if (!(err instanceof Error)) return false
  return isResolutionEx(JSON.parse(err.message))
}

export const errorHandler = (err: unknown): boolean => {
  if (!(err instanceof Error)) {
    console.error(`Unexpected error: ${err}`)
    return false
  }

  const exception = JSON.parse(err.message) as ModelingException

  if (!(isParsingEx(exception) || isResolutionEx(exception))) console.error('Unknown exception type')
  console.error(exception)

  return false
}
