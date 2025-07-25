export interface OAuthToken {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_token_expires_in: number
  token_type: string
  scope: string
}

export interface ListItem {
  text: string
  link?: string
}

export const viewAndEditPermissions = ['unauthorised', 'view', 'edit'] as const
export type ViewAndEditPermission = (typeof viewAndEditPermissions)[number]
