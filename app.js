'use strict'

/**
 * imports
 * @ignore
 */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const express = require('express')

/**
 * Module imports
 */
const LoggerFactory = require('./src/Logger.js')
const { TweetTracker } = require('./src/twitter')

class Application {
  constructor() {
    this.configFile = 'config.json'
    this.configDir = 'config'
  }

  static createApplication() {
    const instance = new Application
    return Promise.resolve(instance)
      .then(instance.logger)
      .catch((e) => () => {
        console.error('ERROR: An error was thrown before or during the logger initialization. Fallback to console.error(). Please investigate immediately.')
        process.exit(1)
      })
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

    if (!fs.existsSync(path.join(__dirname, dir))){
      fs.mkdirSync(path.join(__dirname, dir));
    }

    const logger = LoggerFactory.createLogger()
    Object.defineProperty(instance, 'logger', { value: logger })
    return instance
  }

  /**
   * preConfig
   * Config file sanity check
   * @ignore
   */
  preConfig(instance) {
    const configPath = path.join(__dirname, instance.configDir, instance.configFile)
    if (!fs.existsSync(configPath)) {
      instance.logger.fatal(`${instance.configFile} doesn't exist. Creating templete ${instance.configFile}.\nPlease populate it with correct values.\nSee https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens to generate your API keys`)

      // default keys with example values
      fs.writeFileSync(configPath, JSON.stringify({
        "api": {
          "consumer_key": "",
          "consumer_secret": "",
          "access_token": "",
          "access_token_secret": ""
        },
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

    return instance
  }

  /**
   * config
   * Load in values from the config file
   * @ignore
   */
  config(instance) {
    const opts = JSON.parse(fs.readFileSync(path.join(__dirname, instance.configDir, instance.configFile)))
    const { api } = opts


    if (!api) {
      instance.logger.fatal("Twitter API tokens should be set in config.json")
      throw new Error("Invalid config.json")
    }

    // Ensure all the API tokens are there
    const expectedArgs = ["consumer_key", "consumer_secret", "access_token", "access_token_secret"]
    const missingArgs = expectedArgs.filter(e => !_.keys(api).find(a => e == a))

    // Let the user know what keys are missing
    if (!_.isEmpty(missingArgs)) {
      instance.logger.fatal(`Missing API tokens: ${JSON.stringify(missingArgs)}`)
      throw new Error("Invalid config.json")
    }

    Object.defineProperty(instance, 'opts', { value: opts })
    return instance
  }


  twitter(instance) {
    const { opts } = instance
    const { api, locationKwords, localKwords: { hazards, stocks }, boundingBoxes } = opts
    instance.tweets = []
    const tracker = new TweetTracker(api, instance.logger,  (tweet) => instance.tweets.push(tweet))
    Object.defineProperty(instance, 'tracker', { value: tracker })
    tracker.init({ locationKwords, localKwords: { hazards, stocks }, boundingBoxes })

    tracker.start()
    return instance
  }

  express(instance) {
    const app = express()
    const locations = instance.opts.locationKwords
    app.get('/locations', (req, res) => {
      res.send({ locationKwords: locations })
    })

    app.get('/tweets', (req, res) => {
      res.send({ tweets: instance.tweets })
    })
    Object.defineProperty(instance, 'app', { value: app })
    return instance
  }

  exithandler(instance) {
    const handle = (options, err) => {
      const { exit } = options

      if(err) {
        if(instance.logger) instance.logger.fatal(err, 'Application crash')
        else console.error('FATAL: Application crash', err)
      }
      if(instance.logger) {
        instance.logger.info('Application shutdown')
      }
      if(exit) process.exit(0)
    }

    //process.on('exit', handle.bind(null, { exit: true }))

    return instance
  }

  listen(instance) {
    // TODO: load port number from config.json
    module.exports = instance
    instance.logger.info(`Application initialization completed. Listening on port ${3000}`)
    instance.app.listen(3000)
  }
}

Application.createApplication()