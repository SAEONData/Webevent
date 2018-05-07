'use strict'

const express = require('express')
const bodyParser = require('body-parser')

const {
  graphqlExpress,
  graphiqlExpress
} = require('apollo-server-express')

const {
  makeExecutableSchema
} = require('graphql-tools')

const level = require('level')
const Module = require('../Module')

class DatabaseModule extends Module {
  constructor({ path, port, log } = { path: "./mock_data", port: 3030 }) {
    super('graphql-database')
    this.db = level(path)
    this.port = port

    this.typeDefs = `
      schema {
        query: Query
        mutation: Mutation
      }

      type Query {
        events: [DatabaseEntry]
        event(key: String!): DatabaseEntry
      }

      type Mutation {
        event(text: String, event_type: String, timestamp: String!, hazards: [String], stocks: [String], source: String, locality: String): DatabaseEntry
      }

      type DatabaseEntry implements Event {
        key: Int!
        text: String
        hazards: [String]
        stocks: [String]
        timestamp: String!
        event_type: String!
        source: String
        locality: String
      }

      interface Event {
        hazards: [String]
        stocks: [String]
        timestamp: String!
        event_type: String!
        source: String
        locality: String
      }
    `

    this.resolvers = {
      Query: {
        events: async () => {
          const events = await Promise
            .all(this.keys.filter(k => k !== '_autoID')
              .map(key => this.db.get(key)
                .then(JSON.parse)
                .then(o => ({ ...o,
                  key
                }))))
          return events
        },
        event: async (root, args) => {
          return await this.db.get(args.key).then(JSON.parse).then(o => ({ ...o, key: args.key }))
        }
      },
      Mutation: {
        event: async (root, args) => {
          let key = this.autoID
          this.autoID++
          await this.db.put(key, JSON.stringify({
            timestamp: args.timestamp,
            text: args.text,
            hazards: args.hazards,
            stocks: args.stocks,
            event_type: args.event_type,
            source: args.source
          }))
          await this.db.put('_autoID', key)

          const stored = await this.db.get(key).then(JSON.parse)
          return { ...stored,
            key
          }
        }
      }
    }

    this.autoID = 0
    this.keys = []
  }


  init() {
    const {
      db,
      keys,
      autoID
    } = this

    if (process.env.DEBUG) {
      db.createReadStream()
        .on('data', (data) => {
          if (data.key !== '_autoID') {
            //console.log(data)
          }
        })
    }

    db.get('_autoID').catch(e =>
      db.put('_autoID', '0')
      .then(function () {
        return db.get('_autoID')
      })).then((value) => {
      this.autoID = value
    })

    db.createKeyStream()
      .on('data', (data) => {
        if (data !== '_autoID') {
          keys.push(data)
        }
      })

    db.on('put', (key, value) => {
      keys.push(key)
    })

    // Put together a schema
    this.schema = makeExecutableSchema({
      typeDefs: this.typeDefs,
      resolvers: this.resolvers,
    })

  }

  start() {
    this.app = express()

    // The GraphQL endpoint
    this.app.use('/graphql', bodyParser.json(), graphqlExpress({
      schema: this.schema
    }));

    // GraphiQL, a visual editor for queries
    if (process.env.DEBUG) {
      this.app.use('/graphiql', graphiqlExpress({
        endpointURL: '/graphql',
        schema: this.schema
      }));
    }

    // Start the server
    this.app.listen(this.port, () => {
      console.log('Go to http://localhost:3030/graphiql to run queries!')
    })
  }



}

module.exports = DatabaseModule