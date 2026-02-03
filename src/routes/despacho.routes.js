

const express = require('express')
const router = express.Router()
const DespachoController = require('../controllers/despacho.controllers');

router.get('/find', DespachoController.findAll);




module.exports = router