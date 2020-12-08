import {
  Db,
  FindAndModifyWriteOpResultObject,
  InsertOneWriteOpResult,
} from 'mongodb'

import { Tag, Image, RecipeCard, RecipeDetails } from '../schema/data'
import { Label } from '../schema/trello'
import {
  buildTag,
  buildImage,
  buildRecipeCard,
  buildRecipeDetails,
} from '../lib/translations'
import model from './database'

enum ActionType {
  UpdateCard = 'updateCard',
  RemoveLabelFromCard = 'removeLabelFromCard',
  AddLabelToCard = 'addLabelToCard',
  CreateCard = 'createCard',
  DeleteCard = 'deleteCard',
  AddAttachmentToCard = 'addAttachmentToCard',
  DeleteAttachmentFromCard = 'deleteAttachmentFromCard',
}

class UnhandledActionError extends Error {}
class DocumentNotFoundError extends Error {}

type Action =
  | UpdateCard
  | RemoveLabelFromCard
  | AddLabelToCard
  | CreateCard
  | DeleteCard
  | AddAttachmentToCard
  | DeleteAttachmentFromCard

const fold = <ReturnType extends any>(
  updateCard: (action: UpdateCard) => ReturnType,
  removeLabelFromCard: (action: RemoveLabelFromCard) => ReturnType,
  addLabelToCard: (action: AddLabelToCard) => ReturnType,
  createCard: (action: CreateCard) => ReturnType,
  deleteCard: (action: DeleteCard) => ReturnType,
  addAttachmentToCard: (action: AddAttachmentToCard) => ReturnType,
  deleteAttachmentFromCard: (action: DeleteAttachmentFromCard) => ReturnType
) => (action: Action): ReturnType => {
  switch (action.type) {
    case ActionType.UpdateCard:
      return updateCard(action)
    case ActionType.RemoveLabelFromCard:
      return removeLabelFromCard(action)
    case ActionType.AddLabelToCard:
      return addLabelToCard(action)
    case ActionType.CreateCard:
      return createCard(action)
    case ActionType.DeleteCard:
      return deleteCard(action)
    case ActionType.AddAttachmentToCard:
      return addAttachmentToCard(action)
    case ActionType.DeleteAttachmentFromCard:
      return deleteAttachmentFromCard(action)
    default:
      throw new UnhandledActionError()
  }
}

interface ActionBase {
  type: ActionType
  data: {
    card: { id: string }
  }
}

type UpdateCard = UpdateCardName | UpdateCardDesc | UpdateCardList

enum UpdateCardType {
  Name = 'action_renamed_card',
  Desc = 'action_changed_description_of_card',
  List = 'action_move_card_from_list_to_list',
}

interface UpdateCardBase extends ActionBase {
  display: { translationKey: UpdateCardType }
}

interface UpdateCardName extends UpdateCardBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Name }
  data: {
    card: {
      id: string
      name: string
    }
  }
}

interface UpdateCardDesc extends UpdateCardBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Desc }
  data: {
    card: {
      id: string
      desc: string
    }
  }
}

interface UpdateCardList extends UpdateCardBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.List }
  data: {
    card: {
      id: string
      idList: string
    }
  }
}

const isUpdateCardName = (update: UpdateCard): update is UpdateCardName =>
  update.display.translationKey === UpdateCardType.Name
const isUpdateCardDesc = (update: UpdateCard): update is UpdateCardDesc =>
  update.display.translationKey === UpdateCardType.Desc
const isUpdateCardList = (update: UpdateCard): update is UpdateCardList =>
  update.display.translationKey === UpdateCardType.List

