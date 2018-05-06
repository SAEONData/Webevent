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
          partialMatch,
          event_type: "twitter"
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
      extended_text,
      place,
      timestamp_ms,
      id_str
    } = tweet

    const findFullText = function(tweet) {
        if(tweet.retweeted_status) {
          return findFullText(tweet.retweeted_status)
        } else if(tweet.extended_tweet) {
          return findFullText(tweet.extended_tweet)
        } else if(tweet.full_text) {
          return tweet.full_text
        } else {
          return tweet.text
        }

    }

    const text = findFullText(tweet)
    // check for location data
    if (place) {
      const {
        full_name
      } = place
      const readableDate = new Date(timestamp_ms)

      //return with location data
      return {
          name,
          timestamp: timestamp_ms,
          readableDate,
          text,
          place: {
            full_name
          },
          source: `https://twitter.com/i/web/status/${id_str}`
        }
    }

    // return without location data (bounding box)
    return {
        name,
        timestamp: timestamp_ms,
        text,
        source: `https://twitter.com/i/web/status/${id_str}`
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