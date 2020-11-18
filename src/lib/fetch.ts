import { ok, err, mergeResults, Result } from '../utils/Result'
import fetch, { Response } from 'node-fetch'

import * as Data from '../schema/data'
import * as Trello from '../schema/trello'

const boardId = '5820f9c22043447d3f4fa857'
const board = `/board/${boardId}`
export const publishedTagId = '5f55960c17f08e1fde18785e'

export class FetchError extends Error {}

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
      if (!res.ok) throw new FetchError(`${res.status} ${res.statusText}`)
      return res
    })
    .then((res: Response) => res.json().then((json: T) => ok(json)))
    .catch((e: Error) => err(new FetchError(e.message)))
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get all Tags
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export const tags = (): Promise<Result<Array<Data.Tag>, FetchError>> =>
  trello<Array<Trello.Label>>(board + '/labels')

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get a specific Image
 *
 * - fetches a specific image from a specific card
 * - can choose the smallest image that is still over a set of minimum
 *   dimensions
 * - won't return an image if it isn't published
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

interface MinDimensions {
  height?: number
  width?: number
}

/*
 * helper functions
 *
 */

// compares two images & returns the one with height & width that are
// equal two or larger than the other
const isBigger = (
  img: Trello.AttachmentPreview,
  { height = 0, width = 0 }: MinDimensions
): boolean => {
  const heightBigger = img.height >= height
  const widthBigger = img.width >= width

  return heightBigger && widthBigger
}

// finds the smallest image in `previews` that still satisfies the minimum
// requirements given
const findBestFit = (
  res: Trello.Attachment,
  minDimensions: MinDimensions
): number => {
  let index = res.previews.length - 1

  // search previews for an image that's scaled to being only as
  // big as is needed
  res.previews.some((preview, current) => {
    const bigger = isBigger(preview, minDimensions)

    // when the first preview not bigger is found, store previous
    // index for extracting the preview's URL
    if (bigger) {
      index = current
    }

    // then return bigger to short circuit if true,
    // or continue if false
    return bigger
  })

  return index
}

// get the best fitting image, if minimum dimensions are given
const processImage = (
  img: Trello.Attachment,
  minDimensions?: MinDimensions
): Data.Image =>
  minDimensions
    ? {
        url: img.previews[findBestFit(img, minDimensions)].url,
        id: img.id,
        edgeColor: img.edgeColor,
        name: img.name,
      }
    : {
        url: img.url,
        id: img.id,
        edgeColor: img.edgeColor,
        name: img.name,
      }

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

  return err(
    new FetchError(
      'The requested image is not marked as published & is unavailable.'
    )
  )
}

// fetch an Image
export const image = (
  cardId: string,
  imageId: string,
  minDimensions?: MinDimensions
): Promise<Result<Data.Image, FetchError>> => {
  if (minDimensions) {
    // MinDimensions allows both props to be undefined, guard here
    // against an object with no props
    if (!minDimensions.height && !minDimensions.width) {
      return Promise.resolve(
        err(
          new FetchError(
            `at least one property on minDimensions must be provided: ${JSON.stringify(
              minDimensions
            )}`
          )
        )
      )
    }
  }

  return (
    trello<Trello.Attachment>(
      `/card/${cardId}/attachments/${imageId}?fields=id,name,url,previews,edgeColor`
    )
      // guard against unpublished images
      .then((res) => checkPublished(res.unwrap()))
      // get the best fitting image
      .then((res) =>
        res.mapOk<Data.Image>((img) => processImage(img, minDimensions))
      )
  )
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * get all Recipes
 *
 * - parse Trello cards for relevant info & shape to
 *   match expected Data.RecipeCard interface
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export interface RecipesById {
  [index: string]: Data.RecipeCard
}

export interface RecipesByLabelId {
  [index: string]: Array<string>
}

const processRecipes = (recipes: Array<Trello.Card>): Array<Data.RecipeCard> =>
  recipes.map(({ id, name, shortLink, idAttachmentCover, idList, labels }) => ({
    id,
    name,
    shortLink,
    idAttachmentCover,
    idList,
    tags: labels,
  }))

export const recipes = (): Promise<
  Result<Array<Data.RecipeCard>, FetchError>
> => {
  return trello<Array<Trello.Card>>(
    board + '/cards?fields=id,name,shortLink,idList,labels,idAttachmentCover'
  ).then((res) => res.mapOk<Array<Data.RecipeCard>>(processRecipes))
}

export const details = async (
  id: string
): Promise<Result<Data.RecipeDetails, FetchError>> => {
  const compileRecipeDetails = (
    { id, desc }: Trello.CardDetails,
    images: Array<Trello.Attachment>
  ): Data.RecipeDetails => ({
    id,
    desc,
    images,
  })

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

  return mergeResults(details, images, compileRecipeDetails)
}

interface SearchResults {
  cards: Array<Trello.Card>
}

export const search = async (query: string) => {
  return trello<SearchResults>(
    `/search?query=${query}&idBoards=${boardId}&card_fields=id,name,shortLink,idList,labels,idAttachmentCover`
  )
    .then(
      (res) =>
        res.mapOk<Array<Trello.Card>>((ok) => ok.cards) as Result<
          Array<Trello.Card>,
          FetchError
        >
    )
    .then((res) => res.mapOk<Array<Data.RecipeCard>>(processRecipes))
}

export default {
  tags,
  image,
  recipes,
  details,
  search,
}
