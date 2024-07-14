import { createStorage, StorageType, type BaseStorage, SessionAccessLevel } from './base';
import { keepKeyApiKeyStorage, requestStorage, approvalStorage, completedStorage } from './customStorage';

export {
  keepKeyApiKeyStorage,
  requestStorage,
  approvalStorage,
  completedStorage,
  createStorage,
  StorageType,
  SessionAccessLevel,
};
export type { BaseStorage };
