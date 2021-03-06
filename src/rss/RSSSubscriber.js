'use strict'

/**
 * imports
 */
const FeedParser = require('feedparser');
const request = require('request')
const fetch = require('node-fetch')

/**
 * module imports
 */
const Module = require('../Module')
const Keyword = require('../hooks/Keyword')

/**
 * @class RSSSubscriber
 * @param urls
 * @param log
 */
class RSSSubscriber extends Module {
  constructor({
    urls,
    log
  }) {
    super('rss')
    this.urls = urls
    this.log = log ? (txt) => log.debug(txt) : console.log
    const logger = this.log
    this.feedparser = new FeedParser({
      addmeta: false
    })

  }

  init({
    locationKwords,
    hooks: {
      stocks,
      hazards
    }
  }) {

    const hazardHandler = new Keyword(hazards.keywords)
    const stockHandler = new Keyword(stocks.keywords)
    const locationHandler = new Keyword(locationKwords)

    this.feedparser.on('readable', function () {
      // This is where the action is!
      var stream = this; // `this` is `feedparser`, which is a stream
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item;
      while (item = stream.read()) {
        if (!item) {
          return
        }
        //console.log(item)
        const {
          link, description
        } = item

        const hazMatchs = hazardHandler.match(description)
        const stockMatchs = stockHandler.match(description)
        const localityMatchs = locationHandler.match(description)


        console.log([hazMatchs, stockMatchs, localityMatchs])
      }
    })
  }


  start() {
    this.log(`RSS fetching feeds from ${this.urls.join(', ')}`)
    if (this.urls instanceof Array) {
      this.urls.map(url => {
        const req = request(url)
        req.on('response', (res, requ) => {
          const stream = res; // `this` is `req`, which is a stream

          if (res.statusCode !== 200) {
            this.emit('error', new Error('Bad status code'))
          } else {
            stream.pipe(this.feedparser)
          }
        })
      })
    }
  }

}

module.exports = RSSSubscriber