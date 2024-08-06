// Popup.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, Spinner } from '@chakra-ui/react';
import '@src/Popup.css';
import { requestStorage, approvalStorage } from '@chrome-extension-boilerplate/storage';
import { withErrorBoundary, withSuspense } from '@chrome-extension-boilerplate/shared';
import EventsViewer from './components/Events'; // Adjust the import path accordingly
import { useOnStartApp } from './onStart';
import { usePioneer } from '@coinmasters/pioneer-react';
import Connect from './components/Connect'; // Import the new Connect component
import Loading from './components/Loading'; // Import the new Connect component
import axios from 'axios';

const Popup = () => {
  const onStartApp = useOnStartApp();
  const [signRequest, setSignRequest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [keepkeyState, setKeepkeyState] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [currentProvider, setCurrentProvider] = useState<any>(null);

  useEffect(() => {
    const checkKeepKey = async () => {
      try {
        const response = await axios.get('http://localhost:1646/docs');
        if (response.status === 200) {
          setKeepkeyState(2); // Set state to 1 if KeepKey is connected
        }
      } catch (error) {
        console.error('KeepKey endpoint not found:', error);
        setKeepkeyState(4); // Set state to 4 if there's an error
      }
    };

    checkKeepKey();
    const interval = setInterval(checkKeepKey, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log('Starting app...');
    onStartApp();
  }, []);

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

    const listener = (message: any) => {
      console.log('Received message:', message);
      if (message.action && message.request) {
        const newEvent = { action: message.action, request: message.request };
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents, newEvent];
          //@ts-ignore
          requestStorage.addEvent(newEvent); // Update the events in storage
          return updatedEvents;
        });
        if (!signRequest) {
          setSignRequest(newEvent);
        }
      } else if (message.action === 'UPDATE_KEEPKEY_STATE' && message.state !== undefined) {
        console.log('Updating KeepKey state:', message.state);
        setKeepkeyState(message.state);
      } else if (message.type === 'PROVIDER_CHANGED' && message.provider) {
        console.log('Provider changed:', message.provider);
        setCurrentProvider(message.provider);
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
      return <Loading setIsConnecting={setIsConnecting} keepkeyState={keepkeyState} />;
    }

    switch (keepkeyState) {
      case 0: // disconnected
      case 1: // connecting
        return <Loading setIsConnecting={setIsConnecting} keepkeyState={keepkeyState} />;
      case 2: // connected
        return <EventsViewer usePioneer={usePioneer} app={{ currentProvider }} />;
      case 3: // busy
        return <Loading setIsConnecting={setIsConnecting} keepkeyState={keepkeyState} />;
      case 4: // errored
        return <Connect setIsConnecting={setIsConnecting} />;
      default:
        return <Text>Device not connected.</Text>;
    }
  };

  return <div>{renderContent()}</div>;
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading ...</div>), <div>Error Occurred</div>);
