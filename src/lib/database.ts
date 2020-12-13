/* istanbul ignore file */

import {
  MongoClient,
  Db,
  Collection as DBCollection,
  InsertWriteOpResult,
  InsertOneWriteOpResult,
  FindAndModifyWriteOpResultObject,
  Cursor,
} from 'mongodb'

import { RecipeCard, RecipeDetails, Tag } from '../schema/data'

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

export enum CollectionName {
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

export interface Collection<T> {
  create: Creator<T>
  read: Reader<T>
  update: Updater<T>
  deleteDoc: Deleter<T>
}

const CollectionBuilder = <T>(
  db: Db,
  collection: CollectionName
): Collection<T> => ({
  create: create<T>(db, collection),
  read: read<T>(db, collection),
  update: update<T>(db, collection),
  deleteDoc: deleteDoc<T>(db, collection),
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
  many: (query?: { [x: string]: any }) => Cursor<T>
  one: (id: string) => Promise<T | null>
}

const read = <T>(db: Db, collection: CollectionName): Reader<T> => {
  const c = resolveCollection(db, collection)

  return {
    many: (query) => (query ? c.find(query) : c.find()),
    one: (id) => c.findOne({ id: id }),
  }
}

interface Updater<T extends Object> {
  one: (
    id: string,
    updatedDocument: T
  ) => Promise<FindAndModifyWriteOpResultObject<T>>
}

const update = <T extends Object>(
  db: Db,
  collection: CollectionName
): Updater<T> => {
  const c = resolveCollection(db, collection)

  return {
    one: (id, updatedDocument) =>
      c.findOneAndReplace({ id: id }, updatedDocument),
  }
}

interface Deleter<T> {
  one: (id: string) => Promise<FindAndModifyWriteOpResultObject<T>>
}

const deleteDoc = <T>(db: Db, collection: CollectionName): Deleter<T> => {
  const c = resolveCollection(db, collection)

  return {
    one: (id) => c.findOneAndDelete({ id: id }),
  }
}

export default {
  connect,
  Recipe: (db: Db) => CollectionBuilder<RecipeCard>(db, CollectionName.Recipes),
  Detail: (db: Db) =>
    CollectionBuilder<RecipeDetails>(db, CollectionName.Details),
  Tag: (db: Db) => CollectionBuilder<Tag>(db, CollectionName.Tags),
}
