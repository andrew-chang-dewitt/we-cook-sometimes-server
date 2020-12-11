/* istanbul ignore file */

import {
  Db,
  FindAndModifyWriteOpResultObject,
  InsertOneWriteOpResult,
} from 'mongodb'

import { Tag, RecipeCard, RecipeDetails } from '../schema/data'
import { Label } from '../schema/trello'
import {
  actionUpdateCardName,
  actionUpdateCardDesc,
  actionUpdateCardList,
  actionRemoveLabelFromCard,
  actionAddLabelToCard,
  actionCreateCard,
  actionAddAttachmentToCard,
  actionDeleteAttachmentFromCard,
  actionCreateLabel,
  actionUpdateLabel,
} from '../lib/translations'
import model from './database'

import { ok, err, Result } from '../utils/Result'

export enum ActionType {
  UpdateCard = 'updateCard',
  RemoveLabelFromCard = 'removeLabelFromCard',
  AddLabelToCard = 'addLabelToCard',
  CreateCard = 'createCard',
  DeleteCard = 'deleteCard',
  AddAttachmentToCard = 'addAttachmentToCard',
  DeleteAttachmentFromCard = 'deleteAttachmentFromCard',
  CreateLabel = 'createLabel',
  DeleteLabel = 'deleteLabel',
  UpdateLabel = 'updateLabel',
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
  | CreateLabel
  | DeleteLabel
  | UpdateLabel

const fold = <ReturnType extends any>(
  updateCard: (action: UpdateCard) => ReturnType,
  removeLabelFromCard: (action: RemoveLabelFromCard) => ReturnType,
  addLabelToCard: (action: AddLabelToCard) => ReturnType,
  createCard: (action: CreateCard) => ReturnType,
  deleteCard: (action: DeleteCard) => ReturnType,
  addAttachmentToCard: (action: AddAttachmentToCard) => ReturnType,
  deleteAttachmentFromCard: (action: DeleteAttachmentFromCard) => ReturnType,
  createLabel: (action: CreateLabel) => ReturnType,
  deleteLabel: (action: DeleteLabel) => ReturnType,
  updateLabel: (action: UpdateLabel) => ReturnType
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
    case ActionType.CreateLabel:
      return createLabel(action)
    case ActionType.DeleteLabel:
      return deleteLabel(action)
    case ActionType.UpdateLabel:
      return updateLabel(action)
    default:
      throw new UnhandledActionError()
  }
}

interface ActionBase {
  type: ActionType
}

interface CardBase extends ActionBase {
  data: {
    card: { id: string }
  }
}

type UpdateCard = UpdateCardName | UpdateCardDesc | UpdateCardList

export enum UpdateCardType {
  Name = 'action_renamed_card',
  Desc = 'action_changed_description_of_card',
  List = 'action_move_card_from_list_to_list',
}

interface UpdateCardBase extends CardBase {
  display: { translationKey: UpdateCardType }
}

export interface UpdateCardName extends UpdateCardBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Name }
  data: {
    card: {
      id: string
      name: string
    }
  }
}

export interface UpdateCardDesc extends UpdateCardBase {
  type: ActionType.UpdateCard
  display: { translationKey: UpdateCardType.Desc }
  data: {
    card: {
      id: string
      desc: string
    }
  }
}

export interface UpdateCardList extends UpdateCardBase {
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
        return model
          .Recipe(db)
          .update.one(
            action.data.card.id,
            actionUpdateCardName(current, action)
          )
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
        return model
          .Detail(db)
          .update.one(
            action.data.card.id,
            actionUpdateCardDesc(current, action)
          )
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
        return model
          .Recipe(db)
          .update.one(
            action.data.card.id,
            actionUpdateCardList(current, action)
          )
      else throw new DocumentNotFoundError()
    })

const handleUpdateCard = (
  action: UpdateCard,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<RecipeCard | RecipeDetails>> => {
  // determine what changed & if it's RecipeCard or RecipeDetails
  // then defer to handler to make change in appropriate collection on DB
  //
  // while this would be better as a switch statement (3+ conditions),
  // TS doesn't support nested tagged unions yet (see github issue #18758:
  // https://github.com/microsoft/TypeScript/issues/18758)
  if (isUpdateCardName(action)) return handleUpdateCardName(action, db)
  else if (isUpdateCardDesc(action)) return handleUpdateCardDesc(action, db)
  else if (isUpdateCardList(action)) return handleUpdateCardList(action, db)
  else throw new UnhandledActionError()
}

export interface RemoveLabelFromCard extends CardBase {
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
        // & update the old model of the Recipe with the newly modified model
        return model
          .Recipe(db)
          .update.one(
            action.data.card.id,
            actionRemoveLabelFromCard(current, action)
          )
      }

      throw new DocumentNotFoundError()
    })

