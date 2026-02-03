const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_PARAMETRO || ["admin"];
const { saveParametro,deleteParametro
} = require("../service/parametros.service.js");
exports.findAll = (req, res) => {
	console.info(req.headers);
	console.info(req.params);
	const role = "admin";
	/*Validación*/
	if (roles.includes(role)) {
		res.json({ "saludos": `Hola ${req.params.nombre || " Parametros"}` });
	}
	else {
		return res.status(405).send('Method Not Allowed.');
	}
};

exports.findParametro = (req, res) => {
	console.info(req.headers);
	console.info(req.params);

	const { parametro } = req.query;

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				console.error("Connection error", err);
				return res.status(500).json({ error: 'Error de conexión con la base de datos' });
			}


			const param = [
				parametro
			];

			const sql = `CALL "AND_HER_DEV"."SP_GET_PARAMETRO"(?)`;

			connection.exec(sql, param, (err, result) => {
				if (err) {
					console.error('Error al ejecutar SQL:', err);
					connection.disconnect();
					return res.status(500).json({ error: 'Error interno del servidor' });
				}

				// Verificar si el procedimiento almacenado devolvió un resultado
				if (result.length > 0) {

					const json_result = JSON.parse(result[0].RESULT); 
					res.json(json_result);
				} else {
					console.error('No se encontraron resultados');
					res.status(404).json({ error: 'No se encontraron resultados' });
				}
				connection.disconnect();
			});
		});
	} catch (err) {
		console.error('Error al conectar con la base de datos:', err);
		res.status(500).json({ error: 'Error interno del servidor' });
	}
};
exports.saveParametro = (req, res) => {
	saveParametro(req.body)
	.then((parametro) => {
	  return res.status(200).json(parametro);
	})
	.catch((err) => {
	  return res
		.status(500)
		.json({ message: "Error al guardar registro" });
	});

  };
exports.deleteParametro = async (req, res) => {
  const id = req.params.id; 
  try {
    // Lógica para eliminar, por ejemplo:
    const result = await deleteParametro(id);
    
    res.status(200).json({ message: "Parámetro eliminado correctamente", result });
  } catch (error) {
    console.error("Error al eliminar parámetro:", error);
    res.status(500).json({ error: "Error interno al eliminar el parámetro" });
  }
};