const { parallel } = require("async");
const { ConnectionInstance } = require("../config/dataBaseConnection.js");
const axios = require('axios');
const QUERY = {
  findAll: `SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."DESPACHO";`,
  detalleSolicitud: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_detalle_solicitud($1::VARCHAR);`,
  detalleDocumento: `
  select 
  ptd.valor as tipo_documento,  
  pta.valor as tipo_actividad,
  ptg.valor as tipo_gasto,
  ptm.valor as tipo_moneda,
  sd.* 
  FROM "anddesgastos".solicitud_detalle sd
  left join "anddesgastos".parametro ptd on sd.id_tipo_documento = ptd.id_parametro and ptd.tabla ='TIPO_DOCUMENTO' and ptd.parametro = 'FILA'
  left join "anddesgastos".parametro pta on sd.id_tipo_actividad = pta.id_parametro and pta.tabla ='TIPO_ACTIVIDAD' and pta.parametro = 'FILA'
  left join "anddesgastos".parametro ptg on sd.id_tipo_gasto  = ptg.id_parametro and ptg.tabla ='TIPO_GASTO' and ptg.parametro = 'FILA'
  left join "anddesgastos".parametro ptm on sd.id_tipo_moneda  = ptm.id_parametro and ptm.tabla ='TIPO_MONEDA' and ptm.parametro = 'FILA'
   where sd.id_solicitud_detalle = $1::INTEGER;`,

  listaLogMovimientos: `
  select 
  id_solicitud_historico,
  id_solicitud,
  usuario,
  estado,
  observacion,
  TO_CHAR(sh.fecha_creacion, 'DD/MM/YYYY')::VARCHAR  AS fecha_creacion
  from "anddesgastos".solicitud_historico sh
  where id_solicitud = $1::INTEGER
  Order BY 
  CASE 
    WHEN sh.estado = 'Creado' THEN 1 
    ELSE 0 
  END,
  sh.fecha_creacion DESC
  LIMIT $2 OFFSET $3;`,

  countListaLogMovimientos: `
  WITH total_count AS (
        SELECT COUNT(*) AS total_records
        from "anddesgastos".solicitud_historico sh
        where id_solicitud = $1::INTEGER
    )
    SELECT 
        total_records,
        CEIL(total_records / $2::float) AS total_pages
    FROM total_count;`,

  listaSolicitudes: `
  SELECT 
    S.id_solicitud,
    S.nro_solicitud,
    TO_CHAR(S.fecha_solicitud, 'DD/MM/YYYY')::VARCHAR  AS fecha_solicitud,
    --'' as fecha_envio_contabilidad,
    S.pais_gasto, 
    S.id_pais_proyecto ,
    s.pais_proyecto as pais_proyecto ,
    --PPP.valor as pais_proyecto ,
    P.cliente,
    p.unidad_minera,
    p.nro_proyecto , 
    S.data_propuesta , 
    s.usuario_solicitante AS usuario_solicitante,
    s.area as area,
    s.tipo_solicitud,
    ptm.valor as tipo_moneda,
    CASE 
        WHEN S.tipo_solicitud IN ('Fondo Fijo', 'Viáticos') THEN S.importe_f_fijo 
        ELSE 
            (SELECT 
                SUM(
                    CASE 
                        WHEN PTM.valor = 'USD' THEN SD.importe_dolares 
                        ELSE SD.importe_moneda_local 
                    END
                )
            FROM "anddesgastos".solicitud_detalle SD
            WHERE SD.id_solicitud = S.id_solicitud
              AND (SD.anulado IS NULL OR SD.anulado = false)
            ) 
    END AS importe,
    s.ceco as centro_costo,
    PES.valor as estado_solicitud,
    case when S.tipo_solicitud in ('Fondo Fijo', 'Viáticos') then S.ind_activo else '' end as ind_activo,
    S.saldo_pendiente
  FROM "anddesgastos".solicitud S
  left JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
  LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
  left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
  left join "anddesgastos".parametro PPP on s.id_pais_proyecto  = PPP.id_parametro
  WHERE S.fecha_creacion  BETWEEN TO_DATE($1::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($2::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second'
  --AND PES.codigo = 'ES_SOL_AG' --APROBADO POR GERENCIA | ES_SOL_PA
  AND S.anulado_solicitud = false
  AND ($3::VARCHAR IS NULL OR P.nro_proyecto  = $3::VARCHAR)
  AND ($4::VARCHAR IS NULL OR s.tipo_solicitud  = $4::VARCHAR)
  AND ($5::VARCHAR IS NULL OR S.nro_solicitud  = $5::VARCHAR)
  AND ($6::VARCHAR IS NULL OR PES.valor = $6::VARCHAR) --estado solicitud
  AND ($7::VARCHAR IS NULL OR (case when S.tipo_solicitud in ('Rendición - Fondo Fijo','Rendición - Viáticos') then S.ind_activo else '' end) = $7::VARCHAR)
  AND (S.usuario_creacion = $8 or S.usuario_solicitante = $8 )
  Order by s.fecha_creacion desc
  LIMIT $9 OFFSET $10
  ;`,
  //SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."FN_APROBACION_SOLICITUD_LISTA_POR_APROBACION"($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR, $8::VARCHAR);
  countListaSolicitudes: `
  WITH total_count AS (
        SELECT COUNT(*) AS total_records
        FROM "anddesgastos".solicitud S
        left JOIN "anddesgastos".proyecto P ON S.id_proyecto  = P.id_proyecto
        LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda  = PTM.id_parametro and parametro = 'FILA'
        left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
        left join "anddesgastos".parametro PPP on s.id_pais_proyecto  = PPP.id_parametro
        WHERE S.fecha_solicitud  BETWEEN TO_DATE($1::VARCHAR, 'YYYY-MM-DD') AND TO_DATE($2::VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second'
        --AND PES.codigo = 'ES_SOL_AG' --APROBADO POR GERENCIA | ES_SOL_PA
        AND ($3::VARCHAR IS NULL OR P.nro_proyecto  = $3::VARCHAR)
        AND ($4::VARCHAR IS NULL OR s.tipo_solicitud  = $4::VARCHAR)
        AND ($5::VARCHAR IS NULL OR S.nro_solicitud  = $5::VARCHAR)
        AND ($6::VARCHAR IS NULL OR PES.valor = $6::VARCHAR) --estado solicitud
        AND ($7::VARCHAR IS NULL OR S.ind_activo  = $7::VARCHAR)
        AND S.usuario_creacion = $8
    )
    SELECT 
        total_records,
        CEIL(total_records / $9::float) AS total_pages
    FROM total_count;`,
  enviarAprobarFondoFijoViatico: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_enviar_aprobar_fondofijo_viatico($1::VARCHAR, $2::JSONB)`,
  enviarAprobarRendiciones: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_enviar_aprobar_rendiciones($1::VARCHAR, $2::JSONB)`,
  enviarAprobarReembolsos: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_enviar_aprobar_reembolsos($1::VARCHAR, $2::JSONB)`,
  guardarReembolsos: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_guardar_reembolsos($1::VARCHAR, $2::JSONB)`,
  guardarRendiciones: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_guardar_rendiciones($1::VARCHAR, $2::JSONB)`,

  agregarDocumentoRendicion: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_agregar_documento_rendicion($1::JSONB)`,
  agregarDocumentoReembolso: `SELECT * FROM "anddesgastos".fn_mis_solicitudes_agregar_documento_reembolso($1::JSONB)`,

  eliminarDocumentoDetalle: `UPDATE "anddesgastos".solicitud_detalle set anulado = true
                              Where id_solicitud_detalle = $1::INTEGER;`,

  eliminarsolicitudcreada: `
    UPDATE "anddesgastos".solicitud s
    SET anulado_solicitud = true
    WHERE s.nro_solicitud = $1 ;`,
  aprobarSolicitud: `
  SELECT * FROM "anddesgastos".fn_monitor_contabilidad_aprobar_solicitud($1::VARCHAR, $2::VARCHAR)
  `,
  rechazarSolicitud: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_rechazar_solicitud($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  devolverColaborador: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_colaborador($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  devolverGerencia: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_gerencia($1::VARCHAR, $2::VARCHAR, $3::VARCHAR)`,
  datosProyecto: `
  select * from "anddesgastos".proyecto p
  where nro_proyecto = $1;`,
  findNroProyectos: `
  SELECT DISTINCT po.nro_proyecto, po.id_proyecto as  id_proyecto
  FROM "anddesgastos".proyecto po
  --inner join "anddesgastos".solicitud s on po.id_proyecto = s.id_proyecto
  --left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
  where po.flag_activo = true
  ORDER BY nro_proyecto;`,
  findTipoSolicitud: `
  select valor as tipo_solicitud, id_parametro as id_tipo_solicitud from "anddesgastos".parametro
  where tabla = 'TIPO_SOLICITUD'
  and parametro = 'FILA'
  and flag_activo = true;`,
  findTipoTasa: `
  select valor as tipo_tasa, id_parametro as id_tipo_tasa from "anddesgastos".parametro
  where tabla = 'TIPO_TASA'
  and parametro = 'FILA'
  and flag_activo = true;`,
  findImpuestos: `
  select valor as impuesto, id_parametro as id_impuesto from "anddesgastos".parametro
  where tabla = 'PORCENTAJE_IGV'
  and parametro = 'FILA'
  and flag_activo = true;`,
  findUsuariosSolicitantes: `
  select concat(nombre_persona, ' ', apellido_persona)  as usuario_solicitante, email, pais, numero_documento
  from "anddesgastos".persona
 where flag_activo = true;`,
  findUsuariosSolicitantesDatos: `
  SELECT ce_co, area, jefe_inmediato 
  FROM "anddesgastos".persona
  WHERE flag_activo = true
  AND email = $1;`,
  Obtencionvalortipocambio: `
  SELECT valor_tipo_cambio
  FROM "anddesgastos".tipo_cambio
  WHERE codigo_moneda_de = $1
  and codigo_moneda_a = $2
  and fecha_tipo_cambio <= $3
  ORDER BY fecha_tipo_cambio DESC
  LIMIT 1;`,
  validarsolicitudespendientes: `
  SELECT COUNT(*)
  FROM "anddesgastos".solicitud
  WHERE tipo_solicitud IN ('Rendición - Fondo Fijo', 'Rendición - Viáticos')
  AND id_estado_solicitud <> 28
  AND usuario_solicitante = $1;`,
  findPaisGasto: `
 select valor as pais_gasto, id_parametro as id_pais_gasto from "anddesgastos".parametro
 where tabla = 'PAIS_GASTO'
 and parametro = 'FILA'
 and flag_activo = true;`,
  findEstadoSolicitud: `
 select valor as estado_solicitud, id_parametro as id_estado_solicitud from "anddesgastos".parametro
 where tabla = 'ESTADO_SOLICITUD'
 and parametro = 'FILA'
 and flag_activo = true;`,
  findTipoMoneda: `
 select valor as tipo_moneda, id_parametro as id_tipo_moneda from "anddesgastos".parametro
 where tabla = 'TIPO_MONEDA'
 and parametro = 'FILA'
 and flag_activo = true;`,

  findSolicitudesFondosFijos: `
 SELECT s.nro_solicitud
  FROM "anddesgastos".solicitud s
  INNER JOIN "anddesgastos".parametro p ON s.tipo_solicitud = p.valor
  INNER JOIN "anddesgastos".parametro pp ON s.id_estado_solicitud = pp.id_parametro
  WHERE p.codigo = $1
  AND pp.codigo IN ('ES_SOL_AC', 'ES_SOL_ESAP')
  AND (s.usuario_solicitante = $2 OR s.usuario_creacion = $3)
  and ( 
  	($1 = 'T_SOL_FF' and 
  		(select count(1) from "anddesgastos".solicitud sx
			inner join "anddesgastos".parametro es ON sx.id_estado_solicitud = es.id_parametro  and es.tabla = 'ESTADO_SOLICITUD'
			where 
			es.codigo in ('ES_SOL_PA','ES_SOL_AG','ES_SOL_OG','ES_SOL_OC','ES_SOL_C') and 
			sx.id_solicitud_referencia = s.id_solicitud 
      and (sx.anulado_solicitud = false or sx.anulado_solicitud is null)
			) = 0)
	or
			
	($1 = 'T_SOL_V' and 
  		(select count(1) from "anddesgastos".solicitud sx 
			inner join "anddesgastos".parametro es ON sx.id_estado_solicitud = es.id_parametro  and es.tabla = 'ESTADO_SOLICITUD'
			where es.codigo not in ('ES_SOL_RG','ES_SOL_RC')
			and sx.id_solicitud_referencia = s.id_solicitud  
      and (sx.anulado_solicitud = false or sx.anulado_solicitud is null)
			) = 0)		
		)
  AND s.anulado_solicitud = false
  AND s.ind_activo='SI'
  ORDER BY s.id_solicitud DESC;
  --FONDOS FIJOS Y VIATICOS`,

  findTipoDocumento: `
 select valor as tipo_documento, id_parametro as id_tipo_documento, codigo_sap from "anddesgastos".parametro
 where tabla = 'TIPO_DOCUMENTO'
 and parametro = 'FILA'
 and flag_activo = true;`,

  findTipoActividad: `
 select valor as tipo_actividad, id_parametro as id_tipo_actividad from "anddesgastos".parametro
 where tabla = 'TIPO_ACTIVIDAD'
 and parametro = 'FILA'
 and flag_activo = true;`,

  findTipoGasto: `
 select valor as tipo_gasto, id_parametro as id_tipo_gasto, codigo_sap as cuenta_gasto, descripcion_sap as descripcion from "anddesgastos".parametro
 where tabla = 'TIPO_GASTO'
 and parametro = 'FILA'
 and flag_activo = true;`,

  findTipoCambio: `
 select valor_tipo_cambio from "anddesgastos".tipo_cambio
 where codigo_moneda_de = $1::VARCHAR
 and codigo_moneda_a = $2::VARCHAR
 order by fecha_tipo_cambio desc
 limit 1;`,

  findObservacionSolicitud: `
  SELECT sh.usuario, sh.estado, sh.observacion,sh.fecha_creacion
  FROM "anddesgastos".solicitud_historico sh
  JOIN "anddesgastos".solicitud s ON sh.id_solicitud = s.id_solicitud
  WHERE s.nro_solicitud =$1
  ORDER BY 
  CASE 
    WHEN sh.estado = 'Creado' THEN 1 
    ELSE 0 
  END,
  sh.fecha_creacion DESC;`,
  findSolicitantes: `
  SELECT DISTINCT "SOLICITANTE"
  FROM "ANDDES_HERRAMIENTAS_DEV"."SOLICITUD"
  WHERE "ID_ESTADO" = 1
  ORDER BY "SOLICITANTE";`,
  findEntregarA: `
  SELECT DISTINCT "ENTREGAR_A"
FROM "ANDDES_HERRAMIENTAS_DEV"."SOLICITUD"
WHERE "ID_ESTADO" = 1
ORDER BY "ENTREGAR_A";`,
  findRendirPendiente: `
  SELECT 
      s.pais_gasto,
      SUM(CASE WHEN s.id_tipo_moneda = 14 THEN s.saldo_pendiente ELSE 0 END) AS saldo_pendiente_total_soles,
      SUM(CASE WHEN s.id_tipo_moneda = 16 THEN s.saldo_pendiente ELSE 0 END) AS saldo_pendiente_total_dolares
  FROM 
      anddesgastos.solicitud AS s
  JOIN anddesgastos.parametro AS p ON s.id_estado_solicitud = p.id_parametro
  INNER JOIN anddesgastos.persona pp ON s.usuario_solicitante = pp.email
  WHERE 
      s.usuario_solicitante =$1
      --and s.ind_activo = 'SI'
      and p.codigo  in ('ES_SOL_ESAP', 'ES_SOL_ESTE', 'ES_SOL_AC')
      and s.pais_gasto = pp.pais
  GROUP BY 
      s.pais_gasto;`,

  findRazonSocialByRuc: `select p.nombre_proveedor as razonSocial  from anddesgastos.proveedor p where ruc = $1::VARCHAR;`,
  consultarNumeroDocumento: `select sd.nro_documento from anddesgastos.solicitud_detalle sd where sd.nro_documento = $1::VARCHAR;`,
  findSolicitudId: `select p.* from anddesgastos.solicitud p where p.id_solicitud = $1::INTEGER;`,
  actualizarUrlFondoFijoViatico: `update anddesgastos.solicitud set url_documento = $2::VARCHAR where nro_solicitud = $1::VARCHAR;`,
  obtenerIdMaximoSolicitudDetalle: `select max(id_solicitud_detalle) from anddesgastos.solicitud_detalle where id_solicitud = $1;`,
  actualizarUrlRendccionDetalleFondoFijoViatico: `update anddesgastos.solicitud_detalle set url_documento_1 = $2::VARCHAR, url_documento_2 = $3::VARCHAR, url_documento_3 = $4::VARCHAR where id_solicitud_detalle = $1;`
};

exports.findAll = async () => {
  return ConnectionInstance()
    .query(QUERY.findAll)
    .then((resultSet) => {
      let listDespacho = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listDespacho.push(buildDespacho(row));
      }
      return listDespacho;
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });
};

exports.detalleSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var { nro_solicitud
  } = params;


  if (nro_solicitud == "")
    nro_solicitud = null;

  console.log("nro solicitd: " + nro_solicitud)

  return ConnectionInstance()
    .query(QUERY.detalleSolicitud, [
      nro_solicitud
    ])
    .then((resultSet) => {
      console.log("resultset");
      console.log(resultSet.rows[0].fn_mis_solicitudes_detalle_solicitud)

      return { DetalleSolicitud: resultSet.rows[0].fn_mis_solicitudes_detalle_solicitud };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};


exports.detalleDocumento = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    id_solicitud_detalle
  } = params;


  if (id_solicitud_detalle == "")
    id_solicitud_detalle = null;

  return ConnectionInstance()
    .query(QUERY.detalleDocumento, [
      id_solicitud_detalle
    ])
    .then((resultSet) => {
      console.log("resultset");
      console.log(resultSet.rows[0])

      return { DetalleDocumento: resultSet.rows[0] };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};

exports.listaSolicitudes = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    fecha_inicio,
    fecha_fin,
    nro_proyecto = null,
    tipo_solicitud = null,
    nro_solicitud = null,
    estado_solicitud = null,
    ind_activo = null,
    user = null,
    page,
    pageSize
  } = params;


  if (nro_proyecto == "")
    nro_proyecto = null;
  if (tipo_solicitud == "")
    tipo_solicitud = null;
  if (nro_solicitud == "")
    nro_solicitud = null;
  if (estado_solicitud == "")
    estado_solicitud = null;
  if (ind_activo == "")
    ind_activo = null;

  const offsetValue = (page - 1) * pageSize;

  return Promise.all([
    ConnectionInstance().query(QUERY.listaSolicitudes, [fecha_inicio, fecha_fin, nro_proyecto, tipo_solicitud, nro_solicitud,
      estado_solicitud, ind_activo, user, pageSize, offsetValue]),
    ConnectionInstance().query(QUERY.countListaSolicitudes, [fecha_inicio, fecha_fin, nro_proyecto, tipo_solicitud, nro_solicitud,
      estado_solicitud, ind_activo, user, pageSize])
  ]).then(([resultSet, countResultSet]) => {
    let lst = [];
    for (let index in resultSet.rows) {
      let row = resultSet.rows[index];
      lst.push(buildListaSolicitud(row));
    }

    const totalRecords = countResultSet.rows[0].total_records;
    const totalPages = countResultSet.rows[0].total_pages;

    return {
      ListaSolicitudes: lst,
      REGISTROS_TOTALES: totalRecords,
      PAGINAS_TOTALES: totalPages,
    };
  })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting listaSolicitudes");
    });

};

