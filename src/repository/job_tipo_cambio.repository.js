const axios = require('axios'); // Asegúrate de tener axios instalado y requerido
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const { ConnectionInstance, ConnectionInstance_le } = require("../config/dataBaseConnection.js");

const QUERY={
    insertarTipoCambio: `SELECT "anddesgastos".fn_job_tipo_cambio($1::jsonb);`,
};

exports.InsertarTipoDeCambio = async()=>{

    try {

        const url_sap_t_cambio = process.env.URL_TIP_CAMBIO;
        const fecha_actual = getCurrentDate();
        
        console.log(url_sap_t_cambio + '?$filter=ExchangeRateEffectiveDate%20eq%20datetime%27' + fecha_actual + 'T00:00:00%27');
        const sapResponse = await axios.get(url_sap_t_cambio + '?$filter=ExchangeRateEffectiveDate%20eq%20datetime%27' + fecha_actual + 'T00:00:00%27',{
            headers:{
                'Accept': 'application/json',
            },
            auth:{
                username: process.env.USR_TIP_CAMBIO,
                password: process.env.PWD_TIP_CAMBIO
            }
        });

        console.log(url_sap_t_cambio + '?$filter=ExchangeRateEffectiveDate%20eq%20datetime%27' + fecha_actual + 'T00:00:00%27');
        
        const data =sapResponse.data;

        console.log(data);

        const moneda_origen = data.d.results[0].SourceCurrency; // properties['d:SourceCurrency'][0];
        const moneda_destino = data.d.results[0].TargetCurrency; //properties['d:TargetCurrency'][0];
        const tipo_cambio = data.d.results[0].TipoCambio;; //properties['d:TipoCambio'][0];
        
        console.log("moneda_origen", moneda_origen);
        
        const valoresTipoCambio = [
            {
                moneda_origen,
                moneda_destino,
                tipo_cambio,
                fecha_actual
            },
        ];
        console.log("valoresTipoCambio", JSON.stringify(valoresTipoCambio[0]));
        
        console.log("ConnectionInstance", ConnectionInstance);
        try {
            const resultSet = await ConnectionInstance().query(QUERY.insertarTipoCambio, [JSON.stringify(valoresTipoCambio[0])]);
         console.log("resultSet", resultSet.rows[0].fn_job_tipo_cambio);
        } catch (err) {
        console.error("Error ejecutando el query:", err);
        }

        //const resultSet = await ConnectionInstance().query(QUERY.insertarTipoCambio, [JSON.stringify(valoresTipoCambio[0])])

        //console.log("resultSet", resultSet.rows[0].fn_job_tipo_cambio);

        /*if(resultSet.rows[0].fn_job_tipo_cambio === 'Inserción completada exitosamente'){
            return{
                STATUS:true,
                MESSAGE: "Inserción completada exitosamente"
            };
        }else{
            return{
                STATUS: false,
                MESSAGE: resultSet.rows[0].fn_job_tipo_cambio
            };
        }*/

        //return;
    } catch (error) {
        console.log("Error al consumir el servicio o la base de datos:", err);
        throw new Error("Error en el proceso de inserción o consulta a SAP.");
    }
};

const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses empiezan desde 0
    const day = String(today.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  };