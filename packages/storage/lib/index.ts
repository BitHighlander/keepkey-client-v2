import { createStorage, StorageType, type BaseStorage, SessionAccessLevel } from './base';
import {
  keepKeyApiKeyStorage,
  requestStorage,
  approvalStorage,
  completedStorage,
  assetContextStorage,
} from './customStorage';

export {
  keepKeyApiKeyStorage,
  requestStorage,
  approvalStorage,
  completedStorage,
  createStorage,
  StorageType,
  SessionAccessLevel,
  assetContextStorage,
};
export type { BaseStorage };
