const axios = require('axios'); // Asegúrate de tener axios instalado y requerido
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const { ConnectionInstance, ConnectionInstance_le } = require("../config/dataBaseConnection.js");

const QUERY = {
  insertarProveedor: `SELECT "anddesgastos".fn_job_insertar_proveedores($1::JSONB);`,
  insertarProyectos: `SELECT "anddesgastos".FN_JOB_INSERTAR_PROYECTOS($1::JSONB);`,
  insertarPersonas: `SELECT "anddesgastos".fn_job_insertar_personas($1::JSONB);`,
  obtenerProyectoLE: `
	select 
      numero_proyecto_anddes as "NRO_PROYECTO",
      nombre_proyecto as "NOMBRE_PROYECTO",
      cliente_proyecto as "CLIENTE",
      coalesce(pceco.valor_parametro,'') as "CE_CO_PROYECTO",	
      coalesce(pceco_beneficio.valor_parametro,'') as "CE_CO_BENEFICIO",	
      coalesce(pgerente.usuario_login ,'') as "GERENTE",
      case when coalesce(pestado.valor_parametro,'-') = 'ACTIVO' then true else false end as "FLAG_ACTIVO",
      unidad_proyecto,
      ppais.valor_parametro as "pais"
      from anddeslistaentregable.proyecto p 
      inner join anddeslistaentregable.parametro pceco on p.id_ceco = pceco.id_parametro
      inner join anddeslistaentregable.parametro pceco_beneficio on p.id_ceco_beneficio = pceco_beneficio.id_parametro
      inner join anddeslistaentregable.usuario pgerente on p.id_gerente_proyecto = pgerente.id_usuario 
      inner join anddeslistaentregable.parametro pestado on p.id_estado_proyecto = pestado.id_parametro
      inner join anddeslistaentregable.parametro ppais on p.id_pais = ppais.id_parametro;`,
 obtenerPersonaLE: `
  select 
      p.nombre_trabajador as "NOMBRE_PERSONA",	
      concat(concat(p.apellido_paterno,' '), p.apellido_materno) as  "APELLIDO_PERSONA",	
      p.email_empresa as "EMAIL",	
      coalesce(pcargo.valor_parametro,'') as "CARGO",	
      case when pestado.valor_parametro = 'Activo' then true else false end as "FLAG_ACTIVO",	
      coalesce(p.codigo_trabajador, '') as "NUMERO_DOCUMENTO",
      parea.valor_parametro as "AREA",
      p.cod_ccosto as "CECO",
      p2.email_empresa as "JEFE_INMEDIATO",
      coalesce(p.cod_auxiliar_cont,'') as "COD_AUX_CONT",
      pa.valor_parametro as "PAIS_PERSONA"
      from anddeslistaentregable.personal p 
      left join anddeslistaentregable.parametro pcargo on p.id_cargo = pcargo.id_parametro
      left join anddeslistaentregable.parametro pestado on p.id_estado_laboral = pestado.id_parametro
      left join anddeslistaentregable.parametro parea on p.id_area = parea.id_parametro
      left join anddeslistaentregable.personal p2 on p.id_jefe_inmediato = p2.id
      left join anddeslistaentregable.parametro pa on p.id_pais = pa.id_parametro;
   `,
listaEstadoAprobacion: `
    select
    s."tipo_solicitud", 
    s."id_solicitud", 
    s."nro_solicitud", 
    s."usuario_solicitante",
    concat(per."nombre_persona", ' ', per."apellido_persona") as "nombre_solicitante",
    concat(per2."nombre_persona", ' ', per2."apellido_persona") as "nombre_gerente",
    per2.email as "correo_gerente",
    s."flag_notificacion_sap"
    from "anddesgastos"."solicitud" s
    inner join "anddesgastos"."parametro" p 
        on p."id_parametro" = s."id_estado_solicitud"
    inner join "anddesgastos"."persona" per
        on per."email" = s."usuario_solicitante"
    inner join "anddesgastos"."persona" per2
        on per2."email" = s."gerente_proyecto"
    where p."codigo" = $1 
        AND s."flag_notificacion_sap" = FALSE
   `,
};

