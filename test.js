// test-concurrency.js
// Run this with: node test-concurrency.js (Make sure your server is running on port 3000)

const API_URL = 'http://localhost:5000/api/v1/concurrency/reserve';

async function sendReservationRequest(userIndex) {
    const payload = {
        userId: `usr_${userIndex}`,
        itemId: 'item-001', // Assumes you seeded this item with limited stock (e.g., 2 units)
        quantity: 1
    };

    const startTime = Date.now();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        return {
            user: payload.userId,
            status: response.status,
            success: data.success,
            message: data.success ? 'Reserved successfully!' : data.error,
            executionTime: `${duration}ms`,
            serverReportedTime: data.meta?.executionTimeMs || 'N/A'
        };
    } catch (error) {
        return {
            user: payload.userId,
            status: 500,
            success: false,
            message: error.message
        };
    }
}

async function runConcurrencyTest() {
    console.log('Firing concurrent reservation requests at the database...\n');

    // Simulate 5 users trying to buy/reserve the item simultaneously
    const totalRequests = 5;
    const promises = [];

    for (let i = 1; i <= totalRequests; i++) {
        promises.push(sendReservationRequest(i));
    }

    // Fire all requests at the exact same millisecond
    const results = await Promise.all(promises);

    console.table(results);
    console.log('\n Concurrency test completed! Notice how row-locking serialized the queue.');
}

runConcurrencyTest();