exports.listaLogMovimientos = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    id_solicitud = null,
    page,
    pageSize
  } = params;


  if (id_solicitud == "")
    id_solicitud = null;

  const offsetValue = (page - 1) * pageSize;

  return Promise.all([
    ConnectionInstance().query(QUERY.listaLogMovimientos, [id_solicitud, pageSize, offsetValue]),
    ConnectionInstance().query(QUERY.countListaLogMovimientos, [id_solicitud, pageSize])
  ]).then(([resultSet, countResultSet]) => {
    let lst = [];
    for (let index in resultSet.rows) {
      let row = resultSet.rows[index];
      lst.push(buildListaLogMovimientos(row));
    }

    const totalRecords = countResultSet.rows[0].total_records;
    const totalPages = countResultSet.rows[0].total_pages;

    return {
      ListaLogMovimientos: lst,
      REGISTROS_TOTALES: totalRecords,
      PAGINAS_TOTALES: totalPages,
    };
  })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting ListaLogMovimientos");
    });

};

exports.aprobarSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, usuario
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.aprobarSolicitud, [
        nro_solicitud, usuario
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;

        console.log("mensaje");
        console.log(mensaje);

        return { mensaje: mensaje };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};


exports.enviarAprobarFondoFijoViatico = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    accion, datos
  } = params;

  console.log("params:", params);
  console.log("Datos JSON:", JSON.stringify(datos));

  try {
    return ConnectionInstance()
      .query(QUERY.enviarAprobarFondoFijoViatico, [
        accion, JSON.stringify(datos)
      ])
      .then((resultSet) => {
        console.log(resultSet);
        if (resultSet && resultSet.rowCount > 0) {
          const nro_solicitud = resultSet.rows[0].fn_mis_solicitudes_enviar_aprobar_fondofijo_viatico;
          const mensaje = "Solicitud enviada para aprobación";
          console.log("Mensaje:", mensaje);
          return { mensaje: mensaje, nro_solicitud: nro_solicitud };
        } else {
          console.error("Hubo un error al enviar");
          return { mensaje: "Hubo un error al enviar" };
        }

      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al enviar: " + err.message };
      });
  }
  catch (err) {
    console.error("Error: ", err);
    return { mensaje: "Hubo un error al enviar: " + err.message };
  }

};


