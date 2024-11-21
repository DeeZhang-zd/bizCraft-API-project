const express = require('express');
const redis = require('redis');

// Require route modules
const businessesRouter = require('./api/businesses');
const reviewsRouter = require('./api/reviews');
const photosRouter = require('./api/photos');
const usersRouter = require('./api/users');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Redis client
const redisClient = redis.createClient({ host: 'localhost', port: 6379 });
redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Cache statistics
let cacheHits = 0;
let dbQueries = 0;

// Middleware for logging cache statistics
app.use((req, res, next) => {
    console.log(`Cache Hits: ${cacheHits}, DB Queries: ${dbQueries}`);
    next();
});

// Route for the home page
app.get('/', (req, res) => {
    res.send('Hello, welcome to our business!');
});

// Example of Redis caching for a simple API endpoint
app.get('/api/businesses/:id', (req, res) => {
    const businessId = req.params.id;

    // Check Redis cache
    redisClient.get(`business:${businessId}`, async (err, cachedData) => {
        if (err) {
            console.error('Redis GET error:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (cachedData) {
            cacheHits++; // Cache hit
            console.log('Cache hit');
            return res.status(200).json(JSON.parse(cachedData));
        } else {
            // Simulate database query
            dbQueries++; // Increment database query count
            console.log('Cache miss, querying database');

            // Simulate data (replace with actual DB query)
            const business = {
                id: businessId,
                name: `Business ${businessId}`,
                description: `Description of business ${businessId}`,
            };

            // Save to Redis with a 1-hour expiration
            redisClient.setex(`business:${businessId}`, 3600, JSON.stringify(business));
            return res.status(200).json(business);
        }
    });
});

// Use routes for API endpoints
app.use('/api/businesses', businessesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/users', usersRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});