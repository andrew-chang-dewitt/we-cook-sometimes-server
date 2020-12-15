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
  await rename(db, CollectionName.Recipes)
    // if there's an error in renaming
    .catch((error) => {
      // change name back (assuming it was changed)
      db.collection(`${pre}${CollectionName.Recipes}`).rename(
        CollectionName.Recipes
      )

      // then re-throw error to be handled by catch statement
      // written by caller
      throw error
    })
  await rename(db, CollectionName.Details)
    // if there's an error in renaming
    .catch((error) => {
      // change names back (assuming it was changed)
      db.collection(`${pre}${CollectionName.Recipes}`).rename(
        CollectionName.Recipes
      )
      db.collection(`${pre}${CollectionName.Details}`).rename(
        CollectionName.Details
      )

      // then re-throw error to be handled by catch statement
      // written by caller
      throw error
    })
  await rename(db, CollectionName.Tags)
    // if there's an error in renaming
    .catch(async (error) => {
      // change names back (assuming it was changed)
      await db
        .collection(`${pre}${CollectionName.Recipes}`)
        .rename(CollectionName.Recipes)
      await db
        .collection(`${pre}${CollectionName.Details}`)
        .rename(CollectionName.Details)
      await db
        .collection(`${pre}${CollectionName.Tags}`)
        .rename(CollectionName.Tags)

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
  await tags(db)
    .then((_) => recipes(db))
    .then((_) => details(db))
    .catch(async (error) => {
      const pre = prefix(today)

      await db
        // first drop any new versions of the prod collections that were created
        .dropCollection('tags')
        .then((_) => db.dropCollection('recipes'))
        .then((_) => db.dropCollection('details'))
        .finally(
          // and then attempt to restore previous versions from archives
          async () =>
            await db
              .collection(`${pre}${CollectionName.Recipes}`)
              .rename(CollectionName.Recipes)
              .then((_) =>
                db
                  .collection(`${pre}${CollectionName.Details}`)
                  .rename(CollectionName.Details)
              )
              .then((_) =>
                db
                  .collection(`${pre}${CollectionName.Tags}`)
                  .rename(CollectionName.Tags)
              )
        )

      // re-throw to be further handled by downstream handler
      throw error
    })

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
  await Promise.all(
    oldCollections.map((collection) => db.dropCollection(collection))
  )

  return [db, client]
}

/*
 * EXECUTE Queries
 */

model
  // establish a database connection
  .connect()
  .catch((error) => {
    // notify where error occurred
    console.error('An error occurred while connecting to the database.')

    // then re-throw to be logged by final catch statement
    throw error
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
  .then(([_, client]) => client.close())
  .catch(console.error)
