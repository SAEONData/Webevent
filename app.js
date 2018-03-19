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
    return Promise.resolve(instance)
      .then(instance.logger)
      .catch((e) => () => {
        console.error('ERROR: An error was thrown before or during the logger initialization. Fallback to console.error(). Please investigate immediately.')
        process.exit(1)
      })
      .then(instance.arguments)
      .then(instance.preConfig)
      .then(instance.config)
      .then(instance.twitter)
      .then(instance.express)
      .then(instance.exithandler)
      .catch((e) => {
        instance.logger.fatal(e, 'Error during start up.')
        process.exit(1)
      })
      .then(instance.listen)
      .catch(e => instance.logger.error(e, 'Uncaught expection during application runtime'))
  }

  /**
   * logger
   * Set up the logger
   * @ignore
   */
  logger(instance) {
    const dir = 'logs'
    const errorFile = 'error.log'

    if (!fs.existsSync(path.join(__dirname, dir))) {
      fs.mkdirSync(path.join(__dirname, dir));
    }

    const logger = LoggerFactory.createLogger()
    Object.defineProperty(instance, 'logger', { value: logger })
    return instance
  }

  /**
   * arguments
   * @description Parse arguments supplied from the CLI
   * --config <path> Path for config file
   * --port <port> Port to listen on
   * @param {*} instance
   */
  arguments(instance) {
    const args = parseArgs(process.argv.slice(2))
    if (args.config) {
      instance.configPath = args.config
      instance.logger.info(`Using config file: ${instance.configPath}`)
    }

    if (args.port) {
      instance.port = args.port
    }
    return instance
  }

  /**
   * preConfig
   * Config file sanity check
   * @ignore
   */
  preConfig(instance) {
    if (!fs.existsSync(instance.configPath)) {
      instance.logger.fatal(`${instance.configPath} doesn't exist. Creating templete ${instance.configPath}.\nPlease populate it with correct values.\nSee https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens to generate your API keys`)

      // default keys with example values
      fs.writeFileSync(instance.configPath, JSON.stringify({
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

    if (!fs.existsSync(instance.secretPath)) {
      fs.writeFileSync(instance.secretPath, JSON.stringify({
        "consumer_key": "",
        "consumer_secret": "",
        "access_token": "",
        "access_token_secret": ""
      }, null, 2))

      process.exit(1)
    }

    return instance
  }

  /**
   * config
   * @description Load in values from the config file
   * @ignore
   */
  config(instance) {
    const opts = JSON.parse(fs.readFileSync(instance.configPath))
    const secret = JSON.parse(fs.readFileSync(instance.secretPath))


    if (!secret) {
      instance.logger.fatal("Twitter API tokens should be set in config.json")
      throw new Error("Invalid config.json")
    }

    // Ensure all the API tokens are there
    const expectedArgs = ["consumer_key", "consumer_secret", "access_token", "access_token_secret"]
    const missingArgs = expectedArgs.filter(e => !_.keys(secret).find(a => e == a))

    // Let the user know what keys are missing
    if (!_.isEmpty(missingArgs)) {
      instance.logger.fatal(`Missing API tokens: ${JSON.stringify(missingArgs)}`)
      throw new Error("Invalid config.json")
    }

    Object.defineProperty(instance, 'opts', { value: opts })
    Object.defineProperty(instance, 'apiSecret', { value: secret })
    return instance
  }

  /**
   * @description Set up the realtime tweet tracker
   * @param {*} instance instance of the application
   */
  twitter(instance) {
    const { opts, apiSecret } = instance
    const { locationKwords, localKwords: { hazards, stocks }, boundingBoxes } = opts
    instance.tweets = []

    const tracker = new TweetTracker(apiSecret, instance.logger, (tweet) => instance.tweets.push(tweet))

    Object.defineProperty(instance, 'tracker', { value: tracker })
    tracker.init({ locationKwords, localKwords: { hazards, stocks }, boundingBoxes })

    tracker.start()
    return instance
  }

  /**
   * express
   * @description Configure the express app
   * @param {*} instance
   */
  express(instance) {
    const app = express()
    const locations = instance.opts.locationKwords
    app.get('/locations', (req, res) => {
      res.send({ locationKwords: locations })
    })

    app.get('/tweets', (req, res) => {
      res.send({ tweets: instance.tweets })
    })

    app.get('/streams', (req, res) => {
      const streams = instance.tracker.twitter.streams
      const readableStreams = streams.map(stream => stream.reqOpts.url)
      res.send({ streams: readableStreams })
    })

    Object.defineProperty(instance, 'app', { value: app })
    return instance
  }

  exithandler(instance) {
    const handle = (options, err) => {
      const { exit } = options

      if (err) {
        if (instance.logger) instance.logger.fatal(err, 'Application crash')
        else console.error('FATAL: Application crash', err)
      }
      if (instance.logger) {
        instance.logger.info('Application shutdown')
      }
      if (exit) process.exit(0)
    }

    //process.on('exit', handle.bind(null, { exit: true }))

    return instance
  }

  listen(instance) {
    // TODO: load port number from config.json
    module.exports = instance
    instance.logger.info(`Application initialization completed. Listening on port ${instance.port}`)
    instance.app.listen(instance.port)
  }
}

Application.createApplication()