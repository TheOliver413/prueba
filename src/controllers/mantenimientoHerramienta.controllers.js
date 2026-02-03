const { json } = require("body-parser");

const global_config = require('../config/settings.js');
const hanaClient = require("@sap/hana-client");
const connection = hanaClient.createConnection();
const connectionParams = global_config.connectionParams;
const { v4: uuidv4 } = require('uuid');
const roles = process.env.ROLE_HERRAMIENTA || ["admin"];

exports.findAll = (req, res) => {
	console.info(req.headers);
	console.info(req.params);
	const role = "admin";
	/*Validación*/
	if (roles.includes(role)) {
		res.json({ "saludos": `Hola ${req.params.nombre || " Mantenimiento Herramienta"}` });
	}
	else {
		return res.status(405).send('Method Not Allowed.');
	}
};

exports.listHerramientas = (req, res) => {
	console.info(req.headers);
	console.info(req.params);

	const { codigo, descripcion, page, pageSize } = req.query;

	// Valores predeterminados para la paginación
	const pPage = page ? parseInt(page, 10) : 1;
	const pPageSize = pageSize ? parseInt(pageSize, 10) : 10;

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				return console.error("Connection error", err);
			}

			const paramsResult = [
				codigo || null,
				descripcion || null,
				pPage,
				pPageSize
			];

			const paramsCount = [
				codigo || null,
				descripcion || null,
				pPageSize
			];
			const sql = `CALL "AND_HER_DEV"."SP_LIST_HERRAMIENTA_COUNT" (?, ?, ?)`;

			connection.exec(sql, paramsCount, (err, rows) => {
				if (err) {
					console.error('SQL execute error:', err);
					connection.disconnect();
					return res.status(500).json({ error: 'Internal server error' });
				}

				const [output] = rows;
				const { TOTAL_RECORDS, TOTAL_PAGES } = output;

				// Hacer la segunda llamada para obtener los resultados de la tabla
				const sqlSecondCall = `CALL "AND_HER_DEV"."SP_LIST_HERRAMIENTA"(?, ?, ?, ?)`;

				connection.exec(sqlSecondCall, paramsResult, (err, secondRows) => {
					connection.disconnect();
					if (err) {
						console.error('SQL execute error:', err);
						return res.status(500).json({ error: 'Internal server error' });
					}
					console.log('HERRAMIENTAS: ', secondRows)

					res.json({
						REGISTROS_TOTALES: TOTAL_RECORDS,
						PAGINAS_TOTALES: TOTAL_PAGES,
						HERRAMIENTAS: secondRows
					});
				});
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.disconnect();
	}
};

