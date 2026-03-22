import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload: {
  id: string;
  tenantId: string;
  role: string;
  email: string;
}): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
};
