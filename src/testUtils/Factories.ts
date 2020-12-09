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
    const recipe = Card.create()

    return {
      ...recipe,
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

class Tag {
  static createWithData(data: { id: string; name: string }): Data.Tag {
    return data as Data.Tag
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
    const recipe = RecipeCard.create()

    return {
      ...recipe,
      ...data,
    }
  }
}

export default {
  schema: {
    Trello: { Label, Attachment, Card, CardDetails },
    Data: { Tag, RecipeCard },
  },
}
