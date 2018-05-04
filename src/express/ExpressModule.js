'use strict'

const express = require('express')
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
  }

  start(port) {
    this.app.listen(port)
  }
}

module.exports = ExpressModule