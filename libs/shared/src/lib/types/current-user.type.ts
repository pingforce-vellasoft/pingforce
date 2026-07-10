export interface CurrentUserContext {
  userId: string;
  email?: string;
  [key: string]: any;
}
