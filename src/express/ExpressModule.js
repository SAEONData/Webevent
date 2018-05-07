'use strict'

const express = require('express')
const { request } = require('graphql-request')
const fs = require('fs')
const path = require('path')

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
    this.file = fs.readFileSync(path.join(__dirname,'./www/index.html'))

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
          locality
        }
      }
      `

      const json = await request('http://localhost:3030/graphql', query)
      res.json(json)
    })

    app.get('/chart', async (req, res) => {
      this.file = fs.readFileSync(path.join(__dirname,'./www/index.html'))
      res.status(200).set('content-type', 'text/html').send(this.file)
    })
  }

  start(port) {
    this.app.listen(port)
  }
}

module.exports = ExpressModule