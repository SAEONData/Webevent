'use strict'

const express = require('express')
const { request } = require('graphql-request')

const Module = require('../Module')

/**
* @class ExpressModule
* 
*/
class ExpressModule extends Module {
  constructor() {
    super('express')
    this.app = express()
  }

  init(instance) {
    const { app } = this
    // app.get('/tweets', (req, res) => {
    //   res.send(JSON.stringify({ tweets: this.tweets }, null, 2))
    // })

    // app.get('/streams', (req, res) => {
    //   const streams = this.tracker.twitter.streams
    //   const readableStreams = streams.map(stream => stream.reqOpts.url)
    //   res.send({ streams: readableStreams })
    // })

    app.get('/status', (req, res) => {
      res.send({
        status: instance.status
      })
    })

    app.get('/', (req, res) => {
      res.send(`<html><body>Webevent running. Go to <a href="/status">/status</a> for more information</body></html>`)
    })

    app.get('/events', async (req, res) => {
      const query = `
      query {
        events {
          key
          timestamp
          stocks
          hazards
          source
          event_type
        }
      }
      `
      const json = await request('http://localhost:3030/graphql', query)
      res.json(json)
    })
  }

  start(port) {
    this.app.listen(port)
  }
}

module.exports = ExpressModule