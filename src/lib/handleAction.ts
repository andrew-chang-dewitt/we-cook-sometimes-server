import { Db, FindAndModifyWriteOpResultObject } from 'mongodb'

import { Tag, RecipeCard, RecipeDetails } from '../schema/data'
import { Label } from '../schema/trello'
import { buildTag } from '../lib/translations'
import model from './database'

enum ActionType {
  UpdateCard = 'updateCard',
  RemoveLabelFromCard = 'removeLabelFromCard',
  AddLabelToCard = 'addLabelToCard',
}

class UnhandledActionError extends Error {}
class DocumentNotFoundError extends Error {}

type Action = UpdateCard | RemoveLabelFromCard | AddLabelToCard

const fold = <ReturnType extends any>(
  updateCard: (action: UpdateCard) => ReturnType,
  removeLabelFromCard: (action: RemoveLabelFromCard) => ReturnType,
  addLabelToCard: (action: AddLabelToCard) => ReturnType
) => (action: Action): ReturnType => {
  switch (action.type) {
    case ActionType.UpdateCard:
      return updateCard(action)
    case ActionType.RemoveLabelFromCard:
      return removeLabelFromCard(action)
    case ActionType.AddLabelToCard:
      return addLabelToCard(action)
    default:
      throw UnhandledActionError
  }
}

type UpdateCard = UpdateCardName | UpdateCardDesc

interface UpdateCardName extends ActionBase {
  type: ActionType.UpdateCard
  display: { translationKey: 'action_renamed_card' }
  data: {
    card: {
      id: string
      name: string
    }
  }
}

interface UpdateCardDesc extends ActionBase {
  type: ActionType.UpdateCard
  display: { translationKey: 'action_changed_description_of_card' }
  data: {
    card: {
      id: string
      desc: string
    }
  }
}

const isUpdateCardName = (update: UpdateCard): update is UpdateCardName =>
  update.display.translationKey === 'action_renamed_card'
const isUpdateCardDesc = (update: UpdateCard): update is UpdateCardDesc =>
  update.display.translationKey === 'action_changed_description_of_card'

interface RemoveLabelFromCard extends ActionBase {
  type: ActionType.RemoveLabelFromCard
  data: {
    card: {
      id: string
    }
    label: Label
  }
}

interface AddLabelToCard extends ActionBase {
  type: ActionType.AddLabelToCard
  data: {
    card: {
      id: string
    }
    label: Label
  }
}

interface ActionBase {
  data: {}
}

const handleUpdateCard = (
  action: UpdateCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>> => {
  const id = action.data.card.id

  // determine what changed & if it's RecipeCard or RecipeDetails
  // then make change in appropriate collection on DB
  if (isUpdateCardName(action))
    // RecipeCard, name changed
    // get current Recipe by action.data.card.id
    return (
      model
        .Recipe(db)
        .read.one(id)
        // then Update that Recipe in DB with new name
        .then((current) => {
          if (current)
            return model.Recipe(db).update.one(id, {
              ...current,
              name: action.data.card.name as string,
            })
          else throw DocumentNotFoundError
        })
    )
  else if (isUpdateCardDesc(action))
    // RecipeDetails, desc changed
    // get current Detail by action.data.card.id
    return (
      model
        .Detail(db)
        .read.one(id)
        // then Update that Detail in DB with new name
        .then((current) => {
          if (current)
            return model.Detail(db).update.one(id, {
              ...current,
              desc: action.data.card.desc as string,
            })
          else throw DocumentNotFoundError
        })
    )
  else throw UnhandledActionError
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
      throw DocumentNotFoundError
    })

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
      throw DocumentNotFoundError
    })

export default (
  action: Action,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>> =>
  fold(
    (action: UpdateCard) => handleUpdateCard(action, db),
    (action: RemoveLabelFromCard) => handleRemoveLabelFromCard(action, db),
    (action: AddLabelToCard) => handleAddLabelToCard(action, db)
  )(action)
