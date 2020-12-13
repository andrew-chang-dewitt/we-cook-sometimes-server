import { Db, MongoClient } from 'mongodb'

import model, { CollectionName } from '../lib/database'
import { tags, recipes, details } from './populate'

model
  .connect()
  .then(async ([db, client]) => {
    // get current date as ISO string to use for renaming current collections
    const date = new Date().toISOString().split('T')[0]

    const rename = (db: Db, name: CollectionName) =>
      db.collection(name).rename(`${date}-${name}`)

    // copy current state to history
    // this is most easily done by renaming the existing collections
    await rename(db, CollectionName.Recipes)
    await rename(db, CollectionName.Details)
    await rename(db, CollectionName.Tags)

    return [db, client] as [Db, MongoClient]
  })
  .then(async ([db, client]) => {
    // rebuild using original populate functions
    // awaiting Promises to execute one at a time as to avoid
    // hitting Trello API's rate limit
    await tags(db)
    await recipes(db)
    await details(db)

    return [db, client] as [Db, MongoClient]
  })
  .then(([_, client]) => client.close())
  .catch(console.error)
