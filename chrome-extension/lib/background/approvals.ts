import { JsonRpcProvider } from 'ethers';
import { approvalStorage, requestStorage } from '@chrome-extension-boilerplate/storage';
import { signMessage, signTransaction, signTypedData, sendTransaction } from './sign';
import { createProviderRpcError } from './methods';

const TAG = ' | APPROVALS | ';

type Event = {
  id: string;
  type: string;
  request: any;
  status: 'request' | 'approval' | 'completed';
  timestamp: string;
};

const processApprovedEvent = async (event: Event, KEEPKEY_SDK: any, ADDRESS: string) => {
  try {
    console.log(TAG, 'Processing approved event:', event);
    const provider = new JsonRpcProvider();

    switch (event.type) {
      case 'eth_sign':
        await signMessage(event.request, KEEPKEY_SDK);
        break;
      case 'eth_sendTransaction':
        await sendTransaction(event.request, provider, KEEPKEY_SDK, ADDRESS);
        break;
      case 'eth_signTypedData':
        await signTypedData(event.request, KEEPKEY_SDK, ADDRESS);
        break;
      default:
        console.error(TAG, `Unsupported event type: ${event.type}`);
        throw createProviderRpcError(4200, `Method ${event.type} not supported`);
    }
  } catch (error) {
    console.error(TAG, 'Error processing approved event:', error);
  }
};

export const listenForApproval = (KEEPKEY_SDK: any, ADDRESS: string) => {
  const tag = TAG + ' | listenForApproval | ';

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
      if (message.action === 'eth_sign_response' && message.response.decision === 'accept') {
        const approvedEventId = message.response.eventId;
        console.log(tag, 'Retrieving approved event with ID:', approvedEventId);
        const eventsApproved = await approvalStorage.getEvents();
        console.log(tag, 'Retrieved eventsApproved:', eventsApproved);
        const eventsRequested = await requestStorage.getEvents();
        console.log(tag, 'Retrieved eventsRequested:', eventsRequested);

        const requestedEvent = await requestStorage.getEventById(approvedEventId);
        console.log(tag, 'Retrieved requested event:', requestedEvent);
        const approvedEvent = await approvalStorage.getEventById(approvedEventId);
        console.log(tag, 'Retrieved approved event:', approvedEvent);
        if (approvedEvent && approvedEvent.status === 'approval') {
          await processApprovedEvent(approvedEvent, KEEPKEY_SDK, ADDRESS);
        } else {
          console.error(tag, 'Approved event not found or status is incorrect:', approvedEventId);
        }
      }
    } catch (error) {
      console.error(tag, 'Error handling message:', error);
    }
  });

  approvalStorage.subscribe(async changes => {
    try {
      if (changes && typeof changes === 'object') {
        for (const [key, change] of Object.entries(changes)) {
          if (change.newValue) {
            const event: Event = change.newValue;
            if (event.status === 'approval') {
              console.log(tag, 'Processing approval event:', event);
              await processApprovedEvent(event, KEEPKEY_SDK, ADDRESS);
            }
          }
        }
      } else {
        console.warn(tag, 'Invalid changes object:', changes);
      }
    } catch (error) {
      console.error(tag, 'Error handling storage changes:', error);
    }
  });
};
