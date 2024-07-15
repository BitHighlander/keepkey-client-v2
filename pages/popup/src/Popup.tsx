import '@src/Popup.css';
import { Avatar, Box, Button, Flex, Card, Text, Heading, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { requestStorage, approvalStorage } from '@chrome-extension-boilerplate/storage';
import { withErrorBoundary, withSuspense } from '@chrome-extension-boilerplate/shared';
import EventsViewer from './components/Events'; // Adjust the import path accordingly

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
      const eventsApproved = await approvalStorage.getEvents();
      console.log('eventsApproved:', eventsApproved);
      const eventsRequested = await requestStorage.getEvents();
      console.log('eventsRequested:', eventsRequested);
      const storedEvents = [...(eventsApproved || []), ...(eventsRequested || [])];
      if (storedEvents.length > 0) {
        setEvents(storedEvents);
        if (!signRequest) {
          setSignRequest(storedEvents[0]);
        }
      }
    };
    loadEventsFromStorage();

    const listener = (message: { action: string; request: any; state?: number }) => {
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
      } else if (message.action === 'UPDATE_KEEPKEY_STATE' && message.state !== undefined) {
        setKeepkeyState(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [signRequest]);

  const renderContent = () => {
    switch (keepkeyState) {
      case 0: // disconnected
        return <Text>spinner....</Text>;
      case 1: // disconnected
        return <Text>KeepKey is disconnected.</Text>;
      case 2: // connected
        if (events.length === 0) {
          return <Text>Connected and no events.</Text>;
        }
        return <EventsViewer />;
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
