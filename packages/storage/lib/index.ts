import { createStorage, StorageType, type BaseStorage, SessionAccessLevel } from './base';
import {
  keepKeyApiKeyStorage,
  pioneerKeyStorage,
  requestStorage,
  approvalStorage,
  completedStorage,
  assetContextStorage,
} from './customStorage';
import { chainIdStorage } from './providerStorage';

export {
  chainIdStorage,
  pioneerKeyStorage,
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
