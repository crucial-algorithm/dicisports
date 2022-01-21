export type NonNullProperties<Type> = {
  [Key in keyof Type]-?: Exclude<Type[Key], null | undefined>
}

export type MemberProfile = {
  email: string
  name?: string
  avatar?: string
}

export type Await<Type> = Type extends Promise<infer Value>
  ? Await<Value>
  : Type

/** Kent C Dodds types copied when recreating login */

export type KCDSitemapEntry = {
  route: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0
}

export type KCDHandle = {
  /** this just allows us to identify routes more directly rather than relying on pathnames */
  id?: string
  /** this is here to allow us to disable scroll restoration until Remix gives us better control */
  restoreScroll?: false
  getSitemapEntries?: (
    request: Request
  ) =>
    | Promise<Array<KCDSitemapEntry | null> | null>
    | Array<KCDSitemapEntry | null>
    | null
}

export const AvailableLanguages: {
  pt: 'pt'
  en: 'en'
}

export type Language =
  typeof AvailableLanguages[keyof typeof AvailableLanguages]

// eslint-disable-next-line no-unused-vars
export type TranslationObject = { [K in Language]: string }
