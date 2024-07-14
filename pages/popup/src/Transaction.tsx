import React, { useEffect, useState } from 'react';
import { Box, Button, Card, Flex, Heading, Text, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { requestStorage, approvalStorage, completedStorage } from '@chrome-extension-boilerplate/storage';

const Transaction = ({ event }: { event: any }) => {
    const { gas, value, from, to, data } = event;

    const handleResponse = async (decision: 'accept' | 'reject') => {
        try {
            if (decision === 'reject') {
                const updatedEvents = (await requestStorage.getEvents()).filter((e: any) => e.id !== event.id);
                await requestStorage.set(updatedEvents);
            } else {
                // Move event to approval storage
                const updatedEvent = { ...event, status: 'approval' };
                await requestStorage.removeEventById(event.id);
                await approvalStorage.addEvent(updatedEvent);
                chrome.runtime.sendMessage({ action: 'eth_sign_response', response: { decision, eventId: event.id } });
            }
        } catch (error) {
            console.error('Error handling response:', error);
        }
    };

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
                <Transaction event={events[currentIndex]} />
            ) : (
                <Text>No events available</Text>
            )}
            <Flex mt={4}>
                <Button onClick={previousEvent} mr={2} isDisabled={currentIndex === 0}>
                    Previous
                </Button>
                <Button onClick={nextEvent} isDisabled={currentIndex === events.length - 1}>
                    Next
                </Button>
            </Flex>
        </Box>
    );
};

export default EventsViewer;
