import express from 'express'
import morgan from 'morgan'
import path from 'path'
import { MongoClient } from 'mongodb'

const app = express()
const port = process.env.PORT || 8001
const dbpassword = process.env.DBPASS
const dbname = 'test'

const mongo = new MongoClient(
  `mongodb+srv://devtest:${dbpassword}@cluster0.2pcqv.mongodb.net/${dbname}?retryWrites=true&w=majority`
)

app.use(morgan('dev'))

app.get('/api', (req, res) => {
  res.send('Hello world! tsc-watch some more changes')
})

app.listen(port, () => {
  console.debug(`server started at localhost:${port}`)
})
