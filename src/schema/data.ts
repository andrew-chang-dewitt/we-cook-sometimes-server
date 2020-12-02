export interface Tag {
  id: string
  idBoard: string
  name: string
  color: string
}

export interface ScaledImage {
  url: string
  height: number
  width: number
}

export interface Image {
  id: string
  edgeColor: string
  url: string
  name: string
  scaled: Array<ScaledImage>
}

export interface RecipeCard {
  id: string
  name: string
  shortLink: string
  tags: Array<Tag>
  cover: Image | null
  idList: string
}

export interface RecipeDetails {
  id: string
  desc: string
  images: Array<Image>
}
