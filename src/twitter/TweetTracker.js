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
const Keyword = require('../hooks/Keyword')
const Module = require('../Module')

class TweetTracker extends Module {
  constructor(opts, logger, endpoint) {
    super('twitter')
    this.opts = opts
    Object.defineProperty(this, 'log', {
      value: logger
    })
    Object.defineProperty(this, 'counter', {
      enumerable: false,
      writable: true
    })

    //TODO: send data to a proper endpoint
    const twitter = new Twitter(opts, {
      endpoint
    })
    Object.defineProperty(this, 'twitter', {
      value: twitter,
      enumerable: true
    })
    Object.defineProperty(this, 'KEYWORD_EVENT', {
      value: 'TWITTER_KWORD_EVENT'
    })

  }


  init(options) {
    const {
      locationKwords,
      boundingBoxes,
      hooks: {
        hazards,
        stocks
      }
    } = options

    if (locationKwords.length > 400) {
      throw new Error(`locationKwords too large (max: 400)`)
    }

    this.locationKwords = locationKwords
    this.boundingBoxes = boundingBoxes

    // Create an array of unique event listener keys
    const events = _.union(boundingBoxes.map(o => o.loc), locationKwords)

    // Set MaxListeners to ignore all these listeners
    this.twitter.setMaxListeners(0)

    // Set up instances of matching functions for hazards and stocks
    const hazardHandler = new Keyword(hazards.keywords)
    const stockHandler = new Keyword(stocks.keywords)

    // Add tweet parser
    this.twitter.event(this.KEYWORD_EVENT, [
      (tweet) => this.tweetParser(tweet),

      // hazards
      (tweet) => {
        const keywords = hazardHandler.match(tweet.text)
        return { ...tweet,
          hazards: keywords
        }
      },

      // stocks
      (tweet) => {
        const keywords = stockHandler.match(tweet.text)
        return { ...tweet,
          stocks: keywords
        }
      },

      (tweet) => {
        const fullMatch = tweet.hazards && tweet.stocks
        const partialMatch = tweet.hazards || tweet.stocks
        return { ...tweet,
          fullMatch,
          partialMatch
        }
      }
    ])


    this.log.debug(`Added event listeners: ${JSON.stringify(events)}`)
  }


  /**
   * tweetParser
   * @description Callback to parse the tweet
   * @param {tweet} tweet
   */
  tweetParser(tweet) {
    const {
      user: {
        name
      },
      text,
      extended_text,
      place,
      timestamp_ms
    } = tweet
    
    if (extended_text) text = extended_text.full_text
    // check for location data
    if (place) {
      const {
        full_name
      } = place
      const readableDate = new Date(timestamp_ms)

      //return with location data
      return {
        tweet: {
          name,
          timestamp_ms,
          readableDate,
          text,
          place: {
            full_name
          }
        }
      }
    }

    // return without location data (bounding box)
    return {
      tweet: {
        name,
        timestamp_ms,
        text
      }
    }

  }

  /**
   * start
   * @description Start the tweet tracker
   */
  start() {
    for (let v of this.locationKwords) {
      this.twitter.keyword(v, this.KEYWORD_EVENT)
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