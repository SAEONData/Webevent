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
const { RSSSubscriber } = require('./src/rss')
const { ExpressModule } = require('./src/express')

const Module = require('./src/Module')
const Endpoint = require('./src/Endpoint')

class Application {
  constructor() {
    this.configDir = 'config'
    this.configPath = path.join(__dirname, this.configDir, 'config.json')
    this.secretPath = path.join(__dirname, this.configDir, 'secret.json')
    this.modules = []
    this.status = {
      modules: this.modules
    }

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
      .then($(instance.rss))
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
        this.configPath = args.CONFIG
        this.log.warn(`Using config file: ${this.configPath}`)
    }

    if(args.port) {
      this.port = args.PORT
    }

    if(args.debug) {
      this.log.info('Running in debug mode')
      this.log.level("debug")
    }


    this.LOAD_TWITTER = args.TWITTER === undefined ? true : JSON.parse(args.TWITTER)
    this.LOAD_RSS = args.RSS === undefined ? true : JSON.parse(args.RSS)
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

    // twitter module is disabled
    if(!this.LOAD_TWITTER) {
      return
    }

    const { config, apiSecret } = this
    const { locationKwords, hooks, boundingBoxes } = config

    this.tweets = []

    // endpoint here
    const endpoint = new Endpoint('http://localhost:3030/graphql')

    const tracker = new TweetTracker(apiSecret, this.log, (tweet) => endpoint.post(tweet))

    this.modules.push(tracker)
    tracker.init({ locationKwords, hooks, boundingBoxes })

    tracker.start()
  }

  /**
   * rss
   */
  rss() {
    // twitter module is disabled
    if(!this.LOAD_RSS) {
      return
    }

    const subscriber = new RSSSubscriber({ urls: ["http://feeds.news24.com/articles/news24/Africa/rss"], log: this.log })
    this.modules.push(subscriber)
    subscriber.start()
  }

  /**
   * express
   * @description Configure the express app
   * @param {*} instance
   */
  express() {

    // register the module
    const express = new ExpressModule()
    this.modules.push(express)

    express.init(this)

    Object.defineProperty(this, 'express', { value: express })
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

    if(this.modules.length > 0) {
      this.log.info(`Loaded modules: ${this.modules}`)
    } else {
      this.log.warn(`No modules loaded, exiting`)
      return
    }

    this.log.info(`Application initialization completed. Listening on port ${this.port}`)
    const server = this.express.start(this.port)

    Object.defineProperty(this, 'server', { value: server })
  }
}

Application.createApplication()