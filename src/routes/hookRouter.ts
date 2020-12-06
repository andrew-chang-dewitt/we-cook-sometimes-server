import express, { Router } from 'express'
import { Db } from 'mongodb'

import handleAction from '../lib/handleAction'

export default ({ db }: { db: Db }) => {
  const router = Router()

  // trello first sends a HEAD request to check if the endpoint is up
  // if it gets a 200 response, it continues
  router.head('/', (_, res) => res.status(200).send())

  // trello then sends a response with a body as JSON,
  // middleware is needed to process it
  router.use(express.json())

  // response is sent as POST request, process here
  router.post('/', (req, res, next) => {
    // pass handling off to handler library
    handleAction(req.body.action, db)
      // if there's no problem in handling it,
      // send a successful response
      .then(() => res.json({ success: true }))
      // otherwise send the error to the Error Handler via next()
      .catch(next)
  })

  return router
}