exports.sincronizarProveedor = async () => {
  // Paso 1: Consumir el servicio SAP
  try {
    //'https://my411404-api.s4hana.cloud.sap/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_Supplier'
      const sapResponse = await axios.get(process.env.URL_SAP_PROV, {
          headers: {
              'Accept': 'application/xml',
          },
          auth: {
              username: process.env.USR_SAP_PROV,
              password: process.env.PWD_SAP_PROV
          }
      });

      const xmlData = sapResponse.data;

      // Parsear XML a JSON
      parser.parseString(xmlData, async (err, result) => {
          if (err) {
              console.error('Error al convertir XML a JSON:', err);
          } else {
              console.log('Datos en JSON:', result.feed.entry);
          }
          //console.log('Datos en JSON:', result.feed.entry[0].content[0]['m:properties'][0]['d:Codigo'][0]);

          // Acceso a los datos del JSON
          const entries = result.feed.entry;

          var proveedores = [];

          

          entries.forEach((item, index) => {
              const properties = item.content[0]['m:properties'][0];

              const codigo_proveedor = properties['d:Supplier'][0];
              let ruc = "";

              if (properties['d:TaxNumber1'][0] && properties['d:TaxNumber1'][0].trim() !== "") {
                ruc = properties['d:TaxNumber1'][0];
              } else if (properties['d:TaxNumber2'][0] && properties['d:TaxNumber2'][0].trim() !== "") {
                ruc = properties['d:TaxNumber2'][0];
              } else if (properties['d:TaxNumber3'][0] && properties['d:TaxNumber3'][0].trim() !== "") {
                ruc = properties['d:TaxNumber3'][0];
              } else if (properties['d:TaxNumber4'][0] && properties['d:TaxNumber4'][0].trim() !== "") {
                ruc = properties['d:TaxNumber4'][0];
              } else if (properties['d:TaxNumber5'][0] && properties['d:TaxNumber5'][0].trim() !== "") {
                ruc = properties['d:TaxNumber5'][0];
              }

              const nombre_proveedor = properties['d:SupplierName'][0];
              //const descripcionAdicional = properties['d:DescripcionAdicional'][0];
              //const modelo = properties['d:DenominacionTipo'][0]; 

              console.log(`Activo ${index + 1}:`);
              console.log(`Codigo de proveedor: ${codigo_proveedor}`);
              console.log(`Ruc: ${ruc}`);
              console.log(`Nombre proveedor: ${nombre_proveedor}`);

              proveedores.push({
                  codigo_proveedor: codigo_proveedor,
                  ruc: ruc,
                  nombre_proveedor: nombre_proveedor
              });
          });

          //console.log(proveedores);

          const resultSet = await ConnectionInstance().query(QUERY.insertarProveedor, [
              JSON.stringify(proveedores)
          ]);
  
          // Verifica el resultado de la función
          console.log("Resultado de la inserción", resultSet.rows[0].fn_job_insertar_proveedores);

          // Si el resultado es exitoso
          if (resultSet.rows[0].fn_job_insertar_proveedores === 'Inserción completada exitosamente') {
              return {
                  STATUS: true,
                  MESSAGE: "Inserción completada exitosamente"
              };
          } else {
              return {
                  STATUS: false,
                  MESSAGE: resultSet.rows[0].fn_job_insertar_proveedores  // Devuelve el error específico
              };
          }

      });
      return;
  } catch (err) {
      console.error("Error al consumir el servicio o la base de datos:", err);
      //throw new Error("Error en el proceso de inserción o consulta a SAP.");
  }
};



exports.insertarProyectos = async () => {
  
    /*Seleccionamos proyectos */
    try {
  
        const proyectosSet = await ConnectionInstance_le().query(QUERY.obtenerProyectoLE, []);
        console.log("resultSet", proyectosSet.rows);
        
        const resultSet = await ConnectionInstance().query(QUERY.insertarProyectos, [
          JSON.stringify(proyectosSet.rows)
        ]);
  
        // Verifica el resultado de la función
        console.log("Resultado de la inserción", resultSet.rows[0].FN_JOB_INSERTAR_PROYECTOS);
  
        // Si el resultado es exitoso
        if (resultSet.rows[0].FN_JOB_INSERTAR_PROYECTOS === 'Inserción completada exitosamente') {
            return {
                STATUS: true,
                MESSAGE: "Inserción completada exitosamente"
            };
        } else {
            return {
                STATUS: false,
                MESSAGE: resultSet.rows[0].FN_JOB_INSERTAR_PROYECTOS  // Devuelve el error específico
            };
        }
  
    } catch (err) {
        console.error("Error al consumir el servicio o la base de datos:", err);
        throw new Error("Error en el proceso de inserción o consulta a SAP.");
    }
  };
  
  exports.insertarPersonas = async () => {
    
    /*Seleccionamos personas */
    try {
  
        const personasSet = await ConnectionInstance_le().query(QUERY.obtenerPersonaLE, []);
        console.log("resultSet", personasSet.rows);
        
        const resultSet = await ConnectionInstance().query(QUERY.insertarPersonas, [
          JSON.stringify(personasSet.rows)
        ]);
  
        // Verifica el resultado de la función
        console.log("Resultado de la inserción", resultSet.rows[0].FN_JOB_INSERTAR_PERSONAS);
  
        // Si el resultado es exitoso
        if (resultSet.rows[0].FN_JOB_INSERTAR_PERSONAS === 'Inserción completada exitosamente') {
            return {
                STATUS: true,
                MESSAGE: "Inserción completada exitosamente"
            };
        } else {
            return {
                STATUS: false,
                MESSAGE: resultSet.rows[0].FN_JOB_INSERTAR_PERSONAS  // Devuelve el error específico
            };
        }
  
    } catch (err) {
        console.error("Error al consumir el servicio o la base de datos:", err);
        throw new Error("Error en el proceso de inserción o consulta a SAP.");
    }
  };

