import 'mocha'
import { expect } from 'chai'

import { Db } from 'mongodb'

import db from './database'

describe('database', () => {
  describe('recipe', () => {
    describe('create', () => {
      it('', () => {
        db.Recipe(('db' as unknown) as Db).create('test')
      })
    })
  })
})
