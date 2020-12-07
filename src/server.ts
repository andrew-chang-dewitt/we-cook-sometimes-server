/* istanbul ignore file */

import express, { ErrorRequestHandler } from 'express'
import morgan from 'morgan'
// import path from 'path'

import model from './lib/database'
// import { buildTag } from './lib/translations'
// import { Tag } from './schema/data'

import getRouter from './routes/getRouter'
import hookRouter from './routes/hookRouter'

const app = express()
const port = process.env.PORT || 8001
// FIXME: update this to 1 when on beta, rc, & actual release
const apiVersion = '1a'
const baseRoute = `/api/${apiVersion}`

let shuttingDown = false

// connect to the database, then start the application
model
  .connect()
  .then(([db, client]) => {
    /*
     * Middleware
     */

    // better logging
    app.use(morgan('dev'))

    // graceful exit
    app.use((_, res, next) => {
      if (!shuttingDown) {
        return next()
      }

      res
        .header('Connection', 'close')
        .status(503)
        .send('Server is shutting down')
    })

    /*
     * Routing
     */

    // simple route to check if API is up
    app.get(baseRoute + '/status', (_, res) => {
      res.send('API is up')
    })

    // routes for fetching data from Db
    app.use(baseRoute, getRouter({ db }))

    // receive updates from Trello
    app.use(baseRoute + '/from_trello', hookRouter({ db }))

    /*
     * Error Handling
     */
    app.use(((err, req, res, _) => {
      console.error('An error occurred with the following request:')
      console.error(`${req.method} ${req.originalUrl}`)
      // console.error(err)
      console.dir(err)

      res.status(500).json({
        errType: err.constructor.name,
        msg: err.message,
        stack: err.stack ? err.stack.split('\n') : null,
      })
    }) as ErrorRequestHandler)

    const server = app.listen(port, () => {
      console.debug(`server started at localhost:${port}`)
    })

    const shutDownServer = () => {
      // alert others that the system is shutting down
      shuttingDown = true

      // shut down db connection
      client.close()
      // shut down express server
      server.close(() => {
        console.log('Remaining connections closed, shutting down server')
        process.exit()
      })
    }

    // listen for shut down signals
    process.on('SIGINT', shutDownServer)
    process.on('SIGTERM', shutDownServer)
  })
  .catch((e) => {
    console.error(
      'An error ocurred while running app or setting up database connection:'
    )
    console.error(e)
  })
