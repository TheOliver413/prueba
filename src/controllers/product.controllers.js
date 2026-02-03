const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');


exports.saludar = (req, res) => {
	console.info(req.params);
	res.json({ "saludos": `Hola ${req.params.nombre || "Samuel"}` });
};


exports.findAll = (req, res) => {
	connection.connect(connectionParams, (err) => {
		if (err) {
			return console.error("Connection error", err);
		}
		const sql = `SELECT * FROM CLIENTES`; connection.exec(sql, (err, rows) => {
			connection.disconnect();
			if (err) {
				return console.error('SQL execute error:', err);
			}
			console.log("Results:", rows);
			console.log(`Query '${sql}' returned ${rows.length} items`);
			res.json({ "ProductCollection": rows });
		});
	});
};


exports.create = (req, res) => {
	console.info(JSON.stringify(req.body));
	connection.connect(connectionParams, (err) => {
		if (err) {
			return console.error("Connection error", err);
		}
		const sql = `CALL INSERTARCLIENTE('${req.body.nombre}', '${req.body.apellido}', '${req.body.correo}');`;
		connection.exec(sql, (err, rows) => {
			connection.disconnect();
			if (err) {
				if (err.code != -20004) {
					console.error(err);
					res.json(
						{
							"status": 500,
							"transaction": "",
							"mensaje": err
						});
				}
			}
			res.json(
				{
					"status": 200,
					"transaction": '',
					"mensaje": "Cliente fué insertado satisfactoriamente"
				});
		})
	});
};



exports.update = (req, res) => {
	console.info(JSON.stringify(req.body));
	connection.connect(connectionParams, (err) => {
		if (err) {
			return console.error("Connection error", err);
		}
		const sql = `CALL UPDATECLIENTE(${req.body.clienteid},'${req.body.nombre}', '${req.body.apellido}', '${req.body.correo}');`;
		connection.exec(sql, (err, rows) => {
			connection.disconnect();
			if (err) {
				if (err.code != -20004) {
					console.error(err);
					res.json(
						{
							"status": 500,
							"transaction": "",
							"mensaje": err
						});
				}
			}
			res.json(
				{
					"status": 200,
					"transaction": '',
					"mensaje": "Cliente fué actualizado satisfactoriamente"
				});
		})
	});
};