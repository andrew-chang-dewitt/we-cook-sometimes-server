import 'mocha'
import { expect } from 'chai'

import Factories from '../testUtils/Factories'

import * as Trello from '../schema/trello'
import {
  buildTag,
  buildImage,
  buildRecipeCard,
  buildRecipeDetails,
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

      expect(recipeCard.cover.id).to.equal(image.id)
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
})
