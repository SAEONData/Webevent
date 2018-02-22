'ust strict'
const TwitterCrawler = require('./TwitterCrawler')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')

class Application {
  constructor() {
    this.configFile = 'config.json'
  }

  static createApplication() {
    let instance = new Application
    return Promise.resolve(instance)
      .then(instance.preConfig)
      .then(instance.config)
      .then(instance.init)
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  }

  async preConfig(instance) {
    if (!fs.existsSync(instance.configFile)) {
      console.log(`${instance.configFile} doesn't exist. Creating templete ${instance.configFile}.
Please populate it with correct values.
See https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens to generate your API keys`)

      fs.writeFileSync(path.join(__dirname, instance.configFile), JSON.stringify({
        "api": {
          "consumer_key":         "",
          "consumer_secret":      "",
          "access_token":         "",
          "access_token_secret":  ""
        },
        "remoteKwords": ["Twitter", "Javascript"],
        "localKwords": ["Fun"],
        "boundingBoxes":  [
          { "bb": [18.279246,-34.219164,18.758525,-33.836752], "loc": "Cape Town"},
          { "bb": [27.7886,-26.4141,28.2679,-26.0001], "loc": "Joburg"},
          { "bb": [30.667,-30.0335,31.1463,-29.6332], "loc": "Durban"}
        ]
      }, null, 2))
      process.exit(1)
    }
    return instance
  }

  config(instance) {
    const opts = JSON.parse(fs.readFileSync(path.join(__dirname, instance.configFile)))
    const { api } = opts

    if (!api) {
      console.error("Twitter API tokens should be set in config.json")
      throw new Error("Invalid config.json")
    }

    const expectedArgs = ["consumer_key", "consumer_secret", "access_token", "access_token_secret"]
    const missingArgs = expectedArgs.filter(e => !_.keys(api).find(a => e == a)); // diff of expectedArgs and provided args

    if (!_.isEmpty(missingArgs)) {
      console.error(`Missing API tokens: ${JSON.stringify(missingArgs)}`)
      throw new Error("Invalid config.json")
    }

    Object.defineProperty(instance, 'opts', { value: opts })
    return instance

  }

  init(instance) {
    const { opts } = instance
    const { api, remoteKwords, localKwords, boundingBoxes } = opts

    const tc = new TwitterCrawler(api)
    Object.defineProperty(instance, 'crawler', { value: tc })

    tc.init({ remoteKwords, localKwords, boundingBoxes })
    return instance
  }

}

Application.createApplication()

//function exitHandler(options, err) {
//  const { history } = tracker
//  if(options.cleanup) {
//    console.log(`\nDumping ${history.length} entries history.json`)
//    fs.writeFileSync( path.join(__dirname, `JSONtoTable/history.json`), JSON.stringify( { history } ).trimLeft())
//  }
//  if (err) console.log(err.stack);
//  if (options.exit) process.exit();
//}
//
//process.on('exit', exitHandler.bind(null,{cleanup:true}));
//process.on('SIGINT', exitHandler.bind(null, {exit:true}));
//process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
//process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));