import {
  MongoClient,
  Db,
  Collection as DBCollection,
  InsertWriteOpResult,
  InsertOneWriteOpResult,
  Cursor,
} from 'mongodb'

import { RecipeCard, RecipeDetails, Tag } from './schema/data'

const dbpassword = process.env.DBPASS
const dbname = 'test'
const dburi = `mongodb+srv://devtest:${dbpassword}@cluster0.2pcqv.mongodb.net/${dbname}?retryWrites=true&w=majority`

const connect = (db?: string): Promise<[Db, MongoClient]> =>
  MongoClient.connect(dburi, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .catch((e) => {
      console.log(e)
      throw e
    })
    .then(
      (client) => [client.db(db ? db : dbname), client] as [Db, MongoClient]
    )

enum CollectionName {
  Recipes = 'recipes',
  Details = 'details',
  Tags = 'tags',
}

const resolveCollection = (
  db: Db,
  collection: CollectionName
): DBCollection<any> => {
  switch (collection) {
    case CollectionName.Recipes:
    case CollectionName.Details:
    case CollectionName.Tags:
      return db.collection(collection)
    default:
      throw TypeError(`A collection matching ${collection} doesn't exist`)
  }
}

interface Collection<T> {
  create: Creator<T>
  read: Reader<T>
}

const CollectionBuilder = <T>(
  db: Db,
  collection: CollectionName
): Collection<T> => ({
  create: create<T>(db, collection),
  read: read<T>(db, collection),
})

interface Creator<T> {
  one: (document: T) => Promise<InsertOneWriteOpResult<any>>
  many: (documents: Array<T>) => Promise<InsertWriteOpResult<any>>
}

const create = <T>(db: Db, collection: CollectionName): Creator<T> => {
  const c = resolveCollection(db, collection)

  return {
    many: (documents) => c.insertMany(documents),
    one: (document) => c.insertOne(document),
  }
}

interface Reader<T> {
  many: () => Cursor<T>
  one: (id: string) => Promise<T | null>
}

const read = <T>(db: Db, collection: CollectionName): Reader<T> => {
  const c = resolveCollection(db, collection)

  return {
    many: () => c.find(),
    one: (id) => c.findOne({ id: id }),
  }
}

export default {
  dburi,
  connect,
  Recipe: (db: Db) => CollectionBuilder<RecipeCard>(db, CollectionName.Recipes),
  Detail: (db: Db) =>
    CollectionBuilder<RecipeDetails>(db, CollectionName.Details),
  Tag: (db: Db) => CollectionBuilder<Tag>(db, CollectionName.Tags),
}
