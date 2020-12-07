import {
  Db,
  FindAndModifyWriteOpResultObject,
  InsertOneWriteOpResult,
} from 'mongodb'

import { Tag, RecipeCard, RecipeDetails } from '../schema/data'
import { Label } from '../schema/trello'
import { buildTag, buildRecipeCard } from '../lib/translations'
import model from './database'

enum ActionType {
  UpdateCard = 'updateCard',
  RemoveLabelFromCard = 'removeLabelFromCard',
  AddLabelToCard = 'addLabelToCard',
  AddAttachmentToCard = 'addAttachmentToCard',
  CreateCard = 'createCard',
}

class UnhandledActionError extends Error {}
class DocumentNotFoundError extends Error {}

type Action = UpdateCard | RemoveLabelFromCard | AddLabelToCard | CreateCard

interface ActionBase {
  data: {}
}

const fold = <ReturnType extends any>(
  updateCard: (action: UpdateCard) => ReturnType,
  removeLabelFromCard: (action: RemoveLabelFromCard) => ReturnType,
  addLabelToCard: (action: AddLabelToCard) => ReturnType,
  createCard: (action: CreateCard) => ReturnType
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
    default:
      throw new UnhandledActionError()
  }
}

type UpdateCard = UpdateCardName | UpdateCardDesc | UpdateCardList

enum UpdateCardType {
  Name = 'action_renamed_card',
  Desc = 'action_changed_description_of_card',
  List = 'action_move_card_from_list_to_list',
}

interface UpdateCardName extends ActionBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Name }
  data: {
    card: {
      id: string
      name: string
    }
  }
}

interface UpdateCardDesc extends ActionBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Desc }
  data: {
    card: {
      id: string
      desc: string
    }
  }
}

interface UpdateCardList extends ActionBase {
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
  return model.Recipe(db).create.one(
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
}

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
    (action: CreateCard) => handleCreateCard(action, db)
  )(action)
