import React, { useState, useEffect } from 'react';
import { Avatar, Box, Button, Stack, Link, Card, Text, Spinner } from '@chakra-ui/react';
import '@src/Popup.css';
import { requestStorage, approvalStorage, assetContextStorage } from '@chrome-extension-boilerplate/storage';
import { withErrorBoundary, withSuspense } from '@chrome-extension-boilerplate/shared';
import EventsViewer from './components/Events'; // Adjust the import path accordingly
import { useOnStartApp } from './onStart';
import { usePioneer } from '@coinmasters/pioneer-react';

const Popup = () => {
  const onStartApp = useOnStartApp();
  const [signRequest, setSignRequest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [keepkeyState, setKeepkeyState] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    console.log('Starting app...');
    onStartApp();
  }, []);

  const connectKeepkey = () => {
    console.log('connectKeepkey called');
    setIsConnecting(true);
    try {
      chrome.runtime.sendMessage({ type: 'ON_START' }, response => {
        if (chrome.runtime.lastError) {
          console.error('chrome.runtime.lastError:', chrome.runtime.lastError.message);
        } else {
          console.log('Response:', response);
        }
        setIsConnecting(false);
      });
    } catch (error) {
      console.error('Error in connectKeepkey:', error);
      setIsConnecting(false);
    }
  };

  const launchKeepKey = () => {
    try {
      console.log('window: ', window);
      console.log('window.location: ', window.location);
      if (window) {
        setTimeout(() => {
          window.location.assign('keepkey://launch');
        }, 100); // Adding a slight delay before launching the URL
      }
    } catch (error) {
      console.error('Failed to launch KeepKey:', error);
      alert('Failed to launch KeepKey: ' + error.toString());
    }
  };

  useEffect(() => {
    console.log('Fetching KeepKey state...');
    chrome.runtime.sendMessage({ type: 'GET_KEEPKEY_STATE' }, response => {
      if (chrome.runtime.lastError) {
        console.error('chrome.runtime.lastError:', chrome.runtime.lastError.message);
        return;
      }
      if (response && response.state !== undefined) {
        console.log('KeepKey state:', response.state);
        setKeepkeyState(response.state);
      }
    });

    const loadEventsFromStorage = async () => {
      try {
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
      } catch (error) {
        console.error('Failed to load events from storage:', error);
      }
    };
    loadEventsFromStorage();

    const listener = (message: { action: string; request: any; state?: number }) => {
      console.log('Received message:', message);
      if (message.action && message.request) {
        const newEvent = { action: message.action, request: message.request };
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents, newEvent];
          requestStorage.addEvent(newEvent); // Update the events in storage
          return updatedEvents;
        });
        if (!signRequest) {
          setSignRequest(newEvent);
        }
      } else if (message.action === 'UPDATE_KEEPKEY_STATE' && message.state !== undefined) {
        console.log('Updating KeepKey state:', message.state);
        setKeepkeyState(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      console.log('Removing message listener');
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [signRequest]);

  const renderContent = () => {
    if (isConnecting) {
      return (
        <Box textAlign="center">
          <Spinner size="xl" />
          <Text mt={4}>Connecting to KeepKey...</Text>
        </Box>
      );
    }

    switch (keepkeyState) {
      case 0: // disconnected
        return (
          <div>
            <Spinner size="xl" />
            <Text mt={4}>Connecting to KeepKey...</Text>
          </div>
        );
      case 1: // disconnected
        return (
          <div>
            <Spinner size="xl" />
            <Text mt={4}>Connecting to KeepKey...</Text>
          </div>
        );
      case 2: // connected
        return <EventsViewer usePioneer={usePioneer} />;
      case 3: // busy
        return (
          <Card borderRadius="md" p={4} mb={4}>
            <Spinner size="xl" />
            <Text>KeepKey is busy...</Text>
          </Card>
        );
      case 4: // errored
        return (
          <Card
            borderRadius="md"
            p={6}
            mb={6}
            display="flex"
            flexDirection="column"
            alignItems="center"
            textAlign="center"
            boxShadow="lg">
            <Avatar size="2xl" src="https://pioneers.dev/coins/keepkey.png" alt="Error" mb={6} />
            <Text fontSize="lg" mb={4}>
              KeepKey encountered an error.
            </Text>
            <Stack direction="column" spacing={4} mb={4}>
              <Button colorScheme="teal" onClick={connectKeepkey}>
                Connect your KeepKey
              </Button>
              <Button colorScheme="blue" onClick={launchKeepKey}>
                Launch KeepKey Desktop
              </Button>
            </Stack>
            <Text fontSize="sm" mt={4}>
              Don't have a KeepKey?{' '}
              <Link color="teal.500" href="https://keepkey.com">
                Buy a KeepKey
              </Link>
            </Text>
          </Card>
        );
      default:
        return <Text>Device not connected.</Text>;
    }
  };

  return <div>{renderContent()}</div>;
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading ...</div>), <div>Error Occurred</div>);
