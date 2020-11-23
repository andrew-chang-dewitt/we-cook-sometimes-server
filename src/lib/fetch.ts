import fetch, { Response } from 'node-fetch'
import { ok, err, mergeResults, Result } from '../utils/Result'

import * as Data from '../schema/data'
import * as Trello from '../schema/trello'

import {
  buildTag,
  buildImage,
  buildRecipeCard,
  buildRecipeDetails,
} from './translations'

const boardId = '5820f9c22043447d3f4fa857'
const board = `/board/${boardId}`
export const publishedTagId = '5f55960c17f08e1fde18785e'

export class FetchError extends Error {
  response?: Response

  constructor(message: string, responseObj?: Response) {
    super(message)

    if (responseObj) this.response = responseObj
  }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * fetch wrapper
 *
 * simplifies making a fetch request, checking for errors, & wrapping
 * response in a Result type
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const trello = <T>(endpoint: string): Promise<Result<T, FetchError>> => {
  const root = 'https://api.trello.com/1'

  return fetch(root + endpoint)
    .then((res: Response) => {
      if (!res.ok) throw new FetchError(`${res.status} ${res.statusText}`, res)
      return res
    })
    .then((res: Response) => res.json().then((json: T) => ok(json)))
    .catch((e: Error) => {
      // no need to test if an error type is wrapped
      /* istanbul ignore next */
      return err(e instanceof FetchError ? e : new FetchError(e.message))
    })
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get all Tags
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export const tags = (): Promise<Result<Array<Data.Tag>, FetchError>> =>
  trello<Array<Trello.Label>>(board + '/labels').then((result) =>
    result.mapOk<Array<Data.Tag>>((labels) =>
      labels.map((label) => buildTag(label))
    )
  )

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get a specific Image
 *
 * - fetches a specific image from a specific card
 * - won't return an image if it isn't published
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * helper functions
 *
 */

const imgUnpubMsg =
  'The requested image is not marked as published & is unavailable.'
// guard against unpublished images
const checkPublished = (
  item: Trello.Attachment
): Result<Trello.Attachment, FetchError> => {
  const split = item.name.split(']')
  const first = split[0]

  if (first === '[published') {
    split.splice(0, 1)

    return ok({
      ...item,
      name: split.join(''),
    })
  }

  return err(new FetchError(imgUnpubMsg))
}

// fetch an Image
export const image = (
  cardId: string,
  imageId: string
): Promise<Result<Data.Image, FetchError>> =>
  trello<Trello.Attachment>(
    `/card/${cardId}/attachments/${imageId}?fields=id,name,url,previews,edgeColor`
  )
    // guard against unpublished images
    .then((res) => checkPublished(res.unwrap()))
    // then translate
    .then((res) =>
      res.mapOk<Data.Image>((attachment) => buildImage(attachment))
    )
    .catch((e) =>
      err(
        new FetchError(
          `An unknown error ocurred while fetching the requested image ${imageId} from ${cardId}:\n ${e}`
        )
      )
    )

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get all Recipes
 *
 * - parse Trello cards for relevant info & shape to
 *   match expected Data.RecipeCard interface
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export const recipes = async (): Promise<
  Result<Array<Data.RecipeCard>, FetchError>
> => {
  const getImageFromCard = (
    card: Trello.Card
  ): null | Promise<Result<Data.Image, FetchError>> =>
    card.idAttachmentCover ? image(card.id, card.idAttachmentCover) : null

  const onImageError = (e: Error): null => {
    if (e.message !== imgUnpubMsg) throw e

    console.warn(`The requested image is unpublished: ${e.message}`)
    return null
  }

  // getting the actual recipes & their associated cover images takes a few steps
  // first, get the cards from Trello
  return (
    trello<Array<Trello.Card>>(
      board + '/cards?fields=id,name,shortLink,idList,labels,idAttachmentCover'
    )
      // then get a cover image for each card from it's idAttachmentCover property
      .then(
        async (
          cardResults
        ): Promise<{
          cardResults: Result<Array<Trello.Card>, FetchError>
          images: Array<null | Data.Image>
        }> => {
          let cards: Array<Trello.Card>

          try {
            cards = cardResults.unwrap()
          } catch (e) {
            return {
              cardResults,
              images: [null],
            }
          }

          return {
            cardResults: cardResults,

            // each image returns a Promise, so using Promise.all makes flattening
            images:
              // the array to just a simple array of Data.Image objects much simpler
              // the one caveat: unwrapping cardResults can throw an error that has
              // to be caught later
              (
                await Promise.all(cardResults.unwrap().map(getImageFromCard))
              ).map((possibleResult) =>
                possibleResult
                  ? possibleResult.unwrap<null>(onImageError)
                  : null
              ),
          }
        }
      )

      .then(({ cardResults, images }) =>
        cardResults.mapOk((cards) =>
          // finally, the resulting lists of cards & attachments can be
          // merged & translated
          cards.map((card, i) => buildRecipeCard(card, images[i]))
        )
      )

      .catch(
        (e) =>
          err(
            new FetchError(
              `An unknown error ocurred while fetching recipes:\n${e}`
            )
          ) as Result<Array<Data.RecipeCard>, FetchError>
      )
  )
}

export const details = async (
  id: string
): Promise<Result<Data.RecipeDetails, FetchError>> => {
  const details = await trello<Trello.CardDetails>(`/card/${id}?fields=id,desc`)
  const images = await trello<Array<Trello.Attachment>>(
    `/card/${id}/attachments?fields=id,name,url,previews,edgeColor`
  ).then((res) =>
    res.mapOk((images) =>
      images
        .reduce((published, img) => {
          published.push(
            checkPublished(img).unwrap(
              (_) => (null as unknown) as Trello.Attachment
            )
          )

          return published
        }, [] as Array<Trello.Attachment>)
        .filter((img) => img !== null)
    )
  )

  return mergeResults(details, images, buildRecipeDetails)
}

export default {
  tags,
  image,
  recipes,
  details,
}
