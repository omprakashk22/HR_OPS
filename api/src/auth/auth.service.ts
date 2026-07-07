import { Role, User } from '@prisma/client';
import { findUserByEmail, findUserById } from './auth.repository';
import { verifyPassword } from './password';
import { signToken } from './jwt';
import { HttpError } from '../shared/httpError';
import { LoginInput } from './auth.schemas';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
  const user = await findUserByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function me(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return toPublicUser(user);
}
