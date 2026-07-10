/**
 * Extends the Express Request type to include our custom `requestId` property,
 * injected by the RequestIdMiddleware. This avoids implicit `any` indexing
 * under TypeScript strict mode.
 */
declare namespace Express {
  interface Request {
    requestId?: string;
  }
}
