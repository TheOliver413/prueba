

const express = require('express')
const router = express.Router()
const DevolucionController = require('../controllers/devolucion.controllers');

// Llamar a la función "saludar"
//router.get('/:nombre', ProductController.saludar);
//router.get('/', ProductController.saludar);
router.get('/find', DevolucionController.findAll);


module.exports = router