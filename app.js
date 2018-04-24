'use strict'

/**
 * imports
 * @ignore
 */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const express = require('express')
require('dotenv').config()


/**
 * Module imports
 */
const LoggerFactory = require('./src/Logger.js')
const { TweetTracker } = require('./src/twitter')

class Application {
  constructor() {
    this.configDir = 'config'
    this.configPath = path.join(__dirname, this.configDir, 'config.json')
    this.secretPath = path.join(__dirname, this.configDir, 'secret.json')

    this.port = 3000
  }

  static createApplication() {
    const instance = new Application

    // bind functions to application context
    const $ = (func) => func.bind(instance)

    return Promise.resolve(instance)
      .then($(instance.logger))
      .catch((e) => () => {
        console.error('ERROR: An error was thrown before or during the logger initialization. Fallback to console.error(). Please investigate immediately.')
        process.exit(1)
      })
      .then($(instance.arguments))
      .then($(instance.preConfig))
      .then($(instance.config))
      .then($(instance.twitter))
      .then($(instance.express))
      .then($(instance.exithandler))
      .catch((e) => {
        instance.log.fatal(e, 'Error during start up.')
        process.exit(1)
      })
      .then($(instance.listen))
      .catch(e => instance.log.error(e, 'Uncaught expection during application runtime'))
  }

  /**
   * logger
   * Set up the logger
   * @ignore
   */
  logger() {
    const dir = 'logs'
    const errorFile = 'error.log'

    if (!fs.existsSync(path.join(__dirname, dir))) {
      fs.mkdirSync(path.join(__dirname, dir));
    }

    const logger = LoggerFactory.createLogger()
    Object.defineProperty(this, 'log', { value: logger })
  }

  /**
   * arguments
   * @description Parse envioment variables
   * --config <path> Path for config file
   * --port <port> Port to listen on
   */
  arguments() {
    const args = process.env
    if(args.config) {
        this.configPath = process.env.CONFIG
        this.log.warn(`Using config file: ${this.configPath}`)
    }
    if(args.port) {
      this.port = process.env.PORT
    }
    if(args.debug) {
      this.log.info('Running in debug mode')
      this.log.level("debug")
    }
  }

  /**
   * preConfig
   * Config file sanity check
   * @ignore
   */
  preConfig() {
    if (!fs.existsSync(this.configPath)) {
      this.log.error(`${this.configPath} doesn't exist. Creating template ${this.configPath}.\n`)

      // default keys with example values
      fs.writeFileSync(this.configPath, JSON.stringify({
        "locationKwords": ["Cape Town", "Durban"],
        "localKwords": { "hazards": ["fire"], "stocks": ["poverty"] },
        "boundingBoxes": [
          { "bb": [18.279246, -34.219164, 18.758525, -33.836752], "loc": "Cape Town" },
          { "bb": [27.7886, -26.4141, 28.2679, -26.0001], "loc": "Joburg" },
          { "bb": [30.667, -30.0335, 31.1463, -29.6332], "loc": "Durban" }
        ]
      }, null, 2))

    }

    if (!fs.existsSync(this.secretPath)) {
      this.log.fatal(`${this.secretPath} doesn't exist. Creating template ${this.secretPath}.\nPlease populate it with correct values.\nSee https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens to generate your API keys`)
      fs.writeFileSync(this.secretPath, JSON.stringify({
        "consumer_key": "",
        "consumer_secret": "",
        "access_token": "",
        "access_token_secret": ""
      }, null, 2))

      process.exit()
    }

  }

  /**
   * config
   * @description Load in values from the config file
   * @ignore
   */
  config() {
    const config = JSON.parse(fs.readFileSync(this.configPath))
    const secret = JSON.parse(fs.readFileSync(this.secretPath))


    if (!secret) {
      this.log.fatal("Twitter API tokens should be set in config.json")
      throw new Error("Invalid config.json")
    }

    // Ensure all the API tokens are there
    const expectedArgs = ["consumer_key", "consumer_secret", "access_token", "access_token_secret"]
    const missingArgs = expectedArgs.filter(e => !_.keys(secret).find(a => e == a))

    // Let the user know what keys are missing
    if (!_.isEmpty(missingArgs)) {
      this.log.fatal(`Missing API tokens: ${JSON.stringify(missingArgs)}`)
      throw new Error("Invalid config.json")
    }
    
    Object.defineProperty(this, 'config', { value: config })
    Object.defineProperty(this, 'apiSecret', { value: secret })
  }

  /**
   * @description Set up the realtime tweet tracker
   */
  twitter() {
    const { config, apiSecret } = this
    const { locationKwords, hooks, boundingBoxes } = config

    this.tweets = []

    // endpoint here
    const tracker = new TweetTracker(apiSecret, this.log, (tweet) => this.tweets.push(tweet))

    Object.defineProperty(this, 'tracker', { value: tracker })
    tracker.init({ locationKwords, hooks, boundingBoxes })

    tracker.start()
  }

  /**
   * express
   * @description Configure the express app
   * @param {*} instance
   */
  express() {
    const app = express()
    const locations = this.config.locationKwords
    app.get('/locations', (req, res) => {
      res.send({ locationKwords: locations })
    })

    app.get('/tweets', (req, res) => {
      res.send(JSON.stringify({ tweets: this.tweets }, null, 2))
    })

    app.get('/streams', (req, res) => {
      const streams = this.tracker.twitter.streams
      const readableStreams = streams.map(stream => stream.reqOpts.url)
      res.send({ streams: readableStreams })
    })

    Object.defineProperty(this, 'app', { value: app })
  }

  exithandler() {
    const handle = (options, err) => {
      const { exit } = options

      if (err) {
        if (this.log) this.log.fatal(err, 'Application crash')
        else console.error('FATAL: Application crash\n', err)
      }
      if (this.log) {
        this.log.info('Application shutdown')
      }
      if (exit) process.exit(0)
    }

    //process.on('exit', handle.bind(null, { exit: true }))

  }

  listen() {
    // TODO: load port number from config.json
    module.exports = this
    this.log.info(`Application initialization completed. Listening on port ${this.port}`)
    const server = this.app.listen(this.port)

    Object.defineProperty(this, 'server', { value: server })
  }
}

Application.createApplication()