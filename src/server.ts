/* istanbul ignore file */

import express, { ErrorRequestHandler } from 'express'
import morgan from 'morgan'
// import path from 'path'

import model from './lib/database'
import { buildTag } from './lib/translations'
import { Tag } from './schema/data'

import getRouter from './routes/getRouter'

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
    //
    // multiple messages are received, configure route here
    const hookRoute = baseRoute + '/from_trello'

    // trello first sends a HEAD request to check if the endpoint is up
    // if it gets a 200 response, it continues
    app.head(hookRoute, (_, res) => {
      res.status(200).send()
    })
    // response body is sent as JSON, middleware is needed to process it
    app.use(express.json())
    // response is sent as POST request, process here
    app.post(hookRoute, (req, res) => {
      const action = req.body.action

      // console.dir(action)

      switch (action.type) {
        case 'updateCard': {
          const id = action.data.card.id

          // determine what changed & if it's RecipeCard or RecipeDetails
          // then make change in appropriate collection on DB
          switch (action.display.translationKey) {
            case 'action_renamed_card': {
              // RecipeCard, name changed
              // get current Recipe by action.data.card.id
              model
                .Recipe(db)
                .read.one(id)
                // then Update that Recipe in DB with new name
                .then((current) => {
                  current
                    ? model.Recipe(db).update.one(id, {
                        ...current,
                        name: action.data.card.name as string,
                      })
                    : null
                })
              break
            }

            case 'action_changed_description_of_card': {
              // RecipeDetails, desc changed
              // get current Detail by action.data.card.id
              model
                .Detail(db)
                .read.one(id)
                // then Update that Detail in DB with new name
                .then((current) => {
                  current
                    ? model.Detail(db).update.one(id, {
                        ...current,
                        desc: action.data.card.desc as string,
                      })
                    : null
                })
              break
            }
          }

          break
        }

        case 'addLabelToCard': {
          const id = action.data.card.id

          // get the model for the Recipe being modified by the hook
          model
            .Recipe(db)
            .read.one(id)
            // then construct a new model without the label being added
            .then((current) => {
              // & update the old model of the Recipe with the newly modified model
              current
                ? model.Recipe(db).update.one(id, {
                    ...current,
                    tags: [...current.tags, buildTag(action.data.label)],
                  })
                : null
            })
          break
        }

        case 'removeLabelFromCard': {
          const id = action.data.card.id

          // get the model for the Recipe being modified by the hook
          model
            .Recipe(db)
            .read.one(id)
            .then((current) => {
              // then construct a new model without the label being removed
              if (current) {
                const newTags = current.tags.reduce((remaining, current) => {
                  // spread to clone to avoid side effecting same array between
                  // calls to reduce callback
                  const res = [...remaining]

                  // if current label isn't the one being removed
                  current.id !== action.data.label.id
                    ? // add it to list of remaining labels
                      res.push(current)
                    : // otherwise, don't push it so it won't end up in the
                      // resulting list
                      null

                  return res
                }, [] as Array<Tag>)

                // & update the old model of the Recipe with the newly modified model
                model.Recipe(db).update.one(id, {
                  ...current,
                  tags: newTags,
                })
              }
            })
          break
        }
      }

      res.json({ success: true })
    })

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
        stack: err.stack.split('\n'),
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
