import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/** The acting user's id for the current request, if authenticated. */
export function getActorUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

/** Set the actor on the active store (called by requireAuth once the JWT is verified). */
export function setActorUserId(userId: string): void {
  const store = requestContext.getStore();
  if (store) store.userId = userId;
}
