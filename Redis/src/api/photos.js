const express = require('express');
const router = express.Router();

// Mock data
let photos = require('../../data/photos.json');

router.post('/', (req, res) => {
    const photo = req.body;
    photo.id = photos.length + 1;  // Simple ID assignment
    photos.push(photo);
    res.status(201).send(photo);
});

router.get('/', (req, res) => {
    res.status(200).send(photos);
});

router.get('/:id', (req, res) => {
    const photo = photos.find(p => p.id == req.params.id);
    if (!photo) {
        return res.status(404).send();
    }
    res.status(200).send(photo);
});

router.put('/:id', (req, res) => {
    const index = photos.findIndex(p => p.id == req.params.id);
    if (index === -1) {
        return res.status(404).send();
    }
    photos[index] = { ...photos[index], ...req.body };
    res.status(200).send(photos[index]);
});

router.delete('/:id', (req, res) => {
    const index = photos.findIndex(p => p.id == req.params.id);
    if (index !== -1) {
        photos.splice(index, 1);
    }
    res.status(204).send();
});

module.exports = router;
