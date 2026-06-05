import Redis from "ioredis";

class RedisClient {
    constructor() {
        if (!RedisClient.instance) {
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379
            });

            this.client.on("connect", () => {
                console.log("Redis Connected");
            });

            this.client.on("error", (error) => {
                console.error("Redis connection error", error);
            });

            RedisClient.instance = this.client;
        }

        return RedisClient.instance;
    }
}

const redisClient = new RedisClient();

export default redisClient;