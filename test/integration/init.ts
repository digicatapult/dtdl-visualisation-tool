import 'reflect-metadata'

before(async function () {
  this.timeout(420000)
  // await bringUpDatabaseContainer()
  // await bringUpVisualisationContainer()
})

after(async function () {
  this.timeout(420000)
  //stopAllContainers()
})
