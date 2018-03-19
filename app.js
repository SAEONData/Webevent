'use strict'

/**
 * imports
 * @ignore
 */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const express = require('express')
const parseArgs = require('minimist')

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
        instance.logger.fatal(e, 'Error during start up.')
        process.exit(1)
      })
      .then($(instance.listen))
      .catch(e => instance.logger.error(e, 'Uncaught expection during application runtime'))
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
    Object.defineProperty(this, 'logger', { value: logger })
  }

  /**
   * arguments
   * @description Parse arguments supplied from the CLI
   * --config <path> Path for config file
   * --port <port> Port to listen on
   */
  arguments() {
    const args = parseArgs(process.argv.slice(2))
    if (args.config) {
      this.configPath = args.config
      this.logger.info(`Using config file: ${this.configPath}`)
    }

    if (args.port) {
      this.port = args.port
    }
  }

  /**
   * preConfig
   * Config file sanity check
   * @ignore
   */
  preConfig() {
    if (!fs.existsSync(this.configPath)) {
      this.logger.fatal(`${this.configPath} doesn't exist. Creating templete ${this.configPath}.\nPlease populate it with correct values.\nSee https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens to generate your API keys`)

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

      process.exit(1)
    }

    if (!fs.existsSync(this.secretPath)) {
      fs.writeFileSync(this.secretPath, JSON.stringify({
        "consumer_key": "",
        "consumer_secret": "",
        "access_token": "",
        "access_token_secret": ""
      }, null, 2))

      process.exit(1)
    }

  }

  /**
   * config
   * @description Load in values from the config file
   * @ignore
   */
  config() {
    const opts = JSON.parse(fs.readFileSync(this.configPath))
    const secret = JSON.parse(fs.readFileSync(this.secretPath))


    if (!secret) {
      this.logger.fatal("Twitter API tokens should be set in config.json")
      throw new Error("Invalid config.json")
    }

    // Ensure all the API tokens are there
    const expectedArgs = ["consumer_key", "consumer_secret", "access_token", "access_token_secret"]
    const missingArgs = expectedArgs.filter(e => !_.keys(secret).find(a => e == a))

    // Let the user know what keys are missing
    if (!_.isEmpty(missingArgs)) {
      this.logger.fatal(`Missing API tokens: ${JSON.stringify(missingArgs)}`)
      throw new Error("Invalid config.json")
    }

    Object.defineProperty(this, 'opts', { value: opts })
    Object.defineProperty(this, 'apiSecret', { value: secret })
  }

  /**
   * @description Set up the realtime tweet tracker
   */
  twitter() {
    const { opts, apiSecret } = this
    const { locationKwords, localKwords: { hazards, stocks }, boundingBoxes } = opts
    this.tweets = []

    const tracker = new TweetTracker(apiSecret, this.logger, (tweet) => this.tweets.push(tweet))

    Object.defineProperty(this, 'tracker', { value: tracker })
    tracker.init({ locationKwords, localKwords: { hazards, stocks }, boundingBoxes })

    tracker.start()
  }

  /**
   * express
   * @description Configure the express app
   * @param {*} instance
   */
  express() {
    const app = express()
    const locations = this.opts.locationKwords
    app.get('/locations', (req, res) => {
      res.send({ locationKwords: locations })
    })

    app.get('/tweets', (req, res) => {
      res.send({ tweets: this.tweets })
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
        if (this.logger) this.logger.fatal(err, 'Application crash')
        else console.error('FATAL: Application crash', err)
      }
      if (this.logger) {
        this.logger.info('Application shutdown')
      }
      if (exit) process.exit(0)
    }

    //process.on('exit', handle.bind(null, { exit: true }))

  }

  listen() {
    // TODO: load port number from config.json
    module.exports = this
    this.logger.info(`Application initialization completed. Listening on port ${this.port}`)
    this.app.listen(this.port)
  }
}

Application.createApplication()