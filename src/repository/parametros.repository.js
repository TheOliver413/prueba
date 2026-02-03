const axios = require('axios'); // Asegúrate de tener axios instalado y requerido
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const { ConnectionInstance, ConnectionInstance_le } = require("../config/dataBaseConnection.js");

const QUERY = {
    create: `
    INSERT INTO "anddesgastos".parametro (
      codigo,
      tabla,
      valor,
      codigo_sap,
      usuario_creacion,
      fecha_hora_creacion,
      parametro,
      flag_activo,
      descripcion_sap
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)
    RETURNING *;
  `,
    update: `
    UPDATE "anddesgastos".parametro
    SET
      codigo = $1,
      tabla = $2,
      valor = $3,
      codigo_sap = $4,
      usuario_creacion = $5,
      fecha_hora_creacion = $6,
      descripcion_sap = $7
    WHERE id_parametro = $8
    RETURNING *;
  `,
    delete: `
    DELETE FROM anddesgastos.parametro
    WHERE id_parametro = $1
    RETURNING *;
  `
};
exports.ConnectionInstance = function () {
    return connection;
};

exports.saveParametros = async (params) => {
    try {


        try {
            if (params.id == null) {//CREAR
                delete params.id;
                console.log(params)
                const values = [
                    params.codigo,
                    params.tabla,
                    params.valor,
                    params.codigo_sap,
                    params.usuario_creacion,
                    params.fecha_hora_creacion,
                    params.parametro,
                    params.flag_activo,
                    params.descripcion_sap
                ];
                const result = await ConnectionInstance().query(QUERY.create, values);
                console.log("Resultado de la función:", result.rows[0]);

                return result.rows[0];
            } else {//MODIFICAR
                const values = [
                    params.codigo,
                    params.tabla,
                    params.valor,
                    params.codigo_sap,
                    params.usuario_creacion,
                    params.fecha_hora_creacion,
                    params.descripcion_sap,
                    params.id // <-- identificador
                ];

                const result = await ConnectionInstance().query(QUERY.update, values);
                console.log("Registro actualizado:", result.rows[0]);

                return result.rows[0];

            }
        } finally {
        }

    } catch (err) {
        console.error("Error al consumir el servicio o la base de datos:", err);
        throw new Error("Error en el proceso de inserción o consulta a SAP.");
    }
};

exports.deleteParametro = async (id) => {
    try {
        try {
            const result = await ConnectionInstance().query(QUERY.delete, [id]);

            if (result.rowCount === 0) {
                throw new Error(`No se encontró ningún parámetro con ID ${id}`);
            }

            return result.rows[0]; // Devuelve el registro eliminado
        } finally {

        }

    } catch (err) {
        console.error("Error al eliminar el parámetro:", err);
        throw err;
    }
};