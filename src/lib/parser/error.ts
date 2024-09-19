import { ModelingException, ParsingException, ResolutionException } from '../../../interop/DtdlErr.js'

const isParsingException = (exception: ModelingException): exception is ParsingException => {
  return exception.ExceptionKind === 'Parsing'
}

const isResolutionException = (exception: ModelingException): exception is ResolutionException => {
  return exception.ExceptionKind === 'Resolution'
}

export const handleParsingException = (err: unknown) => {
  if (!(err instanceof Error)) console.error(`Unexpected error: ${err}`)

  const error = (err as Error).toString()

  // DTDL parser produces error strings prefixed with 'Error:'
  if (!error.startsWith('Error:')) console.error(`Unexpected error: ${err}`)

  const stripErrorPrefix = error.replace(/^Error:\s*/, '')

  const exception = JSON.parse(stripErrorPrefix) as ModelingException

  // determine type in case we want to log differently
  if (isParsingException(exception)) {
    console.log(exception)
  } else if (isResolutionException(exception)) {
    console.log(exception)
  } else {
    console.error('Unknown exception type')
    console.error(exception)
  }
}
