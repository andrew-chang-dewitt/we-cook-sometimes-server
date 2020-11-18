import 'mocha'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import Factories from '../testUtils/Factories'

chai.use(chaiAsPromised)
const expect = chai.expect

import { Tag, Image } from '../schema/data'
import { Card } from '../schema/trello'
import fetch, { FetchError } from './fetch'

describe('lib/data/fetch', () => {
  const root = 'https://api.trello.com/1'
  const boardId = '5820f9c22043447d3f4fa857'
  const board = `/board/${boardId}`

  const server = setupServer()

  before(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
  })
  after(() => {
    server.close()
  })

  it('encapsulates fetch errors from the Trello API in the Err Result type', async () => {
    server.use(
      rest.get(root + board + '/cards', (_, res, ctx) => res(ctx.status(500)))
    )

    const result = await fetch.recipes()

    expect(result.unwrap).to.throw(FetchError, /500/i)
  })

  describe('image()', () => {
    const imgObj = Factories.schema.Trello.Attachment.create()
    imgObj.name = '[published]a name'

    beforeEach(() => {
      server.use(
        rest.get(root + '/card/1/attachments/1', (_, res, ctx) =>
          res(ctx.json(imgObj))
        )
      )
    })

    it('returns an Image object for a given recipe & image ID', async () => {
      const result = await fetch.image('1', '1')

      expect(result.unwrap()).to.deep.equal({
        url: 'url',
        id: imgObj.id,
        name: 'a name',
        edgeColor: imgObj.edgeColor,
      })
    })

    it("returns Result-wrapped FetchError if isn't marked [published]", async () => {
      const img = {
        ...imgObj,
        name: 'not published',
      }

      server.use(
        rest.get(root + '/card/1/attachments/1', (_, res, ctx) =>
          res(ctx.json(img))
        )
      )

      const result = await fetch.image('1', '1')

      expect(result.unwrap).to.throw(FetchError, /not.*published/i)
    })

    // it('identifies unknown errors thrown while checking image', async () => {
    //   const img = {
    //     id: 'missing information',
    //   } as ImageAPI

    //   server.use(
    //     rest.get(root + '/card/1/attachments/1', (_, res, ctx) =>
    //       res(ctx.json(img))
    //     )
    //   )

    //   const result = await fetch.image('1', '1')

    //   expect(result.unwrap).to.throw(FetchError, /unknown error/i)
    // })

    it('can return the smallest scaled image that is still >= the optionally given dimensions', async () => {
      const result = (
        await fetch.image('1', '1', { height: 9, width: 9 })
      ).unwrap<Image>()

      expect(result ? result.url : null).to.equal('url10')
    })

    it('only requires a min height or a width to be specified', async () => {
      const height = (await fetch.image('1', '1', { height: 100 })).unwrap<
        Image
      >()
      const width = (await fetch.image('1', '1', { width: 100 })).unwrap<
        Image
      >()

      expect(height ? height.url : null).to.equal('url100')
      expect(width ? width.url : null).to.equal('url100')
    })

    it('but at least one must be given, despite being optional on the MinDimensions interface', async () => {
      const result = await fetch.image('1', '1', {})

      expect(result.unwrap).to.throw(
        FetchError,
        'at least one property on minDimensions must be provided: {}'
      )
    })

    it('must be >= both, if two dimensions are given', async () => {
      const result = (
        await fetch.image('1', '1', { height: 1, width: 100 })
      ).unwrap<Image>()

      expect(result ? result.url : null).to.deep.equal('url100')
    })

    it("returns the largest available, if there isn't one any bigger", async () => {
      const result = (
        await fetch.image('1', '1', { height: 101, width: 101 })
      ).unwrap<Image>()

      expect(result ? result.url : null).to.deep.equal('url100')
    })
  })

  it('tags() returns a list of labels for the board', async () => {
    const labels = [('a label' as any) as Tag]
    server.use(
      rest.get(root + board + '/labels', (_, res, ctx) => res(ctx.json(labels)))
    )

    expect((await fetch.tags()).unwrap()).to.deep.equal(labels)
  })

  describe('recipes()', () => {
    const card1 = Factories.schema.Trello.Card.createWithProperties({
      id: 'recipe1',
      labels: [
        Factories.schema.Trello.Label.createWithData({
          id: 'labelCommon',
          name: 'common',
        }),
        Factories.schema.Trello.Label.createWithData({
          id: 'labelALabel',
          name: 'a label',
        }),
      ],
    })

    const card2 = Factories.schema.Trello.Card.createWithProperties({
      id: 'recipe2',
      labels: [
        Factories.schema.Trello.Label.createWithData({
          id: 'labelCommon',
          name: 'common',
        }),
        Factories.schema.Trello.Label.createWithData({
          id: 'labelPublished',
          name: 'published',
        }),
        Factories.schema.Trello.Label.createWithData({
          id: 'labelAUniqueLabel',
          name: 'a unique label',
        }),
      ],
    })

    const card3 = Factories.schema.Trello.Card.createWithProperties({
      id: 'recipe3',
      idAttachmentCover: null,
      labels: [
        Factories.schema.Trello.Label.createWithData({
          id: 'labelCommon',
          name: 'common',
        }),
        Factories.schema.Trello.Label.createWithData({
          id: 'labelPublished',
          name: 'published',
        }),
        Factories.schema.Trello.Label.createWithData({
          id: 'labelADifferentLabel',
          name: 'a different label',
        }),
      ],
    })

    beforeEach(() => {
      server.use(
        rest.get(root + board + '/cards', (_, res, ctx) =>
          res(ctx.json([card1, card2, card3]))
        )
      )
    })

    it('returns an array of recipes', async () => {
      const result = (await fetch.recipes()).unwrap() as any[]

      expect(result[0].id).to.equal('recipe1')
      expect(result[1].id).to.equal('recipe2')
      expect(result[2].id).to.equal('recipe3')
    })

    it('each recipe has a cover image ID that can be null', async () => {
      const result = (await fetch.recipes()).unwrap() as any[]

      expect(result[0].idAttachmentCover).to.equal('img')
      expect(result[1].idAttachmentCover).to.equal('img')
      expect(result[2].idAttachmentCover).to.be.null
    })
  })

  describe('details()', () => {
    const card = {
      id: '1',
      desc: 'description',
    }
    const images = [
      Factories.schema.Trello.Attachment.createWithData({ id: 'img1' }),
      Factories.schema.Trello.Attachment.createWithData({ id: 'img2' }),
    ]

    beforeEach(() => {
      server.use(
        rest.get(root + '/card/1', (_, res, ctx) => res(ctx.json(card)))
      )
      server.use(
        rest.get(root + '/card/1/attachments', (_, res, ctx) =>
          res(ctx.json(images))
        )
      )
    })

    it('returns the extra details for a given recipe', async () => {
      const result = (await fetch.details('1')).unwrap() as any

      expect(result.id).to.equal('1')
      expect(result.desc).to.equal('description')
      expect(result.images[0].id).to.equal('img1')
      expect(result.images[1].id).to.equal('img2')
    })

    it("filters out images that aren't marked published", async () => {
      const images = [
        Factories.schema.Trello.Attachment.createWithData({
          name: 'unpublished',
        }),
      ]

      server.use(
        rest.get(root + '/card/1/attachments', (_, res, ctx) =>
          res(ctx.json(images))
        )
      )

      const result = (await fetch.details('1')).unwrap() as any

      expect(result.images).to.have.lengthOf(0)
    })
  })

  describe('search()', () => {
    it('returns a list of recipes matching the given query', async () => {
      server.use(
        rest.get(root + `/search`, (_, res, ctx) =>
          res(ctx.json({ cards: [{ name: 'found me' } as Card] }))
        )
      )

      const result = (await fetch.search('a query')).unwrap() as any

      expect(result[0].name).to.equal('found me')
    })
  })
})
