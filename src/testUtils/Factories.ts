/* istanbul ignore file */

import * as Data from '../schema/data'
import * as Trello from '../schema/trello'
import * as Actions from '../lib/handleAction'

interface AttachmentProps {
  id?: string
  edgeColor?: string
  url?: string
  name?: string
  previews?: Array<Trello.AttachmentPreview>
}

class Attachment {
  static create(): Trello.Attachment {
    return {
      id: '1',
      name: '[published]name',
      edgeColor: 'color',
      url: 'url',
      previews: [
        {
          height: 1,
          width: 1,
          url: 'url1',
        },
        {
          height: 10,
          width: 10,
          url: 'url10',
        },
        {
          height: 100,
          width: 100,
          url: 'url100',
        },
      ],
    }
  }

  static createWithId(id: string): Trello.Attachment {
    const img = Attachment.create()
    img.id = id

    return img
  }

  static createWithData(data: AttachmentProps): Trello.Attachment {
    const img = Attachment.create()

    return {
      ...img,
      ...data,
    }
  }
}

interface CardProps {
  id?: string
  name?: string
  shortLink?: string
  labels?: Array<Trello.Label>
  idAttachmentCover?: string | null
  idList?: string
}

class Card {
  static create(): Trello.Card {
    return {
      id: 'id',
      name: 'one',
      shortLink: 'https://a-link',
      idAttachmentCover: 'img',
      idList: 'list',
      idLabels: ['aTagId', 'anotherTagId'],
    }
  }

  static createWithProperties(data: CardProps): Trello.Card {
    const defaultValues = Card.create()

    return {
      ...defaultValues,
      ...data,
    }
  }
}

class CardDetails {
  static create(): Trello.CardDetails {
    return { id: 'id', desc: 'a description' }
  }
}

class Label {
  static createWithData(data: { id: string; name: string }): Trello.Label {
    return data as Trello.Label
  }
}

interface TagProps {
  id?: string
  name?: string
  color?: string
  idBoard?: string
}

class Tag {
  static createWithData(data: { id: string; name: string }): Data.Tag {
    return data as Data.Tag
  }

  static create(): Data.Tag {
    return {
      id: 'id',
      name: 'name',
      color: 'color',
      idBoard: 'board',
    }
  }

  static createWithProperties(data: TagProps): Data.Tag {
    const defaultValues = Tag.create()

    return {
      ...defaultValues,
      ...data,
    }
  }
}

interface RecipeCardProps {
  id?: string
  name?: string
  shortLink?: string
  tags?: Array<string>
  idAttachmentCover?: string | null
  idList?: string
}

class RecipeCard {
  static create(): Data.RecipeCard {
    return {
      id: 'recipeId',
      name: 'recipeName',
      tags: ['aTagId', 'anotherTagId'],
    } as Data.RecipeCard
  }

  static createWithProperties(data: RecipeCardProps): Data.RecipeCard {
    const defaultValues = RecipeCard.create()

    return {
      ...defaultValues,
      ...data,
    }
  }
}

interface RecipeDetailsProps {
  id?: string
  desc?: string
  images?: Array<Data.Image>
}

class RecipeDetails {
  static create(): Data.RecipeDetails {
    return {
      id: 'recipeId',
      desc: 'description',
      images: [],
    }
  }

  static createWithProperties(data: RecipeDetailsProps): Data.RecipeDetails {
    const defaultValues = RecipeDetails.create()

    return {
      ...defaultValues,
      ...data,
    }
  }
}

interface ImageProps {
  id?: string
  name?: string
  url?: string
  edgeColor?: string
  scaled?: Array<Data.ScaledImage>
}

class Image {
  static create(): Data.Image {
    return {
      id: 'id',
      name: 'name',
      url: 'url',
      edgeColor: 'color',
      scaled: [],
    }
  }