exports.updateHerramienta = (req, res) => {
	console.info(req.headers);
	console.info(req.body);

	const {
		ID_HERRAMIENTA,
		DESCRIPCION_ADICIONAL,
		MODELO,
		ID_ESTADO,
		ID_MOTIVO,
		DESCRIPCION_MOTIVO,
		USUARIO_MODIFICACION
	} = req.body;


	/*		ID_HERRAMIENTA=2,
			DESCRIPCION_ADICIONAL= "Kit completo (arnés, línea de vida y freno)",
			MODELO="CL3A",
			ID_ESTADO=2124,
			ID_MOTIVO=2128,
			DESCRIPCION_MOTIVO="Mantenimiento por tiempo de uso",
			USUARIO_MODIFICACION = 'ADMIN'
	*/

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				console.error("Connection error", err);
				return res.status(500).json({ error: 'Internal server error' });
			}

			// Parámetros para SP_UPDATE_HERRAMIENTA
			const paramsUpdate = [
				ID_HERRAMIENTA,
				DESCRIPCION_ADICIONAL,
				MODELO,
				ID_ESTADO,
				ID_MOTIVO,
				DESCRIPCION_MOTIVO,
				USUARIO_MODIFICACION
			];

			// Llamada al procedimiento SP_UPDATE_HERRAMIENTA
			const sqlUpdate = `CALL "AND_HER_DEV"."SP_UPDATE_HERRAMIENTA"(?, ?, ?, ?, ?, ?, ?)`;

			connection.exec(sqlUpdate, paramsUpdate, (err, updateResult) => {
				if (err) {
					console.error('Error al ejecutar SP_UPDATE_HERRAMIENTA:', err);
					connection.disconnect();
					return res.status(500).json({ error: 'Internal server error' });
				}

				// Parámetros para SP_INSERT_HERRAMIENTA_MOVIMIENTO
				const paramsMovimiento = [
					ID_HERRAMIENTA,
					ID_ESTADO,
					null,  // P_OBSERVACION
					ID_MOTIVO, //  P_ID_ESTADO
					DESCRIPCION_MOTIVO,
					null,  // P_SOLICITADO_POR
					null,  // P_ASIGNADO_POR
					null,  // P_EVALUADO_POR
					null,  // P_DESPACHADO_POR
					null,  // P_RECEPCIONADO_POR
					null,  // P_NRO_PROYECTO
					USUARIO_MODIFICACION,
					"CREACION"  // P_ACCION
				];

				// Llamada al procedimiento SP_INSERT_HERRAMIENTA_MOVIMIENTO
				const sqlInsertMovimiento = `CALL "AND_HER_DEV"."SP_INSERT_HERRAMIENTA_MOVIMIENTO"(?,?,?,?,?,?,?,?,?,?,?,?,?)`;

				connection.exec(sqlInsertMovimiento, paramsMovimiento, (err, insertResult) => {
					connection.disconnect();
					if (err) {
						console.error('Error al ejecutar SP_INSERT_HERRAMIENTA_MOVIMIENTO:', err);
						return res.status(500).json({ error: 'Internal server error' });
					}

					res.json({ success: true, message: 'Operación completada exitosamente' });
				});
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
};

exports.listMantenimientos = (req, res) => {
	console.info(req.headers);
	console.info(req.params);

	const { page, pageSize } = req.query;

	// Valores predeterminados para la paginación
	const pPage = page ? parseInt(page, 10) : 1;
	const pPageSize = pageSize ? parseInt(pageSize, 10) : 10;

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				return console.error("Connection error", err);
			}

			const paramsResult = [
				pPage,
				pPageSize
			];

			const paramsCount = [
				pPageSize
			];
			const sql = `CALL "AND_HER_DEV"."SP_LIST_MANTENIMIENTO_HERRAMIENTA_COUNT" (?)`;

			connection.exec(sql, paramsCount, (err, rows) => {
				if (err) {
					console.error('SQL execute error:', err);
					connection.disconnect();
					return res.status(500).json({ error: 'Internal server error' });
				}

				const [output] = rows;
				const { TOTAL_RECORDS, TOTAL_PAGES } = output;

				// Hacer la segunda llamada para obtener los resultados de la tabla
				const sqlSecondCall = `CALL "AND_HER_DEV"."SP_LIST_MANTENIMIENTO_HERRAMIENTA"(?, ?)`;

				connection.exec(sqlSecondCall, paramsResult, (err, secondRows) => {
					connection.disconnect();
					if (err) {
						console.error('SQL execute error:', err);
						return res.status(500).json({ error: 'Internal server error' });
					}
					console.log('MANTENIMIENTOS: ', secondRows)

					res.json({
						REGISTROS_TOTALES: TOTAL_RECORDS,
						PAGINAS_TOTALES: TOTAL_PAGES,
						MANTENIMIENTOS: secondRows
					});
				});
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.disconnect();
	}
};

exports.insertOrEditMantenimientoHerramienta = (req, res) => {
	console.info(req.headers);
	console.info(req.body);

	const {
		ID_MANTENIMIENTO_HERRAMIENTA,
		ID_HERRAMIENTA,
		FECHA_MANTENIMIENTO,
		ID_TIPO_MANTENIMIENTO,
		DESCRIPCION_MANTENIMIENTO,
		ID_TIPO_CERTIFICADO,
		CERTIFICADO,
		PROVEEDOR,
		URL_DOCUMENTO,
		ID_ESTADO,
		USUARIO
	} = req.body;

	/*ID_MANTENIMIENTO_HERRAMIENTA = 8,
	ID_HERRAMIENTA=0,
	FECHA_MANTENIMIENTO = '2024-04-17',
	ID_TIPO_MANTENIMIENTO =2117,
	DESCRIPCION_MANTENIMIENTO='rutina' ,
	ID_TIPO_CERTIFICADO =2120,
	CERTIFICADO = 'Copia',
	PROVEEDOR = 'Demo',
	URL_DOCUMENTO= 'URL',
	ID_ESTADO=null,
	USUARIO = 'ADMIN'*/

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				console.error("Connection error", err);
				return res.status(500).json({ error: 'Internal server error' });
			}

			const params = [
				ID_MANTENIMIENTO_HERRAMIENTA || null,
				ID_HERRAMIENTA,
				FECHA_MANTENIMIENTO,
				ID_TIPO_MANTENIMIENTO,
				DESCRIPCION_MANTENIMIENTO,
				ID_TIPO_CERTIFICADO,
				CERTIFICADO,
				PROVEEDOR,
				URL_DOCUMENTO,
				ID_ESTADO,
				USUARIO
			];


			const sql = `CALL "AND_HER_DEV"."SP_INSERT_EDIT_MANTENIMIENTO_HERRAMIENTA"(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

			connection.exec(sql, params, (err, rows) => {
				connection.disconnect();
				if (err) {
					console.error('SQL execute error:', err);
					return res.status(500).json({ error: 'Internal server error' });
				}
				res.json({ success: true, message: 'Operación completada exitosamente' });
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.disconnect();
	}
};

exports.deleteMantenimientoHerramienta = (req, res) => {
	console.info(req.headers);
	console.info(req.body);

	const {
		ID_MANTENIMIENTO_HERRAMIENTA,
	} = req.body;

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				console.error("Connection error", err);
				return res.status(500).json({ error: 'Internal server error' });
			}

			const params = [
				ID_MANTENIMIENTO_HERRAMIENTA
			];


			const sql = `CALL "AND_HER_DEV"."SP_DELETE_MANTENIMIENTO_HERRAMIENTA"(?)`;

			connection.exec(sql, params, (err, rows) => {
				connection.disconnect();
				if (err) {
					console.error('SQL execute error:', err);
					return res.status(500).json({ error: 'Internal server error' });
				}
				res.json({ success: true, message: 'Operación completada exitosamente' });
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.disconnect();
	}
};

exports.listHistorico = (req, res) => {
	console.info(req.headers);
	console.info(req.params);

	const { idHerramienta, page, pageSize } = req.query;

	//idHerramienta=1

	// Valores predeterminados para la paginación
	const pPage = page ? parseInt(page, 10) : 1;
	const pPageSize = pageSize ? parseInt(pageSize, 10) : 10;

	try {
		connection.connect(connectionParams, (err) => {
			if (err) {
				return console.error("Connection error", err);
			}

			let paramsResult = [
				idHerramienta,
				pPage,
				pPageSize
			];

			const paramsCount = [
				idHerramienta,
				pPageSize
			];
			const sql = `CALL "AND_HER_DEV"."SP_LIST_HERRAMIENTA_MOVIMIENTO_COUNT" (?,?)`;

			connection.exec(sql, paramsCount, (err, rows) => {
				if (err) {
					console.error('SQL execute error:', err);
					connection.disconnect();
					return res.status(500).json({ error: 'Internal server error' });
				}

				const [output] = rows;
				const { TOTAL_RECORDS, TOTAL_PAGES } = output;

				// Hacer la segunda llamada para obtener los resultados de la tabla
				const sqlSecondCall = `CALL "AND_HER_DEV"."SP_LIST_HERRAMIENTA_MOVIMIENTO"(?,?,?)`;

				connection.exec(sqlSecondCall, paramsResult, (err, secondRows) => {
					connection.disconnect();
					if (err) {
						console.error('SQL execute error:', err);
						return res.status(500).json({ error: 'Internal server error' });
					}
					console.log('HISTORICO: ', secondRows)

					res.json({
						REGISTROS_TOTALES: TOTAL_RECORDS,
						PAGINAS_TOTALES: TOTAL_PAGES,
						HISTORICO: secondRows
					});
				});
			});
		});
	} catch (err) {
		console.error('Error connecting to the database:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.disconnect();
	}
};

