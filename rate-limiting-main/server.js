const express = require('express');
const redis = require("redis");

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
  url: `redis://${redisHost}:${redisPort}`
});

// Default Token Bucket Parameters
const DEFAULT_MAX_REQUESTS = 5; // Max requests per window
const DEFAULT_WINDOW_MS = 60000; // Time window in milliseconds

async function rateLimit(req, res, next) {
  const ip = req.ip;

  let tokenBucket;

  try {
    // Retrieve the token bucket from Redis
    tokenBucket = await redisClient.hGetAll(ip);
  } catch (err) {
    console.error("Error accessing Redis:", err);
    res.status(500).send({ err: "Internal Server Error" });
    return;
  }

  // Initialize token bucket if not found in Redis
  tokenBucket = {
    tokens: parseFloat(tokenBucket.tokens) || DEFAULT_MAX_REQUESTS,
    last: parseInt(tokenBucket.last) || Date.now()
  };

  const timestamp = Date.now();
  const elapsedTime = timestamp - tokenBucket.last;

  // Calculate tokens to be replenished
  const refreshRate = DEFAULT_MAX_REQUESTS / DEFAULT_WINDOW_MS;
  tokenBucket.tokens += elapsedTime * refreshRate;
  tokenBucket.tokens = Math.min(DEFAULT_MAX_REQUESTS, tokenBucket.tokens);
  tokenBucket.last = timestamp;

  if (tokenBucket.tokens >= 1) {
    tokenBucket.tokens -= 1;
    try {
      await redisClient.hSet(ip, [
        ['tokens', tokenBucket.tokens],
        ['last', tokenBucket.last]
      ]);
    } catch (err) {
      console.error("Error updating Redis:", err);
      res.status(500).send({ err: "Internal Server Error" });
      return;
    }
    next();
  } else {
    res.status(429).send({
      err: "Too many requests. Please wait before trying again."
    });
  }
}

app.use(rateLimit);

app.get('/', (req, res) => {
  res.status(200).json({
    message: "Welcome to the API",
    timestamp: new Date().toString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    err: `Path ${req.originalUrl} does not exist`
  });
});

// Start Redis and Server
redisClient.connect().then(() => {
  app.listen(port, () => {
    console.log(`== Server is running on port ${port}`);
  });
}).catch(err => {
  console.error("Error connecting to Redis:", err);
});