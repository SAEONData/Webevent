const fs = require('fs')
const path = require('path')


const dirCont = fs.readdirSync( __dirname );
const files = dirCont.filter(( elm ) => /.*\.(gql)/gi.test(elm));

const userSchemas = files.map(v => fs.readFileSync(path.join(__dirname, v)).toString())


const baseSchema = `
type RootQuery {
  name: String
}
schema {
  query: RootQuery
}
`

module.exports = [
  baseSchema,
  ...userSchemas
]