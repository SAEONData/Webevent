'use strict'

/**
 * imports
 */
const FeedParser = require('feedparser');
const request = require('request')

/**
 * module imports
 */
const Module =  require('../Module')

/**
 * @class RSSSubscriber
 * @param urls
 * @param log
 */
class RSSSubscriber extends Module {
  constructor({ urls, log }) {
    super('rss')
    this.urls = urls
    this.log = log ? (txt) => log.debug(txt) : console.log
    const logger = this.log
    this.feedparser = new FeedParser({addmeta: false})

    this.feedparser.on('readable', function () {
      // This is where the action is!
      var stream = this; // `this` is `feedparser`, which is a stream
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item;
      while (item = stream.read()) {
        //logger(JSON.stringify(item, null, 2));
      }
    })

  }

  start() {
    this.log(`RSS fetching feeds from ${this.urls.join(', ')}`)
    if(this.urls instanceof Array) {
      this.urls.map(url => {
        const req = request(url)
        req.on('response', (res, requ) => {
          const stream = res; // `this` is `req`, which is a stream

          if (res.statusCode !== 200) {
            this.emit('error', new Error('Bad status code'))
          }
          else {
            stream.pipe(this.feedparser)
          }
        })
      })
    }
  }
  
}

module.exports = RSSSubscriber