const express = require('express');
const redis = require('redis');
const { Business } = require('../../models/business'); // Sequelize model
const router = express.Router();

// Initialize Redis client
const redisClient = redis.createClient({ host: 'localhost', port: 6379 });
redisClient.on('error', (err) => console.error('Redis error:', err));

// Helper: Fetch from Redis or execute fallback
async function fetchWithCache(key, fallback, ttl = 3600) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (err, cachedData) => {
            if (err) return reject(err);

            if (cachedData) {
                console.log(`Cache hit for key: ${key}`);
                return resolve(JSON.parse(cachedData));
            } else {
                console.log(`Cache miss for key: ${key}`);
                try {
                    const data = await fallback();
                    redisClient.setex(key, ttl, JSON.stringify(data));
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

// Helper: Invalidate cache
function invalidateCache(keys) {
    keys.forEach((key) => {
        redisClient.del(key, (err) => {
            if (err) console.error(`Error deleting cache key: ${key}`, err);
        });
    });
}

// Create a new business
router.post('/', async (req, res) => {
    try {
        const newBusiness = await Business.create(req.body);
        invalidateCache(['allBusinesses', 'sortedBusinesses']);
        res.status(201).send(newBusiness);
    } catch (error) {
        console.error('Error creating business:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Fetch all businesses with optional pagination
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    try {
        const data = await fetchWithCache('allBusinesses', async () => {
            const businesses = await Business.findAll();
            return businesses;
        });

        // Apply pagination
        const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);
        res.status(200).send({
            page,
            pageSize,
            total: data.length,
            data: paginatedData,
        });
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Fetch a single business by ID
router.get('/:id', async (req, res) => {
    const businessId = req.params.id;

    try {
        const business = await fetchWithCache(`business:${businessId}`, async () => {
            const result = await Business.findByPk(businessId);
            if (!result) throw new Error('Business not found');
            return result;
        });

        res.status(200).send(business);
    } catch (error) {
        console.error(`Error fetching business with ID ${businessId}:`, error);
        res.status(404).send({ error: error.message });
    }
});

// Search for businesses by name using binary search
router.get('/search', async (req, res) => {
    const targetName = req.query.name;

    if (!targetName) {
        return res.status(400).send('Query parameter "name" is required');
    }

    try {
        const sortedBusinesses = await fetchWithCache('sortedBusinesses', async () => {
            const businesses = await Business.findAll();
            return businesses.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Binary search
        let low = 0;
        let high = sortedBusinesses.length - 1;
        let result = null;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const comparison = sortedBusinesses[mid].name.localeCompare(targetName);

            if (comparison === 0) {
                result = sortedBusinesses[mid];
                break;
            } else if (comparison < 0) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (result) {
            res.status(200).send(result);
        } else {
            res.status(404).send('Business not found');
        }
    } catch (error) {
        console.error('Error searching for business:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update a business by ID
router.put('/:id', async (req, res) => {
    const businessId = req.params.id;

    try {
        const business = await Business.findByPk(businessId);
        if (!business) return res.status(404).send('Business not found');

        await business.update(req.body);
        invalidateCache(['allBusinesses', `business:${businessId}`, 'sortedBusinesses']);
        res.status(200).send(business);
    } catch (error) {
        console.error('Error updating business:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete a business by ID
router.delete('/:id', async (req, res) => {
    const businessId = req.params.id;

    try {
        const business = await Business.findByPk(businessId);
        if (!business) return res.status(404).send('Business not found');

        await business.destroy();
        invalidateCache(['allBusinesses', `business:${businessId}`, 'sortedBusinesses']);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting business:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;