exports.rechazarSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, motivo, usuario
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.rechazarSolicitud, [
        nro_solicitud, motivo, usuario
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;

        console.log("mensaje");
        console.log(mensaje);

        return { mensaje: mensaje };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};

exports.enviarAprobarRendiciones = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    accion, datos
  } = params;

  console.log("params:", params);
  console.log("Datos JSON:", JSON.stringify(datos));
  try {
    return ConnectionInstance()
      .query(QUERY.enviarAprobarRendiciones, [
        accion, JSON.stringify(datos)
      ])
      .then((resultSet) => {
        console.log(resultSet);
        console.log("resultSet");
        const nro_solicitud = resultSet.rows[0].fn_mis_solicitudes_enviar_aprobar_rendiciones;
        console.log("nro_solicitud");
        console.log(nro_solicitud);

        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Solicitud enviada para aprobación";
          console.log("Mensaje:", mensaje);
          return {
            nro_solicitud: nro_solicitud,
            mensaje: mensaje
          };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "Hubo un error al enviar" };
        }
        //return { nro_solicitud: nro_solicitud };
      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al enviar: " + err.message };
      });
  }
  catch (err) {
    console.error("Error: ", err);
    return { mensaje: "Hubo un error al enviar: " + err.message };
  }

};
exports.enviarAprobarReembolsos = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    accion, datos
  } = params;

  console.log("params:", params);
  console.log("Datos JSON:", JSON.stringify(datos));
  try {
    return ConnectionInstance()
      .query(QUERY.enviarAprobarReembolsos, [
        accion, JSON.stringify(datos)
      ])
      .then((resultSet) => {
        console.log(resultSet);
        console.log("resultSet");
        const nro_solicitud = resultSet.rows[0].fn_mis_solicitudes_enviar_aprobar_reembolsos;
        console.log("nro_solicitud");
        console.log(nro_solicitud);
        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Solicitud enviada para aprobación";
          console.log("Mensaje:", mensaje);
          return {
            nro_solicitud: nro_solicitud,
            mensaje: mensaje
          };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "Hubo un error al enviar" };
        }

        //return { nro_solicitud: nro_solicitud };

      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al enviar: " + err.message };
      });
  }
  catch (err) {
    console.error("Error: ", err);
    return { mensaje: "Hubo un error al enviar: " + err.message };
  }

};

