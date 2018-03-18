'use strict'

const bunyan = require('bunyan')

class LoggerFactory {
  static createLogger() {
    const log = bunyan.createLogger({
      name: 'WebEvent',
      streams: [
        {
          level: 'info',
          stream: process.stdout
        },
        {
          level: 'error',
          type: 'rotating-file',
          path: 'logs/error.log',
          count: 7
        }
      ]
    })
    return log
  }
}

module.exports = LoggerFactory