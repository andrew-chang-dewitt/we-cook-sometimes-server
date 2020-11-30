import 'mocha'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import Factories from '../testUtils/Factories'

chai.use(chaiAsPromised)
const expect = chai.expect

import { Tag } from '../schema/data'
import { Attachment } from '../schema/trello'
import fetch from './fetch'

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

  it('wraps fetch errors from the Trello API in the Err Result type', async () => {
    server.use(
      rest.get(root + board + '/cards', (_, res, ctx) => res(ctx.status(500)))
    )

    expect((await fetch.recipes()).unwrap).to.throw(/500/i)
  })

  it('tags() returns a list of labels for the board', async () => {
    const labels = [('a label' as any) as Tag]
    server.use(
      rest.get(root + board + '/labels', (_, res, ctx) => res(ctx.json(labels)))
    )

    expect((await fetch.tags()).unwrap()).to.deep.equal(labels)
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

      expect(result.unwrap().name).to.equal('a name')
    })

    it("returns an Error if isn't marked [published]", async () => {
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

      expect(result.unwrap).to.throw(/not.*published/i)
    })

    it('identifies unknown errors thrown while checking image', async () => {
      const img = {
        id: 'missing information',
      } as Attachment

      server.use(
        rest.get(root + '/card/1/attachments/1', (_, res, ctx) =>
          res(ctx.json(img))
        )
      )

      const result = await fetch.image('1', '1')

      expect(result.unwrap).to.throw(/unknown error/i)
    })
  })

  describe('recipes()', () => {
    const card1 = Factories.schema.Trello.Card.createWithProperties({
      id: 'recipe1',
      idAttachmentCover: 'cover1',
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
      idAttachmentCover: 'cover2',
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

    const cover1 = Factories.schema.Trello.Attachment.createWithData({
      id: 'cover1',
    })
    const cover2 = Factories.schema.Trello.Attachment.createWithData({
      id: 'cover2',
    })

    beforeEach(() => {
      server.use(
        rest.get(root + board + '/cards', (_, res, ctx) =>
          res(ctx.json([card1, card2, card3]))
        ),
        rest.get(root + '/card/recipe1/attachments/cover1', (_, res, ctx) =>
          res(ctx.json(cover1))
        ),
        rest.get(root + '/card/recipe2/attachments/cover2', (_, res, ctx) =>
          res(ctx.json(cover2))
        )
      )
    })

    it('returns an array of recipes', async () => {
      const result = (await fetch.recipes()).unwrap() as any[]

      expect(result[0].id).to.equal('recipe1')
      expect(result[1].id).to.equal('recipe2')
      expect(result[2].id).to.equal('recipe3')
    })

    it('each recipe has a cover image that can be null', async () => {
      const result = (await fetch.recipes()).unwrap() as any[]

      expect(result[0].cover).to.haveOwnProperty('id').that.equals('cover1')
      expect(result[1].cover).to.haveOwnProperty('id').that.equals('cover2')
      expect(result[2].cover).to.be.null
    })

    it('replaces unpublished cover images with null value', async () => {
      const card = Factories.schema.Trello.Card.createWithProperties({
        id: 'recipe',
        idAttachmentCover: 'cover',
      })
      const unpublished = Factories.schema.Trello.Attachment.createWithData({
        id: 'cover',
        name: 'unpublished',
      })

      server.use(
        rest.get(root + board + '/cards', (_, res, ctx) =>
          res(ctx.json([card]))
        ),
        rest.get(root + '/card/recipe/attachments/cover', (_, res, ctx) =>
          res(ctx.json(unpublished))
        )
      )

      expect((await fetch.recipes()).unwrap()[0].cover).to.be.null
    })

    it('wraps unexpected errors while getting cover images', async () => {
      const card = Factories.schema.Trello.Card.createWithProperties({
        id: 'recipe',
        idAttachmentCover: 'cover',
      })

      server.use(
        rest.get(root + board + '/cards', (_, res, ctx) =>
          res(ctx.json([card]))
        ),
        rest.get(root + '/card/recipe/attachments/cover', (_, res, ctx) =>
          res(ctx.status(500))
        )
      )

      expect((await fetch.recipes()).unwrap).to.throw(/500/)
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

  // describe('search()', () => {
  //   it('returns a list of recipes matching the given query', async () => {
  //     server.use(
  //       rest.get(root + `/search`, (_, res, ctx) =>
  //         res(ctx.json({ cards: [{ name: 'found me' } as Card] }))
  //       )
  //     )

  //     const result = (await fetch.search('a query')).unwrap() as any

  //     expect(result[0].name).to.equal('found me')
  //   })
  // })
})