exports.enviarCorreoAprobacion = async() => {
  try {
    const resultSet = await ConnectionInstance().query(QUERY.listaEstadoAprobacion, ["ES_SOL_PA"]);
    let listaAprobaciones = [];
    for (let index in resultSet.rows) {
      let row = resultSet.rows[index];
      console.log(JSON.stringify(row));
      listaAprobaciones.push(buildEnvioCorreo(row));
    }

    if (listaAprobaciones.length > 0) {
      await Promise.all( // Usamos Promise.all para ejecutar las promesas en paralelo
        listaAprobaciones.map(async (aprobacion) => {
          if (esEmailValido(aprobacion.correo_gerente)) {
            console.log(`Enviando correo a: ${aprobacion.correo_gerente}`);
            const asunto = 'Solicitud de aprobación';
            const mensaje = `
              Estimado(a) ${aprobacion.nombre_gerente},<br />
              <br />
              Se ha enviado la solicitud de: ${aprobacion.tipo_solicitud} N°${aprobacion.nro_solicitud} del solicitante: ${aprobacion.nombre_solicitante} para su aprobación.<br />
              <br />
              Atentamente,<br />
              Anddes Rendición de Gastos<br />
              <br />
              IMPORTANTE: Correo generado automáticamente, por favor no responder.
              `;

            await enviarCorreoNotificacion(null, aprobacion.correo_gerente, aprobacion.nro_solicitud, mensaje, asunto);

            // Actualiza el flag de la solicitud después de enviar el correo
            try {
              const query = `
                UPDATE "anddesgastos"."solicitud"
                SET "flag_notificacion_sap" = true
                WHERE "id_solicitud" = $1;
              `;
              await ConnectionInstance().query(query, [aprobacion.id_solicitud]);
              console.log(`Actualizado flag_notificacion_sap para id_solicitud: ${aprobacion.id_solicitud}`);
            } catch (updateError) {
              console.error(`Error al actualizar el flag para id_solicitud ${aprobacion.id_solicitud}:`, updateError);
            }
          } else {
            console.warn(`Correo inválido: ${aprobacion.gerente_proyecto}`);
          }
        })
      );
    } else {
      console.log("No hay solicitudes de aprobación pendientes por enviar.");
    }

  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error en el envio de correo de solicitud");
  }
  
}
const enviarCorreoNotificacion = async (req, destinatario, nroSolicitud, mensaje, asunto) => {
  try {
    //const transporter = app.locals.transporter; // Acceder al transporter desde app.locals
    //const transporter = req; // Acceder al transporter desde app.locals
    
    let tenantID = process.env.TENANT_ID // Get from Azure App Registration
    let oAuthClientID = process.env.CLIENT_ID // Get from Azure App Registration
    let clientSecret = process.env.CLIENT_SECRET // Get from Azure App Registration
    let oAuthToken; // declared, gets defined if successfully fetched

    let userFrom = "notificaciones.sap@anddes.com"
    let msgPayload = {
      //Ref: https://learn.microsoft.com/en-us/graph/api/resources/message#properties
      message: {
        subject: asunto,
        body: {
          contentType: "HTML",
          content: mensaje
        },
        toRecipients: [{ emailAddress: { address: destinatario },
        emailAddress: { address: "mmurguia@csticorp.biz" } }]
      }
    };

    const axios = require('axios'); //using axios as http helper
    await axios({ // Get OAuth token to connect as OAuth client
      method: 'post',
      url: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
      data: new URLSearchParams({
        client_id: oAuthClientID,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      }).toString()
    })
      .then(r => oAuthToken = r.data.access_token)

    let info = await axios({ // Send Email using Microsoft Graph
      method: 'post',
      url: `https://graph.microsoft.com/v1.0/users/${userFrom}/sendMail`,
      headers: {
        'Authorization': "Bearer " + oAuthToken,
        'Content-Type': 'application/json'
      },
      data: msgPayload
    });
    /*
    let info = await transporter.sendMail({
        from: '"rogereys" <mariaguzman4620@gmail.com>',
        to: destinatario,
        subject: asunto,
        text: mensaje,
    });
    */
    console.log('Correo de aprobación enviado: %s', info);
  } catch (error) {
    console.error('Error al enviar el correo de aprobación:', error);
  }
};
const buildEnvioCorreo = (row) => {
  return {
    tipo_solicitud: row.tipo_solicitud,
    nro_solicitud: row.nro_solicitud,
    flag_notificacion_sap: row.flag_notificacion_sap,
    nombre_gerente: row.nombre_gerente,
    nombre_solicitante: row.nombre_solicitante,
    id_solicitud: row.id_solicitud,
    correo_gerente: row.correo_gerente

  }
}
const esEmailValido = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}