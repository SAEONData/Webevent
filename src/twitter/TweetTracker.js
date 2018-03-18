'use strict'

/**
 * imports
 * @ignore
 */
const _ = require('lodash')

/**
 * module imports
 * @ignore
 */
const Twitter = require('./Twitter')

class TweetTracker {
  constructor(opts, logger, endpoint) {
    this.opts = opts
    Object.defineProperty(this, 'log', { value: logger })
    Object.defineProperty(this, 'counter', { enumerable: false, writable: true })

    //TODO: send data to a proper endpoint
    const twitter = new Twitter(opts, { endpoint })
    Object.defineProperty(this, 'twitter', { value: twitter })

  }


  init(options) {
    const { locationKwords, boundingBoxes, localKwords: { hazards, stocks} } = options

    if(locationKwords.length > 400) {
      throw new Error(`locationKwords too large (max: 400)`)
    }

    this.locationKwords = locationKwords
    this.boundingBoxes = boundingBoxes
    this.hazards = hazards
    this.stocks = stocks

    // Create an array of unique event listener keys
    const events = _.union(boundingBoxes.map(o => o.loc), locationKwords)

    // Add tweet parser
    for(let event of events) {
      this.twitter.event(event, [(tweet) => this.tweetParser(tweet)])
    }

    // TODO: Add hazard hooks
    // TODO: Add stock hooks

    this.log.info(`Added event listeners: ${JSON.stringify(events)}`)
  }


  /**
   * tweetParser
   * @description Callback to parse the tweet
   * @param {tweet} tweet
   */
  tweetParser(tweet) {
    const {  user: { name } , text, extended_text, place, timestamp } = tweet
    // check for location data
    if(extended_text) text = extended_text.text
    if(place) {
      const { full_name } = place
      const readableDate = new Date(timestamp)

      //return with location data
      return { tweet: { name, timestamp, text, place: { full_name } } }
    } else {

      // return without location data (bounding box)
      return { tweet: { name, timestamp, text } }
    }
    return tweet
  }

  /**
   * start
   * @description Start the tweet tracker
   */
  start() {
    for(let v of this.locationKwords) {
      this.twitter.keyword(v)
      this.log.trace(`Tracking keyword ${v}`)
    }

    //process.stdout.write(`Set up complete.\n`)
    //for(let i in locationsBoundingBoxs) {
    //  const { bb, loc } = locationsBoundingBoxs[i]
    //  tracker.trackLocation(bb, loc)
    //}
  }
}

module.exports = TweetTracker