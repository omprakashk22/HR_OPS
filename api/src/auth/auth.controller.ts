import { RequestHandler } from 'express';
import { loginSchema } from './auth.schemas';
import * as authService from './auth.service';

export const postLogin: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    res.json(await authService.login(input));
  } catch (err) {
    next(err);
  }
};

export const getMe: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.me(req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};
