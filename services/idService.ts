import type { User } from '../types';

interface UniqueIdInput {
  storeId?: string;
  user?: User | null;
  prefix?: string;
  now?: Date;
}

export const generateScopedUniqueId = ({
  storeId,
  user,
  prefix = '',
  now = new Date(),
}: UniqueIdInput) => {
  const storeIdPart = storeId ? storeId.replace(/[^a-zA-Z0-9]/g, '') : 'LOC';
  const timestamp = now.getTime().toString();
  const userSuffix = user?.id ? user.id.slice(-3).toUpperCase() : 'SYS';
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${storeIdPart}-${prefix}${timestamp}-${userSuffix}${random}`;
};
