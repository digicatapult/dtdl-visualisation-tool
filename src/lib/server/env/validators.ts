import envalid from 'envalid'

export const strArrayValidator = envalid.makeValidator((input) => {
  const arr = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !!s)

  const first = arr.shift()
  if (first === undefined) {
    throw new Error('must provide at least one cookie signing key')
  }
  const res: [string, ...string[]] = [first, ...arr]
  return res
})

export const optionalStrValidator = envalid.makeValidator((input) => {
  return input || undefined
})