const handleUpdateCardName = (
  action: UpdateCardName,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard>> =>
  // get current Recipe by action.data.card.id
  model
    .Recipe(db)
    .read.one(action.data.card.id)
    // then Update that Recipe in DB with new name
    .then((current) => {
      if (current)
        return model.Recipe(db).update.one(action.data.card.id, {
          ...current,
          name: action.data.card.name as string,
        })
      else throw new DocumentNotFoundError()
    })

const handleUpdateCardDesc = (
  action: UpdateCardDesc,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeDetails>> =>
  // get current Detail by action.data.card.id
  model
    .Detail(db)
    .read.one(action.data.card.id)
    // then Update that Detail in DB with new name
    .then((current) => {
      if (current)
        return model.Detail(db).update.one(action.data.card.id, {
          ...current,
          desc: action.data.card.desc as string,
        })
      else throw new DocumentNotFoundError()
    })

const handleUpdateCardList = (
  action: UpdateCardList,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard>> =>
  // get current Detail by action.data.card.id
  model
    .Recipe(db)
    .read.one(action.data.card.id)
    // then Update that Recipe in DB w/ new List
    .then((current) => {
      if (current)
        return model.Recipe(db).update.one(action.data.card.id, {
          ...current,
          idList: action.data.card.idList,
        })
      else throw new DocumentNotFoundError()
    })

const handleUpdateCard = (
  action: UpdateCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>> => {
  // determine what changed & if it's RecipeCard or RecipeDetails
  // then defer to handler to make change in appropriate collection on DB
  if (isUpdateCardName(action)) return handleUpdateCardName(action, db)
  else if (isUpdateCardDesc(action)) return handleUpdateCardDesc(action, db)
  else if (isUpdateCardList(action)) return handleUpdateCardList(action, db)
  else throw new UnhandledActionError()
}

interface RemoveLabelFromCard extends ActionBase {
  type: ActionType.RemoveLabelFromCard
  data: {
    card: {
      id: string
    }
    label: Label
  }
}

const handleRemoveLabelFromCard = (
  action: RemoveLabelFromCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard>> =>
  // get the model for the Recipe being modified by the hook
  model
    .Recipe(db)
    .read.one(action.data.card.id)
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
        return model.Recipe(db).update.one(action.data.card.id, {
          ...current,
          tags: newTags,
        })
      }

      throw new DocumentNotFoundError()
    })

interface AddLabelToCard extends ActionBase {
  type: ActionType.AddLabelToCard
  data: {
    card: {
      id: string
    }
    label: Label
  }
}

const handleAddLabelToCard = (
  action: AddLabelToCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard>> =>
  // get the model for the Recipe being modified by the hook
  model
    .Recipe(db)
    .read.one(action.data.card.id)
    // then construct a new model without the label being added
    .then((current) => {
      // & update the old model of the Recipe with the newly modified model
      if (current)
        return model.Recipe(db).update.one(action.data.card.id, {
          ...current,
          tags: [...current.tags, buildTag(action.data.label)],
        })

      throw new DocumentNotFoundError()
    })

interface CreateCard extends ActionBase {
  type: ActionType.CreateCard
  data: {
    card: {
      id: string
      name: string
      shortLink: string
    }
  }
}

const handleCreateCard = (
  action: CreateCard,
  db: Db
): Promise<InsertOneWriteOpResult<any>> => {
  const { id, name, shortLink } = action.data.card
  // build a new RecipeCard from Action & push to DB
  return model
    .Recipe(db)
    .create.one(
      buildRecipeCard(
        {
          id,
          name,
          shortLink,
          idList: '',
          labels: [],
          idAttachmentCover: null,
        },
        null
      )
    )
    .then((_) =>
      model.Detail(db).create.one(
        buildRecipeDetails(
          {
            id,
            desc: '',
          },
          []
        )
      )
    )
}

interface DeleteCard extends ActionBase {
  type: ActionType.DeleteCard
}

const handleDeleteCard = (
  action: DeleteCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>> =>
  model
    .Recipe(db)
    .deleteDoc.one(action.data.card.id)
    .then((_) => model.Detail(db).deleteDoc.one(action.data.card.id))

interface AddAttachmentToCard extends ActionBase {
  type: ActionType.AddAttachmentToCard
  data: {
    attachment: {
      id: string
      name: string
      url: string
    }
    card: { id: string }
  }
}

const handleAddAttachmentToCard = (
  action: AddAttachmentToCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeDetails>> => {
  const { id, name, url } = action.data.attachment

  const processPublished = (name: string): string => {
    const split = name.split(']')
    const first = split[0]

    if (first === '[published') {
      split.splice(0, 1)

      return split.join('')
    } else throw new Error('Image not published')
  }

  const newImage = buildImage({
    id,
    url,
    name: processPublished(name),
    // action.data.attachment doesn't include edge color or
    // previews, for now, just initialize new attachment with empty
    // values the data can later be filled in during a scheduled
    // full sync with Trello
    edgeColor: '',
    previews: [],
  })

  return (
    // get current Detail by action.data.card.id
    model
      .Detail(db)
      .read.one(action.data.card.id)
      // then Update that Detail in DB with new name
      .then((current) => {
        if (current) {
          const newImages = [...current.images]
          newImages.push(newImage)

          return model.Detail(db).update.one(action.data.card.id, {
            ...current,
            images: newImages,
          })
        } else throw new DocumentNotFoundError()
      })
  )
}

interface DeleteAttachmentFromCard extends ActionBase {
  type: ActionType.DeleteAttachmentFromCard
  data: {
    attachment: {
      id: string
    }
    card: { id: string }
  }
}

const handleDeleteAttachmentFromCard = (
  action: DeleteAttachmentFromCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeDetails>> =>
  model
    .Detail(db)
    .read.one(action.data.card.id)
    .then((current) => {
      if (current) {
        // remove attachment
        const newImages = current.images.reduce((remaining, current) => {
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
        }, [] as Array<Image>)

        // update model
        return model.Detail(db).update.one(action.data.card.id, {
          ...current,
          images: newImages,
        })
      } else throw new DocumentNotFoundError()
    })

export default (action: Action, db: Db) =>
  fold<
    Promise<
      | FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>
      | InsertOneWriteOpResult<any>
    >
  >(
    (action: UpdateCard) => handleUpdateCard(action, db),
    (action: RemoveLabelFromCard) => handleRemoveLabelFromCard(action, db),
    (action: AddLabelToCard) => handleAddLabelToCard(action, db),
    (action: CreateCard) => handleCreateCard(action, db),
    (action: DeleteCard) => handleDeleteCard(action, db),
    (action: AddAttachmentToCard) => handleAddAttachmentToCard(action, db),
    (action: DeleteAttachmentFromCard) =>
      handleDeleteAttachmentFromCard(action, db)
  )(action)