  static createWithProperties(data: ImageProps): Data.Image {
    const defaultValues = Image.create()

    return {
      ...defaultValues,
      ...data,
    }
  }
}

interface UpdateCardNameProps {
  id?: string
  name?: string
}

class UpdateCardName {
  static create(): Actions.UpdateCardName {
    return {
      type: Actions.ActionType.UpdateCard,
      display: { translationKey: Actions.UpdateCardType.Name },
      data: {
        card: {
          id: 'id',
          name: 'name',
        },
      },
    }
  }

  static createWithProperties(
    data: UpdateCardNameProps
  ): Actions.UpdateCardName {
    const defaultValues = UpdateCardName.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data,
        },
      },
    }
  }
}

interface UpdateCardDescProps {
  id?: string
  desc?: string
}

class UpdateCardDesc {
  static create(): Actions.UpdateCardDesc {
    return {
      type: Actions.ActionType.UpdateCard,
      display: { translationKey: Actions.UpdateCardType.Desc },
      data: {
        card: {
          id: 'id',
          desc: 'desc',
        },
      },
    }
  }

  static createWithProperties(
    data: UpdateCardDescProps
  ): Actions.UpdateCardDesc {
    const defaultValues = UpdateCardDesc.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data,
        },
      },
    }
  }
}

interface UpdateCardListProps {
  id?: string
  idList?: string
}

class UpdateCardList {
  static create(): Actions.UpdateCardList {
    return {
      type: Actions.ActionType.UpdateCard,
      display: { translationKey: Actions.UpdateCardType.List },
      data: {
        card: {
          id: 'id',
          idList: 'list',
        },
      },
    }
  }

  static createWithProperties(
    data: UpdateCardListProps
  ): Actions.UpdateCardList {
    const defaultValues = UpdateCardList.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data,
        },
      },
    }
  }
}

interface RemoveLabelFromCardProps {
  card?: { id: string }
  label?: {
    id?: string
    name?: string
  }
}

class RemoveLabelFromCard {
  static create(): Actions.RemoveLabelFromCard {
    return {
      type: Actions.ActionType.RemoveLabelFromCard,
      data: {
        card: {
          id: 'id',
        },
        label: Label.createWithData({ id: 'id', name: 'name' }),
      },
    }
  }

  static createWithProperties(
    data: RemoveLabelFromCardProps
  ): Actions.RemoveLabelFromCard {
    const defaultValues = RemoveLabelFromCard.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data.card,
        },
        label: {
          ...defaultValues.data.label,
          ...data.label,
        },
      },
    }
  }
}

interface AddLabelToCardProps {
  card?: { id: string }
  label?: {
    id?: string
    name?: string
  }
}

class AddLabelToCard {
  static create(): Actions.AddLabelToCard {
    return {
      ...RemoveLabelFromCard.create(),
      type: Actions.ActionType.AddLabelToCard,
    }
  }

  static createWithProperties(
    data: AddLabelToCardProps
  ): Actions.AddLabelToCard {
    const defaultValues = AddLabelToCard.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data.card,
        },
        label: {
          ...defaultValues.data.label,
          ...data.label,
        },
      },
    }
  }
}

interface CreateCardProps {
  card: {
    id?: string
    name?: string
    shortLink?: string
  }
}

class CreateCard {
  static create(): Actions.CreateCard {
    return {
      type: Actions.ActionType.CreateCard,
      data: {
        card: {
          id: 'id',
          name: 'name',
          shortLink: 'shortLink',
        },
      },
    }
  }

  static createWithProperties(data: CreateCardProps): Actions.CreateCard {
    const defaultValues = CreateCard.create()

    return {
      ...defaultValues,
      data: {
        card: {
          ...defaultValues.data.card,
          ...data.card,
        },
      },
    }
  }
}

class DeleteCard {
  static create(): Actions.DeleteCard {
    return {
      type: Actions.ActionType.DeleteCard,
      data: {
        card: {
          id: 'id',
        },
      },
    }
  }