exports.guardarReembolsos = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    accion, datos
  } = params;

  console.log("params:", params);
  console.log("Datos JSON:", JSON.stringify(datos));
  try {
    return ConnectionInstance()
      .query(QUERY.guardarReembolsos, [
        accion, JSON.stringify(datos)
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const nro_solicitud = resultSet.rows[0].fn_mis_solicitudes_guardar_reembolsos;

        console.log("nro_solicitud");
        console.log(nro_solicitud);

        return { nro_solicitud: nro_solicitud };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};

exports.guardarRendiciones = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    accion, datos
  } = params;

  console.log("params:", params);
  console.log("Datos JSON:", JSON.stringify(datos));
  try {
    return ConnectionInstance()
      .query(QUERY.guardarRendiciones, [
        accion, JSON.stringify(datos)
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const nro_solicitud = resultSet.rows[0].fn_mis_solicitudes_guardar_rendiciones;

        console.log("nro_solicitud");
        console.log(nro_solicitud);

        return { nro_solicitud: nro_solicitud };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};


exports.rechazarSolicitud = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, motivo, usuario
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.rechazarSolicitud, [
        nro_solicitud, motivo, usuario
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;

        console.log("mensaje");
        console.log(mensaje);

        return { mensaje: mensaje };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};


exports.devolverColaborador = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, motivo, usuario
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.devolverColaborador, [
        nro_solicitud, motivo, usuario
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;

        console.log("mensaje");
        console.log(mensaje);

        return { mensaje: mensaje };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};



exports.devolverGerencia = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud, motivo, usuario
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.devolverGerencia, [
        nro_solicitud, motivo, usuario
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const mensaje = resultSet.rows[0].mensaje;

        console.log("mensaje");
        console.log(mensaje);

        return { mensaje: mensaje };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

};
exports.datosProyecto = async (params) => {
  console.log("entra repository datos proyecto")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nro_proyecto
  } = params;


  if (nro_proyecto == "")
    nro_proyecto = null;

  console.log("nro nro_proyecto: " + nro_proyecto)

  return ConnectionInstance()
    .query(QUERY.datosProyecto, [
      nro_proyecto
    ])
    .then((resultSet) => {
      console.log("resultset");
      console.log(resultSet.rows[0])

      return { DatosProyecto: resultSet.rows[0] };

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};
exports.agregarDocumentoRendicion = async (params) => {
  try {
    const { documento } = params;
    const conn = ConnectionInstance();

    const rs = await conn.query(QUERY.agregarDocumentoRendicion, [
      JSON.stringify(documento)
    ]);

    const { id_solicitud, nro_solicitud } = rs.rows[0];

    // Ojo con strings: "0" -> 0; NaN queda falsy también
    let id_solicitud_detalle = Number(documento.id_solicitud_detalle);

    if (!id_solicitud_detalle) {
      const rMax = await conn.query(QUERY.obtenerIdMaximoSolicitudDetalle, [id_solicitud]);
      id_solicitud_detalle = rMax.rows[0].max;
    }

    return { id_solicitud, nro_solicitud, id_solicitud_detalle };
  } catch (err) {
    console.error("Error:", err);
    throw new Error("Error getting agregarDocumentoRendicion");
  }
};



exports.agregarDocumentoReembolso = async (params) => {
try{
  const {
    documento
  } = params;
  const conn = ConnectionInstance();

    const rs = await conn.query(QUERY.agregarDocumentoReembolso, [
      JSON.stringify(documento)
    ]);
    const { id_solicitud, nro_solicitud } = rs.rows[0];
    let id_solicitud_detalle = Number(documento.id_solicitud_detalle);

    if (!id_solicitud_detalle) {
      const rMax = await conn.query(QUERY.obtenerIdMaximoSolicitudDetalle, [id_solicitud]);
      id_solicitud_detalle = rMax.rows[0].max;
    }

    return { id_solicitud, nro_solicitud, id_solicitud_detalle };

}catch(err){
  throw new Error("Error getting agregarDocumentoReembolso");
}
  
  

};

exports.eliminarDocumentoDetalle = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    id_solicitud_detalle
  } = params;

  console.log("params:", params);
  try {
    return ConnectionInstance()
      .query(QUERY.eliminarDocumentoDetalle, [
        id_solicitud_detalle
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const rowCount = resultSet.rowCount;

        console.log("rowCount");
        console.log(rowCount);

        return { rowCount: rowCount };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting eliminarDocumentoDetalle");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting eliminarDocumentoDetalle");
  }

};

exports.eliminarsolicitudcreada = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_solicitud
  } = params;

  console.log("params:", params);
  try {
    return ConnectionInstance()
      .query(QUERY.eliminarsolicitudcreada, [
        nro_solicitud
      ])
      .then((resultSet) => {
        console.log(resultSet);

        console.log("resultSet");
        const rowCount = resultSet.rowCount;

        console.log("rowCount");
        console.log(rowCount);

        return { rowCount: rowCount };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting eliminarsolicitudcreada");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting eliminarsolicitudcreada");
  }

};

exports.validarRuc = async (ruc) => {
  try {
    console.log(`Validando RUC ${ruc} en BD...`);

    const resultSet = await ConnectionInstance().query(QUERY.findRazonSocialByRuc, [ruc]);

    if (resultSet.rows.length === 0) {
      return {
        existe: false,
        message: `El RUC ${ruc} no está registrado en SAP.`,
      };
    }

    // Si quieres devolver también la razón social
    const razonSocial = resultSet.rows[0].razonsocial;

    return {
      existe: true,
      message: razonSocial,
    };

  } catch (error) {
    console.error("Error al consultar SAP:", error.message);
    throw new Error("No se pudo validar el RUC en SAP");
  }
};
exports.despachoListaUnidadMedida = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nombre_tabla
  } = params;

  return ConnectionInstance()
    .query(QUERY.despachoListaUnidadMedida, [
      nombre_tabla
    ])
    .then((resultSet) => {
      console.log(resultSet.rows);
      const listaUnidadMedida = resultSet.rows.map(row => ({
        ID_PARAMETRO: row.nro_solicitud,
        CODIGO: row.fecha_solicitud,
        VALOR: row.empresa
      }));

      //return {  listaUnidadMedida };
      return resultSet.rows.map(row => ({
        ID_PARAMETRO: row.id_parametro,
        CODIGO: row.codigo,
        VALOR: row.valor
      }));;

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });

};

