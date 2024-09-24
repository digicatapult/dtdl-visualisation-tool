import { ModelingException, ParsingException, ResolutionException } from '../../../interop/DtdlErr.js'

const { error } = console

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

export const errorHandler = (err: unknown) => {
  if (!(err instanceof Error)) return error(`Unexpected error: ${err}`)

  const exception = JSON.parse(err.message) as ModelingException

  if (!(isParsingEx(exception) || isResolutionEx(exception))) error('Unknown exception type')
  error(exception)
}
