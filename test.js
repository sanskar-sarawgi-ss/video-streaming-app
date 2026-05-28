// ============================================
// ORIGINAL CODE - EXACTLY AS PROVIDED
// ============================================

class RequestQueue {
    pending = new Map();
    async enqueue(key, fn) {
        if (this.pending.has(key)){
            return this.pending.get(key);
        }
        const promise = fn();
        this.pending.set(key, promise);
        try {
            const result = await promise;
            return result;
        } finally {
            this.pending.delete(key);   
        }
    }
}

// ============================================
// TEST TO PRODUCE RACE CONDITION
// ============================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let apiCallCount = 0;

async function testRaceCondition() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        TESTING ORIGINAL CODE FOR RACE CONDITION       ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    apiCallCount = 0;
    const queue = new RequestQueue();

    console.log("Making API call that takes 2 seconds...\n");

    // Caller 1 - creates the request
    const call1 = queue.enqueue("endpoint", async () => {
        apiCallCount++;
        console.log(`[Call ${apiCallCount}] API request started`);
        await delay(2000);
        console.log(`[Call ${apiCallCount}] API request completed\n`);
        return `Response ${apiCallCount}`;
    });

    // Caller 2 - concurrent, should get same promise
    await delay(100);
    console.log("Caller 2 arriving...\n");
    const call2 = queue.enqueue("endpoint", async () => {
        apiCallCount++;
        console.log(`[Call ${apiCallCount}] API request started`);
        await delay(2000);
        console.log(`[Call ${apiCallCount}] API request completed\n`);
        return `Response ${apiCallCount}`;
    });

    // Wait for first caller to finish (and delete key)
    console.log("Waiting for Caller 1 to finish...");
    const result1 = await call1;
    console.log(`Result 1: ${result1}`);
    console.log("⚠️  Key deleted after Caller 1 finished\n");

    // Caller 3 - arrives after key deleted but while Caller 2 still awaiting
    console.log("Caller 3 arriving (while Caller 2 still awaiting)...\n");
    const call3 = queue.enqueue("endpoint", async () => {
        apiCallCount++;
        console.log(`[Call ${apiCallCount}] API request started`);
        await delay(2000);
        console.log(`[Call ${apiCallCount}] API request completed\n`);
        return `Response ${apiCallCount}`;
    });

    // Get all results
    const result2 = await call2;
    const result3 = await call3;

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                    RESULTS                             ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`Caller 1 got: ${result1}`);
    console.log(`Caller 2 got: ${result2}`);
    console.log(`Caller 3 got: ${result3}\n`);
    
    console.log(`Total API calls made: ${apiCallCount}`);
    console.log(`Expected: 1 (all should share same response)`);
    
    if (apiCallCount > 1) {
        console.log(`\n🚨 RACE CONDITION DETECTED!`);
        console.log(`Got ${apiCallCount} API calls instead of 1`);
        console.log(`\nWhy?`);
        console.log(`- Caller 1's finally deleted key after completing`);
        console.log(`- Caller 2 was still awaiting when key was deleted`);
        console.log(`- Caller 3 arrived and found no key`);
        console.log(`- Caller 3 created a NEW request (duplicate)\n`);
    } else {
        console.log(`\nNo race condition\n`);
    }
}

testRaceCondition().catch(console.error);