exports.findNroProyectos = async () => {
  console.log("entra repository")
  return ConnectionInstance().query(QUERY.findNroProyectos, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildNroProyecto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nro de Proyectos");
    });
};

exports.findTipoSolicitud = async () => {
  return ConnectionInstance().query(QUERY.findTipoSolicitud, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoSolicitud(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nombre de Proyectos");
    });
};

exports.findTipoTasa = async () => {
  return ConnectionInstance().query(QUERY.findTipoTasa, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoTasa(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nombre de Proyectos");
    });
};

exports.findImpuestos = async () => {
  return ConnectionInstance().query(QUERY.findImpuestos, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildImpuesto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Nombre de Proyectos");
    });
};
exports.findUsuariosSolicitantes = async () => {
  return ConnectionInstance().query(QUERY.findUsuariosSolicitantes, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildUsuarioSolicitante(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting usuarios solicitantes");
    });
};
exports.findUsuariosSolicitantesDatos = async (params) => {
  console.log("entra repository datos ususario solicitante")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nombre_persona
  } = params;

  if (nombre_persona == "")
    nombre_persona = null;

  console.log("Nom nom_usuario: " + nombre_persona)

  return ConnectionInstance()
    .query(QUERY.findUsuariosSolicitantesDatos, [
      nombre_persona
    ])
    .then((resultSet) => {
      console.log("resultset");
      //console.log(resultSet.rows[0])
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildUsuarioSolicitanteDatos(row));
      }
      return {
        DatosUsuario: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting usuarios solicitantes datos");
    });
};
exports.Obtencionvalortipocambio = async (params) => {
  console.log("entra repository datos ususario solicitante")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    codigo_moneda_de,
    codigo_moneda_a,
    fecha_tipo_cambio
  } = params;

  if (codigo_moneda_de == "") {
    codigo_moneda_de = null;
  }

  if (codigo_moneda_a == "") {
    codigo_moneda_a = null
  }

  if (fecha_tipo_cambio == "") {
    fecha_tipo_cambio = null
  }

  console.log("Nom nom_usuario: " + codigo_moneda_de)

  return ConnectionInstance()
    .query(QUERY.Obtencionvalortipocambio, [
      codigo_moneda_de, codigo_moneda_a, fecha_tipo_cambio
    ])
    .then((resultSet) => {
      console.log("resultset");
      //console.log(resultSet.rows[0])
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildObtencionvalortipocambio(row));
      }
      return {
        DatosValorCambio: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting valor tipo de cambio ");
    });
};

