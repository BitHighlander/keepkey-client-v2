import '@src/Popup.css';
import { Avatar, Box, Button, Flex, Card, Text, Heading } from '@chakra-ui/react';
import { useStorageSuspense, withErrorBoundary, withSuspense } from '@chrome-extension-boilerplate/shared';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';

import { useState, useEffect } from 'react';

const Popup = () => {
  const theme = useStorageSuspense(exampleThemeStorage);
  const [signRequest, setSignRequest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([
    {
      icon: 'https://avatars.githubusercontent.com/u/12554817?s=200&v=4',
      title: 'Event 1',
      description: 'Description 1',
      tx: {},
    },
  ]);

  useEffect(() => {
    const listener = (message: { action: string; request: any }) => {
      console.log('event:', message);
      // if (message.action === 'eth_sign') {
      //     setSignRequest(message.request);
      // }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const handleResponse = (decision: 'accept' | 'reject') => {
    chrome.runtime.sendMessage({ action: 'eth_sign_response', response: { decision } });
    window.close();
  };

  return (
    <div>
      {signRequest && (
        <Card borderRadius="md" p={4} mb={4}>
          <Heading as="h3" size="md" mb={2}>
            Sign Request
          </Heading>
          <Text mb={4}>You have a new sign request.</Text>
          <Button colorScheme="green" onClick={() => handleResponse('accept')} mr={2}>
            Approve
          </Button>
          <Button colorScheme="red" onClick={() => handleResponse('reject')}>
            Reject
          </Button>
        </Card>
      )}
      {events.map((event: any, index: any) => (
        <Card key={index} borderRadius="md" p={1} mb={1} width="100%">
          <Flex align="center" width="100%">
            <Avatar src={event.icon} />
            <Box ml={3} flex="1" minWidth="0">
              <Heading as="h4" size="sm">
                {event.title}
              </Heading>
              <Text fontSize="sm">{event.description}</Text>
            </Box>
            <Button ml={2} colorScheme="green" size="xs" onClick={() => handleResponse('accept')}>
              Approve
            </Button>
            <Button ml={2} colorScheme="red" size="xs" onClick={() => handleResponse('reject')}>
              Reject
            </Button>
          </Flex>
        </Card>
      ))}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading ...</div>), <div>Error Occurred</div>);
