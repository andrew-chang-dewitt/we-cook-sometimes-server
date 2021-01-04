import { Db, MongoClient } from 'mongodb'

import model from '../lib/database'
import { tags, recipes, details } from './populate'

let client: MongoClient

export default () =>
  model
    // establish a database connection
    .connect()
    .catch((error) => {
      // notify where error occurred
      console.error('An error occurred while connecting to the database.')

      // then re-throw to be logged by final catch statement
      throw error
    })
    // assign client to global variable to make it accessible in finally
    // block even if there's an error
    .then(([db, clientInstance]) => {
      client = clientInstance

      return [db, clientInstance] as [Db, MongoClient]
    })
    .then(async ([db, client]) => {
      console.log('refreshing tags')
      await db.dropCollection('tags').catch(console.error)
      await tags(db)
      console.log('refreshing recipes')
      await db.dropCollection('recipes').catch(console.error)
      await recipes(db)
      console.log('refreshing details')
      await db.dropCollection('details').catch(console.error)
      await details(db)

      return [db, client]
    })
    .catch((error) => {
      console.error(error)
    })
    .finally(() => client.close())