exports.validarsolicitudespendientes = async (params) => {
  console.log("entra repository datos ususario solicitante")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    usuario_creacion
  } = params;

  if (usuario_creacion == "") {
    usuario_creacion = null;
  }

  console.log("Nom nom_usuario: " + usuario_creacion)

  return ConnectionInstance()
    .query(QUERY.validarsolicitudespendientes, [
      usuario_creacion
    ])
    .then((resultSet) => {
      console.log("resultset");
      console.log(resultSet);
      // retonar la cantidad de solicitudes pendientes de redicion
      return resultSet.rows[0].count;
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting valor tipo de cambio ");
    });
};

exports.findPaisGasto = async () => {
  return ConnectionInstance().query(QUERY.findPaisGasto, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildPaisGasto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting pais gastos");
    });
};
exports.findEstadoSolicitud = async () => {
  return ConnectionInstance().query(QUERY.findEstadoSolicitud, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildEstadoSolicitud(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting estado solicitudes");
    });
};
exports.findTipoMoneda = async () => {
  return ConnectionInstance().query(QUERY.findTipoMoneda, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoMoneda(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Tipo moenda");
    });
};

exports.findSolicitudesFondosFijos = async (params) => {
  console.log("entra repository")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var { tipo_solicitud, usuario_solicitante, usuario_sesion } = params;

  console.log("tipo_solicitud:", tipo_solicitud);
  console.log("usuario_solicitante:", usuario_solicitante);
  console.log("usuario_sesion:" + usuario_sesion)

  return ConnectionInstance()
    .query(QUERY.findSolicitudesFondosFijos, [tipo_solicitud, usuario_solicitante, usuario_sesion])
    .then((resultSet) => {
      console.log(resultSet.rows)
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildSolicitudesFondosFijos(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findSolicitudesFondosFijos");
    });
};

exports.findTipoDocumento = async () => {
  return ConnectionInstance().query(QUERY.findTipoDocumento, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoDocumento(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findTipoDocumento");
    });
};

exports.findTipoActividad = async () => {
  return ConnectionInstance().query(QUERY.findTipoActividad, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoActividad(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findTipoActividad");
    });
};

exports.findTipoGasto = async () => {
  return ConnectionInstance().query(QUERY.findTipoGasto, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildTipoGasto(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Tipo moenda");
    });
};

exports.findTipoCambio = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    tipo_cambio_de,
    tipo_cambio_a
  } = params;

  try {
    return ConnectionInstance()
      .query(QUERY.findTipoCambio, [
        tipo_cambio_de, tipo_cambio_a
      ])
      .then((resultSet) => {
        console.log(resultSet);
        console.log("resultSet");
        var valor_tipo_cambio = 0;
        if (resultSet.rows.length > 0) {
          valor_tipo_cambio = resultSet.rows[0].valor_tipo_cambio;
        }
        return {
          valor_tipo_cambio,
        };
        //const valor_tipo_cambio = resultSet.rows[0].valor_tipo_cambio;

        //console.log("valor_tipo_cambio");
        //console.log(valor_tipo_cambio);

        //return { valor_tipo_cambio };

      })
      .catch((err) => {
        console.error("Error: ", err);
        throw new Error("Error getting despachos");
      });
  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }
};

