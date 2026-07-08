import { RequestHandler } from 'express';
import { verifyToken, TokenPayload } from '../auth/jwt';
import { setActorUserId } from '../context/requestContext';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/** Rejects any request lacking a valid `Authorization: Bearer <jwt>`. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    setActorUserId(req.user.sub);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
