import * as Data from '../schema/data'
import * as Trello from '../schema/trello'
import * as Actions from './handleAction'

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

const isImage = (obj: Trello.Attachment | Data.Image): obj is Data.Image =>
  obj.hasOwnProperty('scaled')

export const buildRecipeCard = (
  { id, name, shortLink, idLabels, idList }: Trello.Card,
  coverImage: Trello.Attachment | Data.Image | null
): Data.RecipeCard => ({
  id,
  name,
  shortLink,
  idList,
  tags: idLabels,
  cover:
    coverImage !== null
      ? isImage(coverImage)
        ? coverImage
        : buildImage(coverImage)
      : null,
})

export const buildRecipeDetails = (
  { id, desc }: Trello.CardDetails,
  images: Array<Trello.Attachment>
): Data.RecipeDetails => ({
  id,
  desc,
  images: images.map(buildImage),
})

export const actionUpdateCardName = (
  card: Data.RecipeCard,
  action: Actions.UpdateCardName
): Data.RecipeCard => ({
  ...card,
  name: action.data.card.name,
})

export const actionUpdateCardDesc = (
  details: Data.RecipeDetails,
  action: Actions.UpdateCardDesc
): Data.RecipeDetails => ({
  ...details,
  desc: action.data.card.desc,
})

export const actionUpdateCardList = (
  card: Data.RecipeCard,
  action: Actions.UpdateCardList
): Data.RecipeCard => ({
  ...card,
  idList: action.data.card.idList,
})

export const actionRemoveLabelFromCard = (
  card: Data.RecipeCard,
  action: Actions.RemoveLabelFromCard
): Data.RecipeCard => {
  // build new Tags array without label removed by action
  // using Array.reduce()
  const newTags = card.tags.reduce((remaining, current) => {
    // spread to clone to avoid side effecting same array between
    // calls to reduce callback
    const res = [...remaining]

    // if current label isn't the one being removed
    current !== action.data.label.id
      ? // add it to list of remaining labels
        res.push(current)
      : // otherwise, don't push it so it won't end up in the
        // resulting list
        null

    return res
  }, [] as Array<string>)

  // then replace tags property with newTags & return
  return {
    ...card,
    tags: newTags,
  }
}

export const actionAddLabelToCard = (
  card: Data.RecipeCard,
  action: Actions.AddLabelToCard
): Data.RecipeCard => ({
  ...card,
  tags: [...card.tags, action.data.label.id],
})

export const actionCreateCard = {
  card: (action: Actions.CreateCard): Data.RecipeCard =>
    buildRecipeCard(
      {
        id: action.data.card.id,
        name: action.data.card.name,
        shortLink: action.data.card.shortLink,
        // when a new card is created, it's sent without any
        // labels, list, or cover information in the action.
        // If labels are added using # notation during card
        // creation, separate Add Label To Card actions are sent,
        // so they will be added automatically. Similarly, an
        // action will be sent when a cover is added.
        //
        // FIXME: idList isn't sent at the beginning, however; so
        // some way of getting the right list may be necessary
        idList: '',
        idLabels: [],
        idAttachmentCover: null,
      },
      null
    ),
  details: (action: Actions.CreateCard): Data.RecipeDetails =>
    buildRecipeDetails(
      {
        id: action.data.card.id,
        desc: '',
      },
      []
    ),
}

export const actionAddAttachmentToCard = (
  details: Data.RecipeDetails,
  action: Actions.AddAttachmentToCard
): Data.RecipeDetails => ({
  ...details,
  images: [
    ...details.images,
    buildImage({
      id: action.data.attachment.id,
      url: action.data.attachment.url,
      name: action.data.attachment.name,
      // action.data.attachment doesn't include edge color or
      // previews, for now, just initialize new attachment with empty
      // values the data can later be filled in during a scheduled
      // full sync with Trello
      edgeColor: '',
      previews: [],
    }),
  ],
})

export const actionDeleteAttachmentFromCard = (
  details: Data.RecipeDetails,
  action: Actions.DeleteAttachmentFromCard
): Data.RecipeDetails => {
  // remove attachment
  const newImages = details.images.reduce((remaining, current) => {
    // spread to clone to avoid side effecting same array between
    // calls to reduce callback
    const res = [...remaining]

    // if current label isn't the one being removed
    current.id !== action.data.attachment.id
      ? // add it to list of remaining labels
        res.push(current)
      : // otherwise, don't push it so it won't end up in the
        // resulting list
        null

    return res
  }, [] as Array<Data.Image>)

  // return updated Details
  return {
    ...details,
    images: newImages,
  }
}

export const actionCreateLabel = (action: Actions.CreateLabel): Data.Tag =>
  buildTag({
    id: action.data.label.id,
    name: action.data.label.name,
    color: action.data.label.color ? action.data.label.color : null,
    idBoard: action.data.board.id,
  })

export const actionUpdateLabel = (
  tag: Data.Tag,
  action: Actions.UpdateLabel
): Data.Tag => ({
  ...tag,
  ...action.data.label,
})
