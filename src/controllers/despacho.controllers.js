const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_DESPACHO || ["admin"];

exports.findAll = (req, res) => {
	console.info(req.headers);
	console.info(req.params);
	const role = "admin";
	/*Validación*/
	if(roles.includes(role)){
		res.json({ "saludos": `Hola ${req.params.nombre || " Devolucion"}` });
	}
	else{
		return res.status(405).send('Method Not Allowed.');
	}
};