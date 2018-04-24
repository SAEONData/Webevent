'use strict'
const chai = require('chai')
const should = chai.should()

const Keyword = require('../src/hooks/Keyword')

describe('Keyword', () => {
    describe('match', () => {
      it('should match a value from an array of words', () => {
        const kword = new Keyword(['one', 'two', "three"])
        kword.match('two').should.deep.equal({ value: ['two'], match: true })
      })

      it('should fuzzy match a word in a sentence from an array of words', () => {
        const kword = new Keyword(['one', 'two', 'three'])
        kword.match('There were two birds').should.deep.equal({ value: ['There were two birds'], match: true })
      })
    })
})