export interface AddLabelToCard extends CardBase {
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
        return model
          .Recipe(db)
          .update.one(
            action.data.card.id,
            actionAddLabelToCard(current, action)
          )

      throw new DocumentNotFoundError()
    })

export interface CreateCard extends CardBase {
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
): Promise<InsertOneWriteOpResult<any>> =>
  // build a new RecipeCard from Action & push to DB
  model
    .Recipe(db)
    .create.one(actionCreateCard.card(action))
    .then((_) => model.Detail(db).create.one(actionCreateCard.details(action)))

export interface DeleteCard extends CardBase {
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

export interface AddAttachmentToCard extends CardBase {
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
  // just because an attachment is added to the card, doesn't mean
  // it's published. This function checks for published status in the
  // name, then strips the published indicator before returning the
  // clean name.
  const checkPublished = (name: string): Result<string, Error> => {
    const split = name.split(']')
    const first = split[0]

    if (first === '[published') {
      split.splice(0, 1)

      return ok(split.join(''))
    } else return err(Error('Image not published'))
  }

  return (
    // get current Detail by action.data.card.id
    model
      .Detail(db)
      .read.one(action.data.card.id)
      // then Update that Detail in DB with new name
      .then((current) => {
        if (current) {
          return model.Detail(db).update.one(
            action.data.card.id,
            actionAddAttachmentToCard(current, {
              ...action,
              data: {
                ...action.data,
                attachment: {
                  ...action.data.attachment,
                  // check if attachment is published before translating
                  // by replacing action.data.attachment.name with Ok
                  // value returned by checkPublished
                  name: checkPublished(action.data.attachment.name).unwrap(),
                },
              },
            })
          )
        } else throw new DocumentNotFoundError()
      })
  )
}

export interface DeleteAttachmentFromCard extends CardBase {
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
        return model
          .Detail(db)
          .update.one(
            action.data.card.id,
            actionDeleteAttachmentFromCard(current, action)
          )
      } else throw new DocumentNotFoundError()
    })

export interface CreateLabel extends ActionBase {
  type: ActionType.CreateLabel
  data: {
    label: {
      id: string
      name: string
      color?: string
    }
    board: { id: string }
  }
}

const handleCreateLabel = (
  action: CreateLabel,
  db: Db
): Promise<InsertOneWriteOpResult<any>> =>
  // build a new RecipeCard from Action & push to DB
  model.Tag(db).create.one(actionCreateLabel(action))

export interface DeleteLabel extends ActionBase {
  type: ActionType.DeleteLabel
  data: {
    label: { id: string }
  }
}

const handleDeleteLabel = (
  action: DeleteLabel,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<Tag>> =>
  model.Tag(db).deleteDoc.one(action.data.label.id)

export interface UpdateLabel extends ActionBase {
  type: ActionType.UpdateLabel
  data: {
    label: {
      id: string
      name: string
      color?: string
    }
    board: { id: string }
  }
}

const handleUpdateLabel = (
  action: UpdateLabel,
  db: Db
): Promise<FindAndModifyWriteOpResultObject<Tag>> =>
  model
    .Tag(db)
    .read.one(action.data.label.id)
    .then((current) => {
      if (current)
        return model
          .Tag(db)
          .update.one(action.data.label.id, actionUpdateLabel(current, action))
      else throw new DocumentNotFoundError()
    })

export default (action: Action, db: Db) =>
  fold<
    Promise<
      | FindAndModifyWriteOpResultObject<Tag | RecipeCard | RecipeDetails>
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
      handleDeleteAttachmentFromCard(action, db),
    (action: CreateLabel) => handleCreateLabel(action, db),
    (action: DeleteLabel) => handleDeleteLabel(action, db),
    (action: UpdateLabel) => handleUpdateLabel(action, db)
  )(action)
