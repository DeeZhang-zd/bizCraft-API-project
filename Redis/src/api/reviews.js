const express = require('express');
const router = express.Router();

// Mock data
let reviews = require('../../data/reviews.json');

router.post('/', (req, res) => {
    const review = req.body;
    review.id = reviews.length + 1;  // Simple ID assignment
    reviews.push(review);
    res.status(201).send(review);
});

router.get('/', (req, res) => {
    res.status(200).send(reviews);
});

router.get('/:id', (req, res) => {
    const review = reviews.find(r => r.id == req.params.id);
    if (!review) {
        return res.status(404).send();
    }
    res.status(200).send(review);
});

router.put('/:id', (req, res) => {
    const index = reviews.findIndex(r => r.id == req.params.id);
    if (index === -1) {
        return res.status(404).send();
    }
    reviews[index] = { ...reviews[index], ...req.body };
    res.status(200).send(reviews[index]);
});

router.delete('/:id', (req, res) => {
    const index = reviews.findIndex(r => r.id == req.params.id);
    if (index !== -1) {
        reviews.splice(index, 1);
    }
    res.status(204).send();
});

module.exports = router;
