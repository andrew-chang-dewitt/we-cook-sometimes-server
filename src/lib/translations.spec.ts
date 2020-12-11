import 'mocha'
import { expect } from 'chai'

import Factories from '../testUtils/Factories'

import * as Trello from '../schema/trello'
import * as Data from '../schema/data'
import {
  buildTag,
  buildImage,
  buildRecipeCard,
  buildRecipeDetails,
  actionUpdateCardName,
  actionUpdateCardDesc,
  actionUpdateCardList,
  actionRemoveLabelFromCard,
  actionAddLabelToCard,
  actionCreateCard,
  actionDeleteAttachmentFromCard,
  actionAddAttachmentToCard,
  actionCreateLabel,
  actionUpdateLabel,
} from './translations'

describe('translations', () => {
  describe('buildTag()', () => {
    it('translates a given Trello Label to a Tag', () => {
      const label = Factories.schema.Trello.Label.createWithData({
        id: 'a label',
        name: 'a name',
      })

      const tag = buildTag(label)

      expect(tag.id).to.equal('a label')
      expect(tag.name).to.equal('a name')
    })
  })

  describe('buildImage()', () => {
    it('contains an array of scaled versions of the image', () => {
      const attachment = Factories.schema.Trello.Attachment.createWithData({
        previews: [
          ('scaled1' as unknown) as Trello.AttachmentPreview,
          ('scaled2' as unknown) as Trello.AttachmentPreview,
        ],
      })

      expect(buildImage(attachment).scaled).to.deep.equal(attachment.previews)
    })

    it('all other properties are the same between an attachment and an image', () => {
      const attachment = Factories.schema.Trello.Attachment.create()
      const image = buildImage(attachment)

      delete attachment.previews
      delete image.scaled

      expect(image).to.deep.equal(attachment)
    })
  })

  describe('buildRecipeCard()', () => {
    it('combines a given cover Image & Card', () => {
      const image = Factories.schema.Trello.Attachment.create()
      const card = Factories.schema.Trello.Card.create()

      const recipeCard = buildRecipeCard(card, image)

      expect(recipeCard.cover?.id).to.equal(image.id)
      expect(recipeCard.id).to.equal(card.id)
    })
  })

  describe('buildRecipeDetails()', () => {
    it('combines given details & images', () => {
      const images = [
        Factories.schema.Trello.Attachment.create(),
        Factories.schema.Trello.Attachment.create(),
      ]
      const details = Factories.schema.Trello.CardDetails.create()

      const recipeDetails = buildRecipeDetails(details, images)

      expect(recipeDetails.images[0].id).to.equal(images[0].id)
      expect(recipeDetails.images[1].id).to.equal(images[1].id)
      expect(recipeDetails.desc).to.equal(details.desc)
    })
  })

  describe('actionUpdateCardName()', () => {
    it('builds a new card from a given action', () => {
      const oldCard = Factories.schema.Data.RecipeCard.createWithProperties({
        name: 'old name',
      })
      const action = Factories.handleAction.UpdateCardName.createWithProperties(
        {
          name: 'new name',
        }
      )

      expect(actionUpdateCardName(oldCard, action).name).to.equal('new name')
    })
  })

  describe('actionUpdateCardDesc()', () => {
    it('builds a new card from a given action', () => {
      const oldCard = Factories.schema.Data.RecipeDetails.createWithProperties({
        desc: 'old',
      })
      const action = Factories.handleAction.UpdateCardDesc.createWithProperties(
        {
          desc: 'new',
        }
      )

      expect(actionUpdateCardDesc(oldCard, action).desc).to.equal('new')
    })
  })

  describe('actionUpdateCardList()', () => {
    it('builds a new card from a given action', () => {
      const oldCard = Factories.schema.Data.RecipeCard.createWithProperties({
        idList: 'old',
      })
      const action = Factories.handleAction.UpdateCardList.createWithProperties(
        {
          idList: 'new',
        }
      )

      expect(actionUpdateCardList(oldCard, action).idList).to.equal('new')
    })
  })

  describe('actionRemoveLabelFromCard()', () => {
    it('builds a new card from a given action', () => {
      const oldCard = Factories.schema.Data.RecipeCard.createWithProperties({
        tags: ['old', 'new'],
      })
      const action = Factories.handleAction.RemoveLabelFromCard.createWithProperties(
        {
          label: { id: 'new' },
        }
      )

      expect(actionRemoveLabelFromCard(oldCard, action).tags).to.not.contain(
        'new'
      )
    })

    it("doesn't change anything if the tag isn't on the card", () => {
      const oldCard = Factories.schema.Data.RecipeCard.createWithProperties({
        tags: ['old'],
      })
      const action = Factories.handleAction.RemoveLabelFromCard.createWithProperties(
        {
          label: { id: 'new' },
        }
      )

      expect(actionRemoveLabelFromCard(oldCard, action).tags).to.deep.equal([
        'old',
      ])
    })
  })

  describe('actionAddLabelToCard()', () => {
    it('builds a new card from a given action', () => {
      const oldCard = Factories.schema.Data.RecipeCard.createWithProperties({
        tags: ['old'],
      })
      const action = Factories.handleAction.AddLabelToCard.createWithProperties(
        {
          label: { id: 'new' },
        }
      )

      expect(actionAddLabelToCard(oldCard, action).tags).to.deep.equal([
        'old',
        'new',
      ])
    })
  })

  describe('actionCreateCard()', () => {
    const action = Factories.handleAction.CreateCard.createWithProperties({
      card: {
        id: 'new card',
        name: 'name',
        shortLink: 'link',
      },
    })

    it('builds a new card from a given action', () => {
      expect(actionCreateCard.card(action)).to.deep.equal({
        id: 'new card',
        name: 'name',
        shortLink: 'link',
        idList: '',
        tags: [],
        cover: null,
      })
    })

    it('as well as a matching details object', () => {
      expect(actionCreateCard.details(action)).to.deep.equal({
        id: 'new card',
        desc: '',
        images: [],
      })
    })
  })

  describe('actionDeleteAttachmentFromCard()', () => {
    it('builds a new details from a given action', () => {
      const img1 = Factories.schema.Data.Image.createWithProperties({
        id: 'img1',
      })
      const img2 = Factories.schema.Data.Image.createWithProperties({
        id: 'img2',
      })
      const oldDetails = Factories.schema.Data.RecipeDetails.createWithProperties(
        {
          images: [img1, img2],
        }
      )
      const action = Factories.handleAction.DeleteAttachmentFromCard.createWithProperties(
        {
          attachment: { id: 'img1' },
        }
      )

      expect(
        actionDeleteAttachmentFromCard(oldDetails, action).images
      ).to.not.contain(img1)
    })

    it("doesn't change anything if the attachment isn't on details", () => {
      const img1 = Factories.schema.Data.Image.createWithProperties({
        id: 'img1',
      })
      const oldDetails = Factories.schema.Data.RecipeDetails.createWithProperties(
        {
          images: [img1],
        }
      )
      const action = Factories.handleAction.DeleteAttachmentFromCard.createWithProperties(
        {
          attachment: { id: 'img2' },
        }
      )

      expect(
        actionDeleteAttachmentFromCard(oldDetails, action).images
      ).to.deep.equal([img1])
    })
  })

  describe('actionAttachmentToCard()', () => {
    it('builds a new details from a given action', () => {
      const oldDetails = Factories.schema.Data.RecipeDetails.createWithProperties(
        {
          images: [],
        }
      )
      const action = Factories.handleAction.AddAttachmentToCard.createWithProperties(
        {
          attachment: { id: 'new' },
        }
      )

      expect(
        actionAddAttachmentToCard(oldDetails, action).images
      ).to.satisfy((arr: Array<Data.Image>) =>
        arr.some((el) => el.id === 'new')
      )
    })
  })

  describe('actionCreateLabel()', () => {
    it('builds a new tag from a given action', () => {
      const action = Factories.handleAction.CreateLabel.createWithProperties({
        label: {
          id: 'new label',
          name: 'name',
          color: 'color',
        },
        board: {
          id: 'board',
        },
      })

      expect(actionCreateLabel(action)).to.deep.equal({
        id: 'new label',
        name: 'name',
        color: 'color',
        idBoard: 'board',
      })
    })

    it('can create a Tag with no color', () => {
      const action = Factories.handleAction.CreateLabel.createWithProperties({
        label: {
          id: 'new label',
          name: 'name',
        },
        board: {
          id: 'board',
        },
      })

      delete action.data.label.color

      expect(actionCreateLabel(action)).to.deep.equal({
        id: 'new label',
        name: 'name',
        color: null,
        idBoard: 'board',
      })
    })
  })

  describe('actionUpdateLabel()', () => {
    it('builds a new tag with an updated name from a given action', () => {
      const old = Factories.schema.Data.Tag.createWithData({
        id: 'id',
        name: 'old name',
      })
      const action = Factories.handleAction.UpdateLabel.createWithProperties({
        label: {
          name: 'new name',
        },
      })

      expect(actionUpdateLabel(old, action).name).to.equal('new name')
    })

    it("can also update a Tag's color", () => {
      const old = Factories.schema.Data.Tag.createWithProperties({
        color: 'old',
      })
      const action = Factories.handleAction.UpdateLabel.createWithProperties({
        label: {
          color: 'new',
        },
      })

      expect(actionUpdateLabel(old, action).color).to.equal('new')
    })
  })
})
