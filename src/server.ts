/* istanbul ignore file */

import express, { ErrorRequestHandler } from 'express'
import morgan from 'morgan'
import Agenda from 'agenda'
// import path from 'path'

import model, { dburi } from './lib/database'
import refresh from './scripts/refresh'

import getRouter from './routes/getRouter'
import hookRouter from './routes/hookRouter'

const app = express()
const port = process.env.PORT || 8001
// FIXME: update this to 1 when on beta, rc, & actual release
const apiVersion = '1a'
const baseRoute = `/api/${apiVersion}`

let shuttingDown = false

// create a new connection to the Agenda job runner
const agenda = new Agenda()
  .database(dburi('jobs'), undefined, { useUnifiedTopology: true })
  .processEvery('12 hours')

// connect to the database, then start the application
model
  .connect()
  .then(([db, client]) => {
    /* * * * * * * * * * * * * * * * *
     *                               *
     *         SCHEDULE JOBS         *
     *                               *
     * * * * * * * * * * * * * * * * */

    // define job to refresh database
    agenda.define('refresh database', async () => {
      await refresh()
    })
    // schedule job to run every day at 4 AM
    agenda.every('24 hours', 'refresh database')

    agenda.start()

    /* * * * * * * * * * * * * * * * *
     *                               *
     *        SETUP WEBSERVER        *
     *                               *
     * * * * * * * * * * * * * * * * */

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
    app.use(((err, _, res, __) => {
      console.error('An error occurred with the following request:')
      console.dir(err)

      res.status(500).json({
        errType: err.constructor.name,
        msg: err.message,
        stack: err.stack ? err.stack.split('\n') : null,
      })
    }) as ErrorRequestHandler)

    /*
     * Running the server
     */

    // start the server & save the returned object for later
    const server = app.listen(port, () => {
      console.debug(`server started at localhost:${port}`)
    })

    /* * * * * * * * * * * * * * * * *
     *                               *
     *      PROCESS MANAGEMENT       *
     *                               *
     * * * * * * * * * * * * * * * * */

    // shuts down the server & job runner, triggering graceful exit
    const shutDownServer = async () => {
      // alert others that the system is shutting down
      shuttingDown = true

      // stop Agenda
      await agenda.stop()
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
