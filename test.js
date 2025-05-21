function createDeepJson(depth) {
  let json = ''
  for (let i = 0; i < depth; i++) {
    json += '['
  }
  json += '1'
  for (let i = 0; i < depth; i++) {
    json += ']'
  }
  return json
}

function testJsonParseLimit(maxDepth) {
  for (let depth = 9000000; depth <= maxDepth; depth += 100000) {
    try {
      const json = createDeepJson(depth)
      JSON.parse(json)
      console.log(`✅ Depth ${depth} parsed successfully`)
    } catch (err) {
      console.error(`❌ Depth ${depth} failed: ${err.message}`)
      break
    }
  }
}

function getJsonSizeInMB(jsonStr) {
  const bytes = Buffer.byteLength(jsonStr, 'utf8') // Number of bytes
  const mb = bytes / (1024 * 1024) // Convert to MB
  return mb.toFixed(4) // Round to 4 decimal places
}

testJsonParseLimit(9000000) // Try up to 20,000 levels
const j = createDeepJson(9000000)
const sizeMB = getJsonSizeInMB(j)
console.log(sizeMB)

function isWithinDepthLimit(obj, maxDepth, currentDepth = 1) {
  console.log(currentDepth)
  if (currentDepth > maxDepth) return false

  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).every((value) => isWithinDepthLimit(value, maxDepth, currentDepth + 1))
  }
  return true // Reached a primitive value
}

const d = isWithinDepthLimit(JSON.parse(j), 1000)
console.log(d)
