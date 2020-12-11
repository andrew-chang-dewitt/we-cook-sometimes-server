import { Router } from 'express'
import { Db } from 'mongodb'

import model from '../lib/database'

export default ({ db }: { db: Db }) => {
  const router = Router()

  // simple route to check if API is up
  router.get('/status', (_, res) => {
    res.send('API is up')
  })

  // get all tags
  router.get('/tag/all', (_, res, next) => {
    model
      .Tag(db)
      .read.many()
      .toArray()
      .then((tags) => res.json(tags))
      .catch(next)
  })

  // get all recipes
  router.get('/recipe/all', (_, res, next) => {
    model
      .Recipe(db)
      .read.many()
      .toArray()
      .then((recipes) => res.json(recipes))
      .catch(next)
  })

  // get all published recipes
  router.get('/recipe/published', (_, res, next) => {
    model
      .Recipe(db)
      // query for just the recipes with a tag that has
      // a name == published
      .read.many({ 'tags.name': 'published' })
      .toArray()
      .then((recipes) => res.json(recipes))
      .catch(next)
  })

  // get the details for a specific recipe
  router.get('/recipe/details/:id', (req, res, next) => {
    model
      .Detail(db)
      .read.one(req.params.id)
      .then((recipe) => res.json(recipe))
      .catch(next)
  })

  return router
}
