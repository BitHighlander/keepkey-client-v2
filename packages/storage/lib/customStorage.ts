import { v4 as uuidv4 } from 'uuid';
import { BaseStorage, createStorage, StorageType } from './base';

type ApiKeyStorage = BaseStorage<string> & {
  saveApiKey: (apiKey: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
};

const apiKeyStorage = createStorage<string>('keepkey-api-key', '', {
  storageType: StorageType.Local, // You can change this to another type if needed
  liveUpdate: true,
});

export const keepKeyApiKeyStorage: ApiKeyStorage = {
  ...apiKeyStorage,
  saveApiKey: async (apiKey: string) => {
    await apiKeyStorage.set(() => apiKey);
  },
  getApiKey: async () => {
    return await apiKeyStorage.get();
  },
};

type EventsStorage = BaseStorage<any[]> & {
  addEvent: (event: any) => Promise<void>;
  getEvents: () => Promise<any[] | null>;
  getEventById: (id: string) => Promise<any | null>;
  removeEventById: (id: string) => Promise<void>;
  clearEvents: () => Promise<void>;
};

const eventsStorage = createStorage<any[]>('keepkey-events', [], {
  storageType: StorageType.Local, // You can change this to another type if needed
  liveUpdate: true,
});

export const keepKeyEventsStorage: EventsStorage = {
  ...eventsStorage,
  addEvent: async (event: any) => {
    const eventWithId = { ...event, id: uuidv4() };
    await eventsStorage.set(prev => [...prev, eventWithId]);
  },
  getEvents: async () => {
    return await eventsStorage.get();
  },
  getEventById: async (id: string) => {
    const events = await eventsStorage.get();
    return events ? events.find(event => event.id === id) : null;
  },
  removeEventById: async (id: string) => {
    const events = await eventsStorage.get();
    if (events) {
      await eventsStorage.set(events.filter(event => event.id !== id));
    }
  },
  clearEvents: async () => {
    await eventsStorage.set(() => []);
  },
};
