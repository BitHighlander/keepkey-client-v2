import React, { useEffect, useState } from 'react';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { requestStorage, approvalStorage, completedStorage } from '@chrome-extension-boilerplate/storage';
import Transaction from './Transaction';
import { Classic } from '@coinmasters/pioneer-lib';

const EventsViewer = ({ usePioneer }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchEvents = async () => {
    const storedEvents = await requestStorage.getEvents();
    setEvents(storedEvents || []);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const clearRequestEvents = async () => {
    await requestStorage.clearEvents();
    fetchEvents();
    setCurrentIndex(0);
  };

  const clearApprovalEvents = async () => {
    await approvalStorage.clearEvents();
  };

  const clearCompletedEvents = async () => {
    await completedStorage.clearEvents();
  };

  return (
    <Box>
      {/*<Heading as="h2" size="lg" mb={4}>*/}
      {/*  Total Events: {events.length}*/}
      {/*</Heading>*/}
      {events.length > 0 ? (
        <Transaction event={events[currentIndex]} reloadEvents={fetchEvents} />
      ) : (
        <Classic usePioneer={usePioneer}></Classic>
      )}
      {/*<Flex mt={4}>*/}
      {/*  <Button onClick={previousEvent} mr={2} isDisabled={currentIndex === 0}>*/}
      {/*    Previous*/}
      {/*  </Button>*/}
      {/*  <Button onClick={nextEvent} isDisabled={currentIndex === events.length - 1}>*/}
      {/*    Next*/}
      {/*  </Button>*/}
      {/*</Flex>*/}
      {/*<Flex mt={4} justify="space-between">*/}
      {/*  <Button colorScheme="red" onClick={clearRequestEvents}>*/}
      {/*    Clear Request Events*/}
      {/*  </Button>*/}
      {/*  <Button colorScheme="red" onClick={clearApprovalEvents}>*/}
      {/*    Clear Approval Events*/}
      {/*  </Button>*/}
      {/*  <Button colorScheme="red" onClick={clearCompletedEvents}>*/}
      {/*    Clear Completed Events*/}
      {/*  </Button>*/}
      {/*</Flex>*/}
    </Box>
  );
};

export default EventsViewer;
