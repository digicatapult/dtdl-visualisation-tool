import { ModelingException, ParsingException, ResolutionException } from '../../../interop/DtdlErr.js'

const { log, error } = console

const isParsingException = (exception: ModelingException): exception is ParsingException => {
  return exception.ExceptionKind === 'Parsing'
}

const isResolutionException = (exception: ModelingException): exception is ResolutionException => {
  return exception.ExceptionKind === 'Resolution'
}

export const handleParsingException = (err: string) => {
  // DTDL parser produces error strings prefixed with 'Error:'
  if (!err.startsWith('Error:')) error(`Unexpected error: ${err}`)

  const stripErrorPrefix = err.replace(/^Error:\s*/, '')

  const exception = JSON.parse(stripErrorPrefix) as ModelingException

  // determine type in case we want to log differently
  if (isParsingException(exception)) {
    log(exception)
  } else if (isResolutionException(exception)) {
    log(exception)
  } else {
    error('Unknown exception type')
    error(exception)
  }
}