  static createWithId(id: string): Actions.DeleteCard {
    const defaultValues = DeleteCard.create()

    return {
      ...defaultValues,
      data: { card: { id } },
    }
  }
}

interface AddAttachmentToCardProps {
  card?: { id?: string }
  attachment?: {
    id?: string
    name?: string
    url?: string
  }
}

class AddAttachmentToCard {
  static create(): Actions.AddAttachmentToCard {
    return {
      type: Actions.ActionType.AddAttachmentToCard,
      data: {
        card: { id: 'id' },
        attachment: {
          id: 'id',
          name: 'name',
          url: 'url',
        },
      },
    }
  }

  static createWithProperties(
    data: AddAttachmentToCardProps
  ): Actions.AddAttachmentToCard {
    const defaultValues = AddAttachmentToCard.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data.card,
        },
        attachment: {
          ...defaultValues.data.attachment,
          ...data.attachment,
        },
      },
    }
  }
}

interface DeleteAttachmentFromCardProps {
  card?: { id?: string }
  attachment?: { id?: string }
}

class DeleteAttachmentFromCard {
  static create(): Actions.DeleteAttachmentFromCard {
    return {
      type: Actions.ActionType.DeleteAttachmentFromCard,
      data: {
        card: { id: 'id' },
        attachment: { id: 'id' },
      },
    }
  }

  static createWithProperties(
    data: DeleteAttachmentFromCardProps
  ): Actions.DeleteAttachmentFromCard {
    const defaultValues = DeleteAttachmentFromCard.create()

    return {
      ...defaultValues,
      data: {
        ...defaultValues.data,
        card: {
          ...defaultValues.data.card,
          ...data.card,
        },
        attachment: {
          ...defaultValues.data.attachment,
          ...data.attachment,
        },
      },
    }
  }
}

interface CreateLabelProps {
  label?: {
    id?: string
    name?: string
    color?: string
  }
  board?: { id?: string }
}

class CreateLabel {
  static create(): Actions.CreateLabel {
    return {
      type: Actions.ActionType.CreateLabel,
      data: {
        label: {
          id: 'id',
          name: 'name',
          color: 'color',
        },
        board: { id: 'board' },
      },
    }
  }

  static createWithProperties(data: CreateLabelProps): Actions.CreateLabel {
    const defaultValues = CreateLabel.create()

    return {
      ...defaultValues,
      data: {
        label: {
          ...defaultValues.data.label,
          ...data.label,
        },
        board: {
          ...defaultValues.data.board,
          ...data.board,
        },
      },
    }
  }
}

interface UpdateLabelProps {
  label?: {
    id?: string
    name?: string
    color?: string
  }
  board?: { id?: string }
}

class UpdateLabel {
  static create(): Actions.UpdateLabel {
    return {
      type: Actions.ActionType.UpdateLabel,
      data: {
        label: {
          id: 'id',
          name: 'name',
          color: 'color',
        },
        board: { id: 'board' },
      },
    }
  }

  static createWithProperties(data: UpdateLabelProps): Actions.UpdateLabel {
    const defaultValues = UpdateLabel.create()

    return {
      ...defaultValues,
      data: {
        label: {
          ...defaultValues.data.label,
          ...data.label,
        },
        board: {
          ...defaultValues.data.board,
          ...data.board,
        },
      },
    }
  }
}

export default {
  schema: {
    Trello: { Label, Attachment, Card, CardDetails },
    Data: { Tag, Image, RecipeCard, RecipeDetails },
  },
  handleAction: {
    UpdateCardName,
    UpdateCardDesc,
    UpdateCardList,
    RemoveLabelFromCard,
    AddLabelToCard,
    CreateCard,
    DeleteCard,
    AddAttachmentToCard,
    DeleteAttachmentFromCard,
    CreateLabel,
    UpdateLabel,
  },
}
