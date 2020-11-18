import * as Data from '../schema/data'
import * as Trello from '../schema/trello'

export const buildTag = (label: Trello.Label): Data.Tag => label as Data.Tag

export const buildImage = ({
  id,
  edgeColor,
  url,
  name,
  previews,
}: Trello.Attachment): Data.Image => ({
  id,
  edgeColor,
  url,
  name,
  scaled: previews as Array<Data.ScaledImage>,
})

export const buildRecipeCard = (
  { id, name, shortLink, labels, idList }: Trello.Card,
  coverImage: Trello.Attachment
): Data.RecipeCard => ({
  id,
  name,
  shortLink,
  idList,
  tags: labels.map((label) => buildTag(label)),
  cover: buildImage(coverImage),
})

export const buildRecipeDetails = (
  { id, desc }: Trello.CardDetails,
  images: Array<Trello.Attachment>
): Data.RecipeDetails => ({
  id,
  desc,
  images: images.map((attachment) => buildImage(attachment)),
})
