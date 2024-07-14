import React, { useEffect, useState } from 'react';
import { Box, Button, Card, Flex, Heading, Text, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { requestStorage, approvalStorage, completedStorage } from '@chrome-extension-boilerplate/storage';

const Transaction = ({ event, handleResponse }: { event: any; handleResponse: (decision: 'accept' | 'reject') => void }) => {
  const { gas, value, from, to, data } = event;

  return (
      <Card borderRadius="md" p={4} mb={4}>
        <Box mb={4}>
          <Heading as="h4" size="sm">
            Data
          </Heading>
          <pre>{JSON.stringify(event, null, 2)}</pre>
        </Box>

        <Box mb={4}>
          <Text>Blockchain(s): Ethereum</Text>
        </Box>
        <Box mb={4}>
          <Text>Relay Protocol: irn</Text>
        </Box>
        <Box mb={4}>
          <Text>Methods: eth_sendTransaction</Text>
        </Box>

        <Flex>
          <Button colorScheme="green" onClick={() => handleResponse('accept')} mr={2}>
            Approve
          </Button>
          <Button colorScheme="red" onClick={() => handleResponse('reject')}>
            Reject
          </Button>
        </Flex>
      </Card>
  );
};

const EventsViewer = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      const storedEvents = await requestStorage.getEvents();
      setEvents(storedEvents || []);
    };

    fetchEvents();
  }, []);

  const handleResponse = async (decision: 'accept' | 'reject') => {
    if (decision === 'reject') {
      const updatedEvents = events.filter((_, index) => index !== currentIndex);
      await requestStorage.set(updatedEvents);
      setEvents(updatedEvents);
      setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : 0);
    } else {
      // Handle acceptance logic here
    }
  };

  const nextEvent = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const previousEvent = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          Total Events: {events.length}
        </Heading>
        {events.length > 0 ? (
            <Transaction event={events[currentIndex]} handleResponse={handleResponse} />
        ) : (
            <Text>No events available</Text>
        )}
      </Box>
  );
};

export default EventsViewer;
