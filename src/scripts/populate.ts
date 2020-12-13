import { Db } from 'mongodb'

import * as fetch from '../lib/fetch'
import { RecipeDetails } from '../schema/data'
import model from '../lib/database'

export const tags = (db: Db) =>
  fetch
    .tags()
    .then(async (res) => {
      return await model.Tag(db).create.many(res.unwrap())
    })
    .then((res) => {
      console.dir(res)
    })
    .catch(console.error)

export const recipes = (db: Db) =>
  fetch
    .recipes()
    .then(async (res) => {
      return await model.Recipe(db).create.many(res.unwrap())
    })
    .then(console.dir)
    .catch(console.error)

export const details = (db: Db) =>
  model
    .Recipe(db)
    .read.many()
    .toArray()
    .then((recipes) => recipes.map((recipe) => recipe.id))
    .then(async (ids) => {
      const recipeDetails: Array<RecipeDetails> = await Promise.all(
        ids.map(
          (id, index) =>
            new Promise<RecipeDetails>((resolve) => {
              setTimeout(async () => {
                const details = (await fetch.details(id)).unwrap()
                console.log(`fetching ${id}`)
                resolve(details)
              }, index * 110)
            })
        )
      )

      return await model.Detail(db).create.many(recipeDetails)
    })
    .then(console.dir)
    .catch(console.error)
