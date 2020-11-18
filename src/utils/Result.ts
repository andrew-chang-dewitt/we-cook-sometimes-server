type Ok<T> = { _tag: 'ok'; ok: T }
type Err<E extends Error> = { _tag: 'err'; err: E }

type ResultType<T, E extends Error> = Ok<T> | Err<E>

const okType = <T, E extends Error>(value: T): ResultType<T, E> => ({
  _tag: 'ok',
  ok: value,
})

const errType = <T, E extends Error>(value: E): ResultType<T, E> => ({
  _tag: 'err',
  err: value,
})

const isOk = <T, E extends Error>(result: ResultType<T, E>): result is Ok<T> =>
  result._tag === 'ok'

const isErr = <T, E extends Error>(
  result: ResultType<T, E>
): result is Err<E> => result._tag === 'err'

interface ErrorHandler<U, E extends Error> {
  (e: E): U
}

const unwrap = <T, U, E extends Error>(
  result: ResultType<T, E>,
  errHandler?: ErrorHandler<U, E>
): T | U => {
  if (isOk(result)) return result.ok
  if (errHandler !== undefined) return errHandler(result.err)
  else throw result.err
}

interface MapOkFn<T, U> {
  (okValue: T): U
}

const mapOk = <T, U, E extends Error>(
  result: ResultType<T, E>,
  fn: MapOkFn<T, U>
): ResultType<U, E> => {
  if (isOk(result)) return okType(fn(result.ok))
  else return result
}

interface MapErrFn<E extends Error> {
  (errValue: E): E
}

const mapErr = <T, E extends Error>(
  result: ResultType<T, E>,
  fn: MapErrFn<E>
): ResultType<T, E> => {
  if (isErr(result)) return errType(fn(result.err))
  else return result
}

const map = <T, U, E extends Error>(
  result: ResultType<T, E>,
  onOk: MapOkFn<T, U>,
  onErr: MapErrFn<E>
): ResultType<U, E> => {
  if (isOk(result)) return okType(onOk(result.ok))
  else return errType(onErr(result.err))
}

export interface Result<T, E extends Error> {
  unwrap: <U = T>(errorHandler?: ErrorHandler<U, E>) => T | U
  map: <U = T>(onOk: MapOkFn<T, U>, onErr: MapErrFn<E>) => Result<T | U, E>
  mapOk: <U = T>(fn: MapOkFn<T, U>) => Result<U, E>
  mapErr: (fn: MapErrFn<E>) => Result<T, E>
}

const ResultBuilder = <T, E extends Error>(
  result: ResultType<T, E>
): Result<T, E> => ({
  unwrap: <U = T>(errorHandler?: ErrorHandler<U, E>) =>
    unwrap(result, errorHandler),
  map: <U = T>(onOk: MapOkFn<T, U>, onErr: MapErrFn<E>) =>
    ResultBuilder<T | U, E>(map(result, onOk, onErr)),
  mapOk: <U = T>(fn: MapOkFn<T, U>) => ResultBuilder<U, E>(mapOk(result, fn)),
  mapErr: (fn) => ResultBuilder(mapErr(result, fn)),
})

export const ok = <T, E extends Error>(value: T): Result<T, E> =>
  ResultBuilder(okType(value))

export const err = <T, E extends Error>(value: E): Result<T, E> =>
  ResultBuilder(errType(value))

export const tryCatch = <T, E extends Error>(
  callback: () => T,
  onError: (error: E) => E
): Result<T, E> => {
  try {
    return ok(callback())
  } catch (error) {
    return err(onError(error))
  }
}

interface MergeFn<A, B, C> {
  (a: A, b: B): C
}

export const mergeResults = <T, S, V, E extends Error>(
  a: Result<T, E>,
  b: Result<S, E>,
  mergeFn: MergeFn<T, S, V>
): Result<V, E> => {
  return tryCatch(
    () => mergeFn(a.unwrap(), b.unwrap()),
    (e) => e
  )

  // try {
  //   aValue = a.unwrap()
  //   bValue = b.unwrap()
  // } catch (e) {
  //   return err(e)
  // }

  // return ok(mergeFn(aValue, bValue))
}