exports.findSolicitantes = async () => {
  return ConnectionInstance().query(QUERY.findSolicitantes, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildSolicitante(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Solicitantes");
    });
};

exports.findObservacionsolicitud = async (params) => {
  console.log("entra repository datos ususario solicitante")
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nro_solicitud
  } = params;

  if (nro_solicitud == "")
    nro_solicitud = null;

  console.log("Nom nro_solicitud: " + nro_solicitud)

  return ConnectionInstance().
    query(QUERY.findObservacionSolicitud, [
      nro_solicitud
    ]).then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildObservacionSolicitante(row));
      }
      return {
        DatosObservacion: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Observacion Solicitante");
    });
};

exports.findEntregarA = async () => {
  return ConnectionInstance().query(QUERY.findEntregarA, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildEntregarA(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Entregar A");
    });
};


const buildListaSolicitud = (row) => {
  return {
    id_solicitud: row.id_solicitud,
    nro_solicitud: row.nro_solicitud,
    fecha_solicitud: row.fecha_solicitud,
    pais_gasto: row.pais_gasto,
    id_pais_proyecto: row.id_pais_proyecto,
    pais_proyecto: row.pais_proyecto,
    cliente: row.cliente,
    unidad_minera: row.unidad_minera,
    nro_proyecto: row.nro_proyecto,
    data_propuesta: row.data_propuesta,
    usuario_solicitante: row.usuario_solicitante,
    area: row.area,
    tipo_solicitud: row.tipo_solicitud,
    tipo_moneda: row.tipo_moneda,
    importe: row.importe,
    centro_costo: row.centro_costo,
    estado_solicitud: row.estado_solicitud,
    ind_activo: row.ind_activo,
    saldo_pendiente: row.saldo_pendiente

  };
};

const buildListaLogMovimientos = (row) => {
  return {
    id_solicitud_historico: row.id_solicitud_historico,
    id_solicitud: row.id_solicitud,
    usuario: row.usuario,
    estado: row.estado,
    observacion: row.observacion,
    fecha_creacion: row.fecha_creacion
  };
};

const buildNroProyecto = (row) => {
  return {
    id_proyecto: row.id_proyecto,
    nro_proyecto: row.nro_proyecto,
  };
};

const buildTipoSolicitud = (row) => {
  return {
    id_tipo_solicitud: row.id_tipo_solicitud,
    tipo_solicitud: row.tipo_solicitud,
  };
};

const buildTipoTasa = (row) => {
  return {
    id_tipo_tasa: row.id_tipo_tasa,
    tipo_tasa: row.tipo_tasa,
  };
};

const buildImpuesto = (row) => {
  return {
    id_impuesto: row.id_impuesto,
    impuesto_solicitud: row.impuesto,
  };
};

const buildUsuarioSolicitante = (row) => {
  return {
    usuario_solicitante: row.usuario_solicitante,
    email: row.email,
    pais_solicitante: row.pais,
    numero_documento: row.numero_documento
  };
};

const buildUsuarioSolicitanteDatos = (row) => {
  return {
    ce_co: row.ce_co,
    area: row.area,
    jefe_inmediato: row.jefe_inmediato
  };
};

const buildObtencionvalortipocambio = (row) => {
  return {
    valor_tipo_cambio: row.valor_tipo_cambio,
  };
};

const buildPaisGasto = (row) => {
  return {
    id_pais_gasto: row.id_pais_gasto,
    pais_gasto: row.pais_gasto,
  };
};


const buildEstadoSolicitud = (row) => {
  return {
    id_estado_solicitud: row.id_estado_solicitud,
    estado_solicitud: row.estado_solicitud,
  };
};

const buildTipoMoneda = (row) => {
  return {
    id_tipo_moneda: row.id_tipo_moneda,
    tipo_moneda: row.tipo_moneda,
  };
};

const buildTipoDocumento = (row) => {
  return {
    id_tipo_documento: row.id_tipo_documento,
    tipo_documento: row.tipo_documento,
    codigo_sap: row.codigo_sap
  };
};
const buildTipoActividad = (row) => {
  return {
    id_tipo_actividad: row.id_tipo_actividad,
    tipo_actividad: row.tipo_actividad,
  };
};
const buildTipoGasto = (row) => {
  return {
    id_tipo_gasto: row.id_tipo_gasto,
    tipo_gasto: row.tipo_gasto,
    cuenta_gasto: row.cuenta_gasto,
    descripcion: row.descripcion
  };
};

const buildSolicitudesFondosFijos = (row) => {
  return {
    //id_parametro : row.id_parametro,
    nro_solicitud: row.nro_solicitud,
    usuario_solicitante: row.usuario_solicitante
  };
};

const buildSolicitante = (row) => {
  return {
    SOLICITANTES: row.SOLICITANTE,
  };
};

const buildObservacionSolicitante = (row) => {
  return {
    fecha_creacion: row.fecha_creacion,
    usuario: row.usuario,
    estado: row.estado,
    observacion: row.observacion,
  };
};

const buildEntregarA = (row) => {
  return {
    ENTREGAR_A: row.ENTREGAR_A,
  };
};

const buildDespacho = (row) => {
  return {
    id: row.ID_DESPACHO,
    idSolicitud: row.ID_SOLICITUD,
  };
};



