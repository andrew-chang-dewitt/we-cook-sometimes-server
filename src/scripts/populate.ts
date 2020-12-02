import { Db, MongoClient } from 'mongodb'

import * as fetch from '../lib/fetch'
import { RecipeDetails } from '../schema/data'
import db from '../lib/database'

export const tags = fetch
  .tags()
  .then(async (res) => {
    const [testDb, client] = await db.connect()

    return [await db.Tag(testDb).create.many(res.unwrap()), client] as [
      unknown,
      MongoClient
    ]
  })
  .then(([res, client]) => {
    console.dir(res)
    client.close()
  })
  .catch(console.error)

export const recipes = fetch
  .recipes()
  .then(async (res) => {
    const [testDb, client] = await db.connect()

    return [await db.Recipe(testDb).create.many(res.unwrap()), client] as [
      unknown,
      MongoClient
    ]
  })
  .then(([res, client]) => {
    console.dir(res)
    client.close()
  })

export const details = db
  .connect()
  .then(async ([database, client]) => {
    let ids: Array<string> = []

    await db
      .Recipe(database)
      .read.many()
      .forEach(async (recipe) => ids.push(recipe.id))

    return [ids, database, client] as [Array<string>, Db, MongoClient]
  })
  .then(async ([ids, database, client]) => {
    const recipeDetails: Array<RecipeDetails> = await Promise.all(
      ids.map(
        (id, index) =>
          new Promise<RecipeDetails>((resolve) => {
            setTimeout(async () => {
              resolve((await fetch.details(id)).unwrap())
            }, index * 100)
          })
      )
    )

    return [await db.Detail(database).create.many(recipeDetails), client] as [
      unknown,
      MongoClient
    ]
  })
  .then(([res, client]) => {
    console.dir(res)
    client.close()
  })
  .catch(console.error)
