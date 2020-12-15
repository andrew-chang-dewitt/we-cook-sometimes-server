import { Db, MongoClient, Collection } from 'mongodb'

import model, { CollectionName } from '../lib/database'
import { tags, recipes, details } from './populate'

/*
 * CONSTANTS
 */

export const dateSeparator = '_'
const today = new Date()
const day = 24 * 60 * 60 * 1000 // 1 day in milliseconds

/*
 * UTILITIES
 */

// creates a collection name prefix out of a given date
const prefix = (date: Date): string =>
  `${date.toISOString().split('T')[0]}${dateSeparator}`

// takes a given prefixed collection name & converts it's prefix to a String
const extractDate = (name: string): Date =>
  new Date(name.split(dateSeparator)[0])

/*
 * QUERY FUNCTIONS
 */

interface ExecuteQuery {
  ([db, client]: [Db, MongoClient]): Promise<[Db, MongoClient]>
}

const archiveCurrent: ExecuteQuery = async ([db, client]) => {
  // get current date as ISO string to use for renaming current collections
  const pre = prefix(today)

  const rename = (db: Db, name: CollectionName): Promise<Collection<any>> =>
    db.collection(name).rename(`${pre}${name}`)

  // copy current state to history
  // this is most easily done by renaming the existing collections
  console.log('archiving recipes')
  await rename(db, CollectionName.Recipes)
    // if there's an error in renaming
    .catch(async (error) => {
      // change name back (assuming it was changed)
      await db
        .collection(`${pre}${CollectionName.Recipes}`)
        .rename(CollectionName.Recipes)
        .catch(console.error)

      // then re-throw error to be handled by catch statement
      // written by caller
      throw error
    })

  console.log('archiving details')
  await rename(db, CollectionName.Details)
    // if there's an error in renaming
    .catch(async (error) => {
      // change names back (assuming it was changed)
      await db
        .collection(`${pre}${CollectionName.Recipes}`)
        .rename(CollectionName.Recipes)
        .catch(console.error)
      await db
        .collection(`${pre}${CollectionName.Details}`)
        .rename(CollectionName.Details)
        .catch(console.error)

      // then re-throw error to be handled by catch statement
      // written by caller
      throw error
    })

  console.log('archiving tags')
  await rename(db, CollectionName.Tags)
    // if there's an error in renaming
    .catch(async (error) => {
      // change names back (assuming it was changed)
      await db
        .collection(`${pre}${CollectionName.Recipes}`)
        .rename(CollectionName.Recipes)
        .catch(console.error)
      await db
        .collection(`${pre}${CollectionName.Details}`)
        .rename(CollectionName.Details)
        .catch(console.error)
      await db
        .collection(`${pre}${CollectionName.Tags}`)
        .rename(CollectionName.Tags)
        .catch(console.error)

      // then re-throw error to be handled by catch statement
      // written by caller
      throw error
    })

  return [db, client]
}

const getNew: ExecuteQuery = async ([db, client]) => {
  // rebuild using original populate functions
  // awaiting Promises to execute one at a time to avoid
  // hitting Trello API's rate limit
  try {
    console.log('refreshing tags')
    await tags(db)
    console.log('refreshing recipes')
    await recipes(db)
    console.log('refreshing details')
    await details(db)
  } catch (error) {
    const pre = prefix(today)

    // first drop any new versions of the prod collections that were created
    await db.dropCollection('tags').catch(console.error)
    await db.dropCollection('recipes').catch(console.error)
    await db.dropCollection('details').catch(console.error)

    // and then attempt to restore previous versions from archives
    await db
      .collection(`${pre}${CollectionName.Recipes}`)
      .rename(CollectionName.Recipes)
      .catch(console.error)
    await db
      .collection(`${pre}${CollectionName.Details}`)
      .rename(CollectionName.Details)
      .catch(console.error)
    await db
      .collection(`${pre}${CollectionName.Tags}`)
      .rename(CollectionName.Tags)
      .catch(console.error)

    // re-throw to be further handled by downstream handler
    throw error
  }

  return [db, client]
}

const deleteOldArchives: ExecuteQuery = async ([db, client]) => {
  // clean up archive collections older than 2 days from now
  const limit = new Date(today.getTime() - 2 * day)
  const oldCollections = (await db.listCollections().toArray())
    // start by getting list of all collection names
    .map((collection) => collection.name)
    // then filter list by those older than 3 days
    .filter((name) => extractDate(name) < limit)

  // then drop each collection in the list
  // wrap each call in Promise.all, then await the result
  // to avoid the client connection closing before completion
  console.log('cleaning up old archives')
  await Promise.all(
    oldCollections.map((collection) => db.dropCollection(collection))
  )

  return [db, client]
}

/*
 * EXECUTE Queries
 */

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
    // archive current data
    .then(archiveCurrent)
    .catch((error) => {
      console.error('An error occurred while archiving the current data.')

      throw error
    })
    // save latest data in production collections
    .then(getNew)
    .catch((error) => {
      console.error(
        'An error occurred while getting the latest data from Trello.'
      )

      throw error
    })
    // clean up old archives
    .then(deleteOldArchives)
    .catch((error) => {
      console.error('An error occurred while cleaning up the old archives.')

      throw error
    })
    .catch((error) => {
      console.error(error)
    })
    .finally(() => client.close())
