'use strict'

const EventTracker = require('./TwitterEventTracker')
const fs = require('fs')
const path = require('path')
const Fuse = require('fuse.js')
const _ = require('lodash')

class TwitterCrawler {
  constructor(opts) {
    this.opts = opts || {
      consumer_key:         'XeGMP15EanuJtsaTs9I4WTxEm',
      consumer_secret:      'fQBkdFXTLfM3SBmN5SzmD3QGpPlWSXMun9x584uglLeFdvqThM',
      access_token:         '547920673-hhnoC4zw85eUDhPKOFGRWt0qd0lldpizbW6WRbzx',
      access_token_secret:  'Wb2kDRQgFUwFWTRJ1fWmf4mR1tuRXEEVtGj8YqFftRlop',
    }
    Object.defineProperty(this, 'counter', { enumerable: false })

    const tracker = new EventTracker( opts )
    Object.defineProperty(this, 'tracker', { value: tracker })

  }

  init(options) {
    const { remoteKwords, boundingBoxes, localKwords } = options

    if(remoteKwords.length > 400) {
      throw new Error(`remoteKwords too large (max: 400)`)
    }

    this.remoteKwords = remoteKwords
    this.boundingBoxes = boundingBoxes
    this.localKwords = localKwords

    // Create an array of unique event listener keys
    const events = _.union(boundingBoxes.map(o => o.loc), remoteKwords)
    // Add listeners
    for(let event of events) {
      this.tracker.addEventListener(event, this.basicTweetHandler)
    }
    console.log(`Added event listeners: ${JSON.stringify(events)}`)
  }

  start() {
    //tracker.trackLocation([18.279246,-34.219164,18.758525,-33.836752], "Cape Town") // Cape Town
    //tracker.trackLocation([27.7886,-26.4141,28.2679,-26.0001], "Joburg") // Joburg
    //tracker.trackLocation([30.667,-30.0335,31.1463,-29.6332], "Durban") // Durban
    for(let v of locationKwords) {
      tracker.addEventListener(v, basicTweetHandler)
      tracker.trackKeyword(v)
    }
    //process.stdout.write(`Set up complete.\n`)
    //for(let i in locationsBoundingBoxs) {
    //  const { bb, loc } = locationsBoundingBoxs[i]
    //  tracker.trackLocation(bb, loc)
    //}
  }

  basicTweetHandler (action) {
    const { type, payload: { user: { name } , text, extended_tweet, place, timestamp } } = action
    // Check for phase 2 kwords here
    updateConsole(type, ++this.counter)
    if(place) {
      const { full_name } = place
      const readableDate = new Date(timestamp)
      return  { type, payload: { tweet: { name, timestamp, text, place: { full_name } } } } // we have location data
    } else {
      return { type, payload: { tweet: { name, timestamp, text } } } // no location data
    }
    return action
  }

  updateConsole(update, n) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(`Captured: ${n}, last from ${update}`)
  }

}


function updateConsole(update, n) {
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(`Captured: ${n}, last from ${update}`)
}

module.exports = TwitterCrawler
/*function main() {

  let counter = 0

  const basicTweetHandler = (action) => {
    const { type, payload: { user: { name } , text, extended_tweet, place, timestamp } } = action
    // Check for phase 2 kwords here
    updateConsole(type, ++counter)
    if(place) {
      const { full_name } = place
      const readableDate = new Date(timestamp)
      return  { type, payload: { tweet: { name, timestamp, text, place: { full_name } } } } // we have location data
    } else {
      return { type, payload: { tweet: { name, timestamp, text } } } // no location data
    }
    return action
  }

  tracker.addEventListener("Disaster", basicTweetHandler)



  const locationKwords = [
    "Cape Town", "Joburg", "Durban", "South Africa",
    //"C#", "NodeJS", "Python", "Code", "Java", "Android",
  ]

  const locationsBoundingBoxs = [
    { bb: [18.279246,-34.219164,18.758525,-33.836752], loc: "Cape Town"},
    { bb: [27.7886,-26.4141,28.2679,-26.0001], loc: "Joburg"},
    { bb: [30.667,-30.0335,31.1463,-29.6332], loc: "Durban"},
  ]

  const postProcessingKwords = [
    "fire", "flood", "heatwave", "snow"
  ]

  //tracker.trackLocation([18.279246,-34.219164,18.758525,-33.836752], "Cape Town") // Cape Town
  //tracker.trackLocation([27.7886,-26.4141,28.2679,-26.0001], "Joburg") // Joburg
  //tracker.trackLocation([30.667,-30.0335,31.1463,-29.6332], "Durban") // Durban

  for(let i in locationKwords) {
    tracker.addEventListener(locationKwords[i], basicTweetHandler)
    tracker.trackKeyword(locationKwords[i])
    setTimeout(() => {}, 200)
  }
  //process.stdout.write(`Set up complete.\n`)
  //for(let i in locationsBoundingBoxs) {
  //  const { bb, loc } = locationsBoundingBoxs[i]
  //  tracker.trackLocation(bb, loc)
  //}

  function exitHandler(options, err) {
    const { history } = tracker
    if(options.cleanup) {
      console.log(`\nDumping ${history.length} entries history.json`)
      fs.writeFileSync( path.join(__dirname, `JSONtoTable/history.json`), JSON.stringify( { history } ).trimLeft())
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
  }

  process.on('exit', exitHandler.bind(null,{cleanup:true}));
  process.on('SIGINT', exitHandler.bind(null, {exit:true}));
  process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
  process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

}*/
