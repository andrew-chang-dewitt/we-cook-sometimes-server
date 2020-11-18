export interface Tag {
  id: string
  idBoard: string
  name: string
  color: string
}

export interface Image {
  id: string
  edgeColor: string
  url: string
  name: string
}

export interface RecipeCard {
  id: string
  name: string
  shortLink: string
  tags: Array<Tag>
  idAttachmentCover: string | null
  idList: string
}

export interface RecipeDetails {
  id: string
  desc: string
  images: Array<Image>
}
