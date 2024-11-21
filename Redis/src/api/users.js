const express = require('express');
const router = express.Router();

// Correct the imports to match the intended data
let businesses = require('../../data/businesses.json');
let reviews = require('../../data/reviews.json');  // Corrected
let photos = require('../../data/photos.json');    // Corrected

/*
 * Route to list all of a user's businesses.
 */
router.get('/:id/businesses', function (req, res) {
    const id = parseInt(req.params.id);  // Corrected to use 'id'
    const userBusinesses = businesses.filter(business => business.ownerid === id);
    res.status(200).send({ businesses: userBusinesses });
});

/*
 * Route to list all of a user's reviews.
 */
router.get('/:id/reviews', function (req, res) {
    const userid = parseInt(req.params.id);  // Corrected to use 'id'
    const userReviews = reviews.filter(review => review.userid === userid);
    res.status(200).send({ reviews: userReviews });
});

/*
 * Route to list all of a user's photos.
 */
router.get('/:id/photos', function (req, res) {
    const userid = parseInt(req.params.id);  // Corrected to use 'id'
    const userPhotos = photos.filter(photo => photo.userid === userid);
    res.status(200).send({ photos: userPhotos });
});

module.exports = router;
