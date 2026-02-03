

const express = require('express')
const router = express.Router()
const ParametrosController = require('../controllers/parametros.controllers');

router.get('/find', ParametrosController.findAll);
router.get('/get', ParametrosController.findParametro);
router.post('/save', ParametrosController.saveParametro);
router.get('/delete-id/:id', ParametrosController.deleteParametro);

module.exports = router