import '@src/Popup.css';
import { Avatar, Box, Button, Flex, Card, Text, Heading, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { requestStorage } from '@chrome-extension-boilerplate/storage';
import { useStorageSuspense, withErrorBoundary, withSuspense } from '@chrome-extension-boilerplate/shared';
import Transaction from './Transaction'; // Adjust the import path accordingly

const Popup = () => {
  const [signRequest, setSignRequest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [keepkeyState, setKeepkeyState] = useState<number>(0);

  useEffect(() => {
    // Fetch the KeepKey state when the popup opens
    chrome.runtime.sendMessage({ type: 'GET_KEEPKEY_STATE' }, response => {
      if (response && response.state !== undefined) {
        setKeepkeyState(response.state);
      }
    });

    // Load events from storage on startup
    const loadEventsFromStorage = async () => {
      const storedEvents = await requestStorage.getEvents();
      if (storedEvents) {
        setEvents(storedEvents);
        if (storedEvents.length > 0 && !signRequest) {
          setSignRequest(storedEvents[0]);
        }
      }
    };
    loadEventsFromStorage();

    const listener = (message: { action: string; request: any; eventId?: string }) => {
      console.log('message', message);
      if (message.action && message.request) {
        // Add to events
        const newEvent = { action: message.action, request: message.request };
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents, newEvent];
          // Update the events in storage
          requestStorage.addEvent(newEvent);
          return updatedEvents;
        });
        if (!signRequest) {
          setSignRequest(newEvent);
        }
      } else if (message.action === 'UPDATE_KEEPKEY_STATE') {
        setKeepkeyState(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [signRequest]);

  const handleResponse = (decision: 'accept' | 'reject') => {
    console.log('handleResponse', decision);
    chrome.runtime.sendMessage({ action: 'eth_sign_response', response: { decision, eventId: signRequest.id } });
    window.close();
  };

  const renderContent = () => {
    switch (keepkeyState) {
      case 1: // disconnected
        return <Text>KeepKey is disconnected.</Text>;
      case 2: // connected
        if (events.length === 0) {
          return <Text>Connected and no events.</Text>;
        }
        return <Transaction event={events[0]} handleResponse={handleResponse} />;
      case 3: // busy
        return (
            <Card borderRadius="md" p={4} mb={4}>
              <Spinner size="xl" />
              <Text>KeepKey is busy...</Text>
            </Card>
        );
      case 4: // errored
        return (
            <Card borderRadius="md" p={4} mb={4}>
              <Text>KeepKey encountered an error.</Text>
              <img src="error-image.png" alt="Error" />
            </Card>
        );
      default:
        return <Text>Device not connected.</Text>;
    }
  };

  return <div>{renderContent()}</div>;
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading ...</div>), <div>Error Occurred</div>);