exports.findPendienteRendir = async (params) => {
  console.log(params);
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    usuario_creacion
  } = params;

  if (usuario_creacion == null)
    return "debe ingresar usuario";


  return ConnectionInstance().
    query(QUERY.findRendirPendiente, [
      usuario_creacion
    ]).then((resultSet) => {
      let row = resultSet.rows[0];
      return row;
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting Observacion Solicitante");
    });
};

exports.consultarDocumento = async (params) => {
  const {
    nroDocumento
  } = params;

  const resultados = await ConnectionInstance()
    .query(QUERY.consultarNumeroDocumento, [
      nroDocumento
    ])

  if (resultados.rows.length === 0) {
    return {
      isExistDocument: false,
      message: "Nuevo documento"
    }
  } else {
    return {
      isExistDocument: true,
      message: "Este documento ya ha sido registrado anteriormente"
    }
  }




}


exports.enviarNotificacionCorreo = async (documentos) => {
  try {
    let tenantID = process.env.TENANT_ID // Get from Azure App Registration
    let oAuthClientID = process.env.CLIENT_ID // Get from Azure App Registration
    let clientSecret = process.env.CLIENT_SECRET // Get from Azure App Registration
    let oAuthToken; // declared, gets defined if successfully fetched

    const resultados = await ConnectionInstance()
    .query(QUERY.findSolicitudId, [
      documentos[0].id_solicitud
    ]);
    const nroSolicitud = resultados.rows[0].nro_solicitud;
    const nombre = resultados.rows[0].usuario_solicitante;

    // Generar la tabla HTML dinámicamente
    let filasTabla = "";
    documentos.forEach(doc => {
      filasTabla += `
        <tr>
          <td style="border:1px solid #ccc;padding:6px;">${doc.nro_documento}</td>
          <td style="border:1px solid #ccc;padding:6px;">${doc.razon_social}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:right;">${doc.tipo_moneda =="PEN"?doc.importe_moneda_local: doc.importe_dolares}</td>
          <td style="border:1px solid #ccc;padding:6px;">${doc.tipo_moneda}</td>
        </tr>`;
    });

    // Armar cuerpo HTML
    let html = `
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#333;">
        <p>Estimado(a) ${nombre},</p>

        <p>Ha registrado los siguientes documentos que superan los 700 soles en la Solicitud de Rendición de Gastos 
        <strong>${nroSolicitud}</strong>:</p>

        <table style="border-collapse:collapse; width:80%; margin-top:10px;">
          <thead>
            <tr style="background-color:#f2f2f2;">
              <th style="border:1px solid #ccc;padding:6px;text-align:left;">Documento</th>
              <th style="border:1px solid #ccc;padding:6px;text-align:right;">Proveedor</th>
              <th style="border:1px solid #ccc;padding:6px;text-align:right;">Importe</th>
              <th style="border:1px solid #ccc;padding:6px;text-align:left;">Moneda</th>
            </tr>
          </thead>
          <tbody>
            ${filasTabla}
          </tbody>
        </table>

        <p style="margin-top:15px;">
          Se deberá generar una solicitud de pedido en SAP por cada documento.
        </p>
        <p style="margin-top:15px;">
          Gestión de solicitudes de pedido - Experto:
          <a href="https://my417165.s4hana.cloud.sap/ui#PurchaseRequisition-maintain&/?sap-iapp-state--history=TASAQXWB3IO29PMDJRQ5RWF1Q7TFIL0BGFPGVIZVC"
          style="color:#0b5ed7; text-decoration:underline;">https://my417165.s4hana.cloud.sap/ui#PurchaseRequisition-maintain&amp;/?sap-iapp-state--history=TASAQXWB3IO29PMDJRQ5RWF1Q7TFIL0BGFPGVIZVC</a> 
        </p>

        <p>Saludos,</p>
      </div>
    `;

    let asunto = `Documentos mayores a 700 soles - Solicitud ${nroSolicitud}`;
   // let destinatario = "miprueba@yopmail.com";
    const destinatarios = ["miprueba@yopmail.com", "logistica@anddes.com", "Facturas.rendiciones@anddes.com",nombre];
    let userFrom = "notificaciones.sap@anddes.com";



    let msgPayload = {
      message: {
        subject: asunto,
        body: {
          contentType: "HTML",
          content: html
        },
        toRecipients: destinatarios.map(address => ({ emailAddress: { address } }))
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
    console.log('Correo enviado: %s', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
}
exports.actualizarAprobarFondoFijoViatico = async (params) => {
  const {
    nro_solicitud,
    url_documento
  } = params;

  return ConnectionInstance()
    .query(QUERY.actualizarUrlFondoFijoViatico, [
      nro_solicitud, url_documento
    ])
    .then((resultSet) => {
      return resultSet.rows[0];
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting actualizarAprobarFondoFijoViatico");
    });
}
exports.actualizarUrlRendicionDetalleFondoFijoViatico = async(params) => {
  const { id_solicitud_detalle, url_documento_1, url_documento_2, url_documento_3 } = params;
  return ConnectionInstance()
  .query(QUERY.actualizarUrlRendccionDetalleFondoFijoViatico, [
    id_solicitud_detalle, url_documento_1, url_documento_2, url_documento_3
  ])
  .then((resultSet) => {
    return resultSet.rows[0];
  })
  .catch((err) => {
    console.error("Error: ", err);
    throw new Error("Error getting actualizarAprobarFondoFijoViatico");
  });

}
exports.actualizarUrlReembolsoPasaje = async(params) => {
  const { id_solicitud_detalle, url_documento_1, url_documento_2, url_documento_3 } = params;
  return ConnectionInstance()
  .query(QUERY.actualizarUrlRendccionDetalleFondoFijoViatico, [
    id_solicitud_detalle, url_documento_1, url_documento_2, url_documento_3
  ])
  .then((resultSet) => {
    return resultSet.rows[0];
  })
  .catch((err) => {
    console.error("Error: ", err);
    throw new Error("Error getting actualizarAprobarFondoFijoViatico");
  });
}