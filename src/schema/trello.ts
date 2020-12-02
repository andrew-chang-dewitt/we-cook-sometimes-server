export interface Label {
  id: string
  idBoard: string
  name: string
  color: string
}

export interface AttachmentPreview {
  url: string
  height: number
  width: number
}

export interface Attachment {
  id: string
  edgeColor: string
  url: string
  name: string
  previews: Array<AttachmentPreview>
}

export interface Card {
  id: string
  name: string
  shortLink: string
  labels: Array<Label>
  idAttachmentCover: string | null
  idList: string
}

export interface CardDetails {
  id: string
  desc: string
}
