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
    .catch(console.error)

export const recipes = (db: Db) =>
  fetch
    .recipes()
    .then(async (res) => {
      return await model.Recipe(db).create.many(res.unwrap())
    })
    .catch(console.error)

export const details = (db: Db) =>
  model
    .Recipe(db)
    .read.many()
    .toArray()
    .then((recipes) => recipes.map((recipe) => recipe.id))
    .then(async (ids) => {
      const totalNum = ids.length

      const recipeDetails: Array<RecipeDetails> = await Promise.all(
        ids.map(
          (id, index) =>
            new Promise<RecipeDetails>((resolve) => {
              setTimeout(async () => {
                process.stdout.clearLine(0)
                process.stdout.cursorTo(0)
                process.stdout.write(
                  `fetching details: ${index + 1}/${totalNum}`
                )

                const details = (await fetch.details(id)).unwrap()

                resolve(details)
              }, index * 120)
            })
        )
      )

      console.log('writing details to database')
      return await model.Detail(db).create.many(recipeDetails)
    })
    .catch(console.error)
