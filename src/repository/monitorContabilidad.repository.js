
const { ConnectionInstance } = require("../config/dataBaseConnection.js");
const PDFDocument = require('pdfkit');  // Importar la librería PDFKit
const path = require('path');  // Para manejar rutas de archivos
const fs = require('fs');  // Si necesitas leer o manejar archivos del sistema
const axios = require('axios');
const xml2js = require('xml2js');
const { forEach } = require("async");
const e = require("express");
const businessSystemID = "JournalEntry_Externo_V2";
const QUERY = {
  findAll: `SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."DESPACHO";`,
  findByCodigoCuentasCompesacion: `SELECT p.valor as cuenta_compensacion FROM "anddesgastos".parametro p WHERE codigo_padre = 'CUENTA_COMPESACION' AND codigo = $1;`,
  detalleSolicitud: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_detalle_solicitud($1::VARCHAR);`,
  detalleSolicitud_pdf: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_detalle_solicitud_pdf($1::VARCHAR);`,
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
   tipoCambio: `SELECT tc.valor_tipo_cambio
FROM "anddesgastos".tipo_cambio tc
ORDER BY fecha_tipo_cambio DESC
LIMIT 1;
`,
findEstadoSolicitudById: `
select * from "anddesgastos".parametro p where valor = $1::VARCHAR and flag_activo = true;`,
  listaSolicitudAprobadoPorGerencia: `
   SELECT 
     S.id_solicitud,
  S.nro_solicitud,
  TO_CHAR(S.fecha_envio_contabilidad, 'DD/MM/YYYY'):: VARCHAR AS fecha_envio_contabilidad,
  TO_CHAR(S.fecha_contabilizacion, 'DD/MM/YYYY'):: VARCHAR AS fecha_contabilizacion,
  S.pais_gasto,
  S.id_pais_proyecto,
  S.pais_proyecto,
  S.cliente,
  S.unidad_minera,
  p.nro_proyecto,
  S.data_propuesta,
  s.usuario_solicitante AS usuario_solicitante,
  s.usuario_creacion AS usuario_creacion,
  S.area,
  s.tipo_solicitud,
  s.codigo_sap,
  s.compensado_sap,
  s.documento_compensacion,
  s.usuario_compensacion,
  S.id_solicitud_referencia,
     (
    SELECT nro_solicitud
      FROM "anddesgastos".solicitud sx
      WHERE sx.id_solicitud = S.id_solicitud_referencia
      AND anulado_solicitud = false
      order by sx.fecha_creacion desc
      limit 1
  )AS nro_solicitud_rendicion_ref,
(
  SELECT es.valor
      FROM "anddesgastos".solicitud sx
      inner join "anddesgastos".parametro es on sx.id_estado_solicitud = es.id_parametro 
      WHERE sx.id_solicitud = S.id_solicitud_referencia
      AND anulado_solicitud = false
      order by sx.fecha_creacion desc
      limit 1 
    )AS estado_solicitud_ref,

case when S.tipo_solicitud = 'Fondo Fijo' then 
    	case when S.id_tipo_moneda <> 16 then
    				case when S.ind_activo = 'SI' and S.id_estado_solicitud <> 146 then
		        		(select S.importe_f_fijo - coalesce(sum(sd.importe_moneda_local), 0) from anddesgastos.solicitud sx 
					    		inner join anddesgastos.solicitud_detalle sd on sx.id_solicitud = sd.id_solicitud 
					    		where sx.id_solicitud_referencia = S.id_solicitud 
					    		and(sd.anulado = false or sd.anulado is null))
					else
					S.importe_f_fijo
					end
              --S.saldo_pendiente 
	    else
	    			case when S.ind_activo = 'SI' and S.id_estado_solicitud <> 146 then
						(select S.importe_f_fijo - coalesce(sum(sd.importe_dolares), 0) from anddesgastos.solicitud sx 
				    		inner join anddesgastos.solicitud_detalle sd on sx.id_solicitud = sd.id_solicitud 
				    		where sx.id_solicitud_referencia = S.id_solicitud 
				    		and(sd.anulado = false or sd.anulado is null))
				    else
				    S.importe_f_fijo
				    end
              --S.saldo_pendiente
end
    else 
	    case when S.tipo_solicitud = 'Viáticos' then
	    	case when S.id_tipo_moneda <> 16 then
					case when sxr.id_estado_solicitud <> 141 then
		  				(select S.importe_f_fijo - coalesce(sum(sd.importe_moneda_local), 0) from anddesgastos.solicitud sx 
			    		inner join anddesgastos.solicitud_detalle sd on sx.id_solicitud = sd.id_solicitud 
			    		where sx.id_solicitud_referencia = S.id_solicitud --and sd.ind_retencion ='N' 
			    		and(sd.anulado = false or sd.anulado is null))
					else
					  0
					end
          				--S.saldo_pendiente 
		    else
		    		case when sxr.id_estado_solicitud <> 141  then
		  				(select S.importe_f_fijo - coalesce(sum(sd.importe_dolares), 0) from anddesgastos.solicitud sx 
			    		inner join anddesgastos.solicitud_detalle sd on sx.id_solicitud = sd.id_solicitud 
			    		where sx.id_solicitud_referencia = S.id_solicitud --and sd.ind_retencion ='N' 
			    		and(sd.anulado = false or sd.anulado is null))
					else
					  0
					end
          --S.saldo_pendiente 
end
	    else
0
end

end  
    AS saldo_sustentar_ref,

  s.flag_proveedor AS proveedor_valido,
    ptm.valor as tipo_moneda,
    CASE 
        WHEN S.tipo_solicitud IN('Fondo Fijo', 'Viáticos') THEN s.importe_f_fijo
ELSE(
  SELECT SUM(
    CASE 
                    WHEN ptm.valor = 'USD' THEN importe_dolares 
                    ELSE importe_moneda_local 
                END
  ) 
            FROM "anddesgastos".solicitud_detalle
            WHERE id_solicitud = s.id_solicitud
            AND(anulado IS NULL OR anulado = FALSE)
) end as importe,
  s.ceco as centro_costo,
  TO_CHAR(S.fecha_envio_tesoreria, 'DD/MM/YYYY'):: VARCHAR AS fecha_envio_tesoreria,
  PES.valor as estado_solicitud,
     case when S.tipo_solicitud in ('Fondo Fijo', 'Viáticos') then S.ind_activo else '' end as ind_activo
   FROM "anddesgastos".solicitud S
   LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto = P.id_proyecto
   LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda = PTM.id_parametro and parametro = 'FILA'
   left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
   left join "anddesgastos".parametro PPP on s.id_pais_proyecto = PPP.id_parametro
   left join "anddesgastos".solicitud sxr on s.id_solicitud = sxr.id_solicitud_referencia 
   WHERE PES.codigo in ('ES_SOL_AC', 'ES_SOL_AG', 'ES_SOL_ESAP', 'ES_SOL_SAPERR', 'ES_SOL_ESTE', 'ES_SOL_SAPERR')--APROBADO POR CONTABILIDAD, APROBADO POR GERENCIA | ES_SOL_PA
   AND S.anulado_solicitud = false
AND($1:: VARCHAR IS NULL OR P.nro_proyecto = $1:: VARCHAR)
AND($2:: VARCHAR IS NULL OR s.nro_solicitud = $2:: VARCHAR)
AND($3:: VARCHAR IS NULL OR S.pais_gasto = $3:: VARCHAR)
AND($4:: VARCHAR IS NULL OR S.cliente = $4:: VARCHAR)
AND($5:: VARCHAR IS NULL OR S.unidad_minera = $5:: VARCHAR)
AND($6:: VARCHAR IS NULL OR S.area = $6:: VARCHAR)
AND($7:: VARCHAR IS NULL OR S.ceco = $7:: VARCHAR)
AND(
  ($8:: VARCHAR IS NULL AND $13:: VARCHAR IS NULL) OR 
       (S.fecha_envio_contabilidad BETWEEN TO_DATE($8:: VARCHAR, 'YYYY-MM-DD') AND TO_DATE($13:: VARCHAR, 'YYYY-MM-DD') + INTERVAL '1 day' - INTERVAL '1 second')
   )
AND($9:: VARCHAR IS NULL OR S.tipo_solicitud = $9:: VARCHAR)
AND($10:: VARCHAR IS NULL OR PES.valor = $10:: VARCHAR)--estado solicitud
AND($11:: BOOLEAN IS NULL OR S.flag_proveedor = $11:: BOOLEAN)
AND($12:: BOOLEAN IS NULL OR S.flag_enviado_sap = $12:: BOOLEAN)
AND($14:: BOOLEAN IS NULL OR S.pendiente_rendicion = $14:: BOOLEAN)
AND($15:: VARCHAR IS NULL OR(case when S.tipo_solicitud in ('Rendición - Fondo Fijo', 'Rendición - Viáticos') then S.ind_activo else '' end) = $15:: VARCHAR)
AND($16:: VARCHAR IS NULL OR S.usuario_solicitante = $16:: VARCHAR)
   Order by s.fecha_creacion desc
   LIMIT $17 OFFSET $18; `,
  //SELECT * FROM "ANDDES_HERRAMIENTAS_DEV"."FN_APROBACION_SOLICITUD_LISTA_POR_APROBACION"($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR, $8::VARCHAR);
  countListaSolicitudAprobadoPorGerencia: `
  WITH total_count AS(
  SELECT COUNT(*) AS total_records
        FROM "anddesgastos".solicitud S
        LEFT JOIN "anddesgastos".proyecto P ON S.id_proyecto = P.id_proyecto
        LEFT JOIN "anddesgastos".parametro PTM ON S.id_tipo_moneda = PTM.id_parametro and parametro = 'FILA'
        left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
        left join "anddesgastos".parametro PPP on s.id_pais_proyecto = PPP.id_parametro
        WHERE PES.codigo in ('ES_SOL_AC', 'ES_SOL_AG', 'ES_SOL_ESAP')--APROBADO POR GERENCIA | ES_SOL_PA
        AND($1:: VARCHAR IS NULL OR P.nro_proyecto = $1:: VARCHAR)
        AND($2:: VARCHAR IS NULL OR s.nro_solicitud = $2:: VARCHAR)
        AND($3:: VARCHAR IS NULL OR S.pais_gasto = $3:: VARCHAR)
        AND($4:: VARCHAR IS NULL OR S.cliente = $4:: VARCHAR)
        AND($5:: VARCHAR IS NULL OR S.unidad_minera = $5:: VARCHAR)
        AND($6:: VARCHAR IS NULL OR S.area = $6:: VARCHAR)
        AND($7:: VARCHAR IS NULL OR S.ceco = $7:: VARCHAR)
        AND(
    ($8:: VARCHAR IS NULL AND $13:: VARCHAR IS NULL) OR 
            (S.fecha_envio_contabilidad BETWEEN TO_DATE($8:: VARCHAR, 'YYYY-MM-DD') AND TO_DATE($13:: VARCHAR, 'YYYY-MM-DD'))
)
AND($9:: VARCHAR IS NULL OR S.tipo_solicitud = $9:: VARCHAR)
AND($10:: VARCHAR IS NULL OR PES.valor = $10:: VARCHAR)--estado solicitud
AND($11:: BOOLEAN IS NULL OR S.flag_proveedor = $11:: BOOLEAN)
AND($12:: BOOLEAN IS NULL OR S.flag_enviado_sap = $12:: BOOLEAN)
AND($14:: BOOLEAN IS NULL OR S.pendiente_rendicion = $14:: BOOLEAN)
AND($15:: VARCHAR IS NULL OR(case when S.tipo_solicitud in ('Rendición - Fondo Fijo', 'Rendición - Viáticos') then S.ind_activo else '' end) = $15:: VARCHAR)
AND($16:: VARCHAR IS NULL OR S.usuario_solicitante = $16:: VARCHAR)   
        )
SELECT
total_records,
  CEIL(total_records / $17:: float) AS total_pages
    FROM total_count; `,
  aprobarSolicitud: `
SELECT * FROM "anddesgastos".fn_monitor_contabilidad_aprobar_solicitud($1:: VARCHAR, $2:: VARCHAR)
  `,
  compensardocumentosap: `
SELECT * FROM "anddesgastos".fn_monitor_contabilidad_proceso_compensacion($1:: VARCHAR, $2:: VARCHAR, $3:: VARCHAR)
  `,
  validarpoveedores: `
--Si el RUC no existe en la tabla proveedor, flag_proveedor_validado será false
  UPDATE "anddesgastos".solicitud_detalle
  SET flag_proveedor_validado = COALESCE("anddesgastos".proveedor.ruc IS NOT NULL, false)
  FROM "anddesgastos".proveedor
  WHERE "anddesgastos".solicitud_detalle.ruc = "anddesgastos".proveedor.ruc
  OR "anddesgastos".proveedor.ruc IS NULL; --Cuando no hay coincidencia en la tabla proveedor

  update "anddesgastos".solicitud set flag_proveedor = true where id_solicitud in
  (
    select distinct s.id_solicitud 
  from "anddesgastos".solicitud s
where
  (select count(1) from "anddesgastos".solicitud_detalle sd2 where id_solicitud = s.id_solicitud and coalesce(anulado, false) = false and coalesce(flag_proveedor_validado, false) = false) = 0 
  )
  and coalesce(flag_proveedor, false) = false;
`,
  validarpoveedores2: `
BEGIN;
--Paso 1: Actualizar flag_proveedor_validado en solicitud_detalle
  UPDATE "anddesgastos".solicitud_detalle
  SET flag_proveedor_validado = true
  FROM "anddesgastos".proveedor
  WHERE "anddesgastos".solicitud_detalle.ruc = "anddesgastos".proveedor.ruc;
--AND "anddesgastos".solicitud_detalle.anulado in ('false', 'null');

--Paso 2 y 3: Actualizar flag_proveedor en solicitud
  UPDATE "anddesgastos".solicitud
  SET flag_proveedor = true
  WHERE id_solicitud IN(
  SELECT id_solicitud
      FROM "anddesgastos".solicitud_detalle
      WHERE flag_proveedor_validado = true)
  AND "anddesgastos".solicitud.anulado_solicitud = false;
COMMIT;
`,
  rechazarSolicitud: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_rechazar_solicitud($1:: VARCHAR, $2:: VARCHAR, $3:: VARCHAR)`,
  devolverColaborador: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_colaborador($1:: VARCHAR, $2:: VARCHAR, $3:: VARCHAR)`,
  devolverGerencia: `SELECT * FROM "anddesgastos".fn_monitor_contabilidad_devolver_gerencia($1:: VARCHAR, $2:: VARCHAR, $3:: VARCHAR)`,
  grabarImportesDocumentoDetalle: `
  update "anddesgastos".solicitud_detalle set 	importe_moneda_local = $1:: NUMERIC(18, 2),
  importe_dolares = $2:: NUMERIC(18, 2),
    tipo_cambio = $3:: NUMERIC(18, 2),
      base_imponible = $5:: NUMERIC(18, 2),
        igv = $6:: NUMERIC(18, 2),
          exonerado = $7:: NUMERIC(18, 2),
            ruc = $8:: VARCHAR,
              anulado = false,
              id_tipo_documento = $9:: INTEGER,
                nro_documento = $10:: VARCHAR,
                  fecha_documento = $11,
                  id_tipo_actividad = $12,
                  id_tipo_gasto = $13,
                  motivo_gasto = $14,
                  orden_compra = $15,
                  posicion_orden_compra = $16,
                  ind_retencion = $17,
                  id_tipo_tasa = $18,
                  id_impuesto = $19
  where id_solicitud_detalle = $4:: INTEGER; `,
  anularImportesDocumentoDetalle: `
  update "anddesgastos".solicitud_detalle set 	importe_moneda_local = $1:: NUMERIC(18, 2),
  importe_dolares = $2:: NUMERIC(18, 2),
    tipo_cambio = $3:: NUMERIC(18, 2),
      base_imponible = $5:: NUMERIC(18, 2),
        igv = $6:: NUMERIC(18, 2),
          exonerado = $7:: NUMERIC(18, 2),
            ruc = $8:: VARCHAR,
              anulado = true,
              motivo_anulacion = $9
  where id_solicitud_detalle = $4:: INTEGER; `,

  findNroProyectos: `
  SELECT DISTINCT po.nro_proyecto, po.id_proyecto as id_proyecto
  FROM "anddesgastos".proyecto po
--inner join "anddesgastos".solicitud s on po.id_proyecto = s.id_proyecto
--left join "anddesgastos".parametro PES on s.id_estado_solicitud = PES.id_parametro
  where po.flag_activo = true
  ORDER BY nro_proyecto; `,
  findTipoSolicitud: `
  select valor as tipo_solicitud, id_parametro as id_tipo_solicitud from "anddesgastos".parametro
  where tabla = 'TIPO_SOLICITUD'
  and parametro = 'FILA'
  and flag_activo = true; `,
  findUsuariosSolicitantes: `
  select concat(nombre_persona, ' ', apellido_persona) as usuario_solicitante, email 
  from "anddesgastos".persona
 where flag_activo = true; `,
  findPaisGasto: `
 select valor as pais_gasto, id_parametro as id_pais_gasto from "anddesgastos".parametro
 where tabla = 'PAIS_GASTO'
 and parametro = 'FILA'
 and flag_activo = true; `,
  findEstadoSolicitud: `
 select valor as estado_solicitud, id_parametro as id_estado_solicitud from "anddesgastos".parametro
 where tabla = 'ESTADO_SOLICITUD'
 and parametro = 'FILA'
 and flag_activo = true; `,
  findTipoMoneda: `
 select valor as tipo_moneda, id_parametro as id_tipo_moneda from "anddesgastos".parametro
 where tabla = 'TIPO_MONEDA'
 and parametro = 'FILA'
 and flag_activo = true; `,

  findSolicitudesFondosFijos: `
 select s.nro_solicitud from "anddesgastos".solicitud s
 inner join "anddesgastos".parametro p on s.tipo_solicitud = p.valor
 where p.codigo in ('T_SOL_V', 'T_SOL_FF'); --FONDOS FIJOS Y VIATICOS`,

  findTipoDocumento: `
 select valor as tipo_documento, id_parametro as id_tipo_documento from "anddesgastos".parametro
 where tabla = 'TIPO_DOCUMENTO'
 and parametro = 'FILA'
 and flag_activo = true; `,

  findTipoActividad: `
 select valor as tipo_actividad, id_parametro as id_tipo_actividad from "anddesgastos".parametro
 where tabla = 'TIPO_ACTIVIDAD'
 and parametro = 'FILA'
 and flag_activo = true; `,

  findTipoGasto: `
 select valor as tipo_gasto, id_parametro as id_tipo_gasto, codigo_sap, codigo, tabla, descripcion_sap as descripcion from "anddesgastos".parametro
 where tabla = 'TIPO_GASTO'
 and parametro = 'FILA'
 and flag_activo = true; `,
  findTipoRetencion: `
 select valor as tipo_retencion, id_parametro as id_tipo_tasa, codigo_sap, codigo, tabla, descripcion_sap as descripcion from "anddesgastos".parametro
 where tabla = 'TIPO_TASA'
 and parametro = 'FILA'
 and flag_activo = true; `,

  findClientes: `
 SELECT DISTINCT s.cliente
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by cliente; `,
  findUnidadMinera: `
 SELECT DISTINCT s.unidad_minera
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by unidad_minera; `,
  findArea: `
 SELECT DISTINCT s.area
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by area; `,
  findCeco: `
 SELECT DISTINCT s.ceco
 FROM "anddesgastos".solicitud s
 where 1 = 1
 group by ceco; `,
  obtenerSolicitudByReferencia: `
select * from "anddesgastos".solicitud s
 inner join "anddesgastos".parametro es ON s.id_estado_solicitud = es.id_parametro  and es.tabla = 'ESTADO_SOLICITUD'
 where id_solicitud_referencia = $1 and es.codigo in ('ES_SOL_PA', 'ES_SOL_AG', 'ES_SOL_OG', 'ES_SOL_OC', 'ES_SOL_C')
  `,
  cerrarFF: `
    update "anddesgastos".solicitud 
    set ind_activo = 'NO'
    where id_solicitud = $1;
`,
  findParametroGeneral: `
 select id_parametro as id_general, codigo as codigo_general, valor as valor_general
 from "anddesgastos".parametro
 where tabla = 'GENERAL'
 and parametro = 'FILA'
 and flag_activo = true; `,
  findSolicitudSAP: `
select
s.id_solicitud,
  s.nro_solicitud,
  s.motivo,
  s.nro_proyecto,
  TO_CHAR(s.fecha_solicitud, 'YYYY-MM-DD') as "fecha_solicitud",
  TO_CHAR(s.fecha_contabilizacion, 'YYYY-MM-DD') as "fecha_contabilizacion",
  TO_CHAR(now(), 'YYYY-MM-DD') as "fecha_actual_corta",
  TO_CHAR(
    NOW() AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) as "fecha_actual_larga",
  s.importe_f_fijo,
  coalesce(p.cod_auxilar_cont, '') as "cod_auxilar_cont",
  s.usuario_solicitante,
  p.email,
  s.tipo_solicitud,
  p2.valor as "moneda",
  s.id_solicitud_referencia,
  s2.nro_solicitud as "nro_solicitud_referencia",
  s2.codigo_sap as "asiento_anticipo",
  p.ce_co,
  CASE 
        WHEN s.nro_proyecto IS NULL THEN '' 
        ELSE regexp_replace(s.nro_proyecto, '[.-]', '', 'g') || '.1.1'
end as "elemento_pep",
  s2.saldo_pendiente,
  s.pais_gasto,
  s.codigo_sap,
  s2.importe_f_fijo - coalesce(
    (select case when p2.valor = 'PEN' then  
  		
  		sum(case when px.valor = 'PEN' then sd.importe_moneda_local else sd.importe_dolares * sd.tipo_cambio end) 
	
  else
    sum(importe_dolares) 
	end
	
	from "anddesgastos".solicitud_detalle sd 
	inner join "anddesgastos".parametro px on px.id_parametro = sd.id_tipo_moneda 
	where sd.id_solicitud = s.id_solicitud and sd.ind_retencion ='N'), 0) as "diferencia_rendicion"
  from "anddesgastos".solicitud s
  left join "anddesgastos".persona p on s.usuario_solicitante = p.email
  left join "anddesgastos".parametro p2 on p2.id_parametro = s.id_tipo_moneda 
  left join "anddesgastos".solicitud s2  on s.id_solicitud_referencia = s2.id_solicitud
  where s.id_solicitud = $1;
`,
  findSolicitudDetalleSAP: `
SELECT
sd.id_solicitud_detalle,
  sd.motivo_gasto,
  sd.id_solicitud,
  sd.nro_documento,
  TO_CHAR(sd.fecha_documento, 'YYYY-MM-DD') AS "fecha_documento",
    sd.ruc,
    sd.razon_social,
    sd.tipo_cambio,
    sd.importe_moneda_local,
    sd.importe_dolares,
    sd.base_imponible,
    sd.igv,
    p2.valor,
    p2.codigo_sap,
    p.codigo_proveedor,
    p3.valor AS "moneda_detalle",
      sd.id_tipo_gasto,
      sd.exonerado,
      p4.valor tipo_documento,
        CASE 
    WHEN p3.valor = 'USD' THEN sd.importe_dolares * (
  SELECT tc.valor_tipo_cambio 
      FROM anddesgastos.tipo_cambio tc 
      WHERE fecha_tipo_cambio <= sd.fecha_documento 
      ORDER BY fecha_tipo_cambio DESC 
      LIMIT 1
    )
    ELSE sd.importe_moneda_local 
  END AS "importe_final_tc",
  sd.orden_compra,
  sd.posicion_orden_compra,
  sd.ind_retencion,
  sd.id_tipo_tasa,
  p5.codigo_sap AS "codigo_retencion" 
FROM anddesgastos.solicitud_detalle sd
LEFT JOIN(
    SELECT DISTINCT ON(ruc) *
  FROM anddesgastos.proveedor
  ORDER BY ruc, id_proveedor-- ajusta esto si tienes otro campo para determinar cuál es el "primero"
  ) p ON sd.ruc = p.ruc
LEFT JOIN anddesgastos.parametro p2 ON sd.id_impuesto = p2.id_parametro 
LEFT JOIN anddesgastos.parametro p3 ON p3.id_parametro = sd.id_tipo_moneda
INNER JOIN anddesgastos.parametro p4 ON sd.id_tipo_documento = p4.id_parametro
LEFT JOIN anddesgastos.parametro p5 ON sd.id_tipo_tasa = p5.id_parametro 
WHERE sd.id_solicitud = $1
AND(sd.anulado IS NULL OR sd.anulado = FALSE);
`,
  findSolicitudDetalleMontoGasto:
    `select sd.motivo_gasto  from "anddesgastos".solicitud_detalle sd where sd.id_solicitud = $1 and(anulado is null or anulado = false)`
  ,
  actualizarEstadoSAPOk: `
    update "anddesgastos".solicitud 
    set id_estado_solicitud = (select id_parametro from "anddesgastos".parametro p where tabla = 'ESTADO_SOLICITUD'  and codigo = 'ES_SOL_ESAP'),
codigo_sap = $2
    where id_solicitud = $1;
`,
actualizarEstadoSapError: `
    update "anddesgastos".solicitud 
    set id_estado_solicitud = (select id_parametro from "anddesgastos".parametro p where tabla = 'ESTADO_SOLICITUD'  and codigo = 'ES_SOL_SAPERR'),
codigo_sap = $2
    where id_solicitud = $1;
`,
  updateEnviarTesoreria: `
    update "anddesgastos".solicitud 
    set id_estado_solicitud = (select id_parametro from "anddesgastos".parametro p where tabla = 'ESTADO_SOLICITUD'  and codigo = 'ES_SOL_ESTE'), fecha_envio_tesoreria = $2
    where id_solicitud = $1;
`,
  actualizarHistoricoEstadoSAP: `
    insert into "anddesgastos".solicitud_historico
  (id_solicitud, usuario, estado, observacion, fecha_creacion)
values($1, $2, $3, $4, now());
`,
  updateFechaContabilizacionSolicitud: `
    UPDATE "anddesgastos".solicitud
    SET fecha_contabilizacion = $1
    WHERE id_solicitud = $2;
`,
  registrarLogIntegraciones: `
    insert into "anddesgastos".log_integraciones
  (origen, content_type, trama)
values($1, $2, $3);
`,
 updateUUIDSolicitud: `
    update "anddesgastos".solicitud 
    set uuid_compensacion = $1
    where nro_solicitud = $2;
`
};

exports.validarCierreFF = async (params) => {
  console.log(params);

  var {
    id_solicitud
  } = params;

  return ConnectionInstance()
    .query(QUERY.obtenerSolicitudByReferencia, [
      id_solicitud
    ])
    .then((resultSet) => {
      console.log("resultset");
      return { Solicitudes: resultSet.rows };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting solicitud monitor");
    });
};

exports.cierreFF = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    id_solicitud,
    usuario
  } = params;

  console.log("params:", params);

  try {

    // Consulta de la solicitud
    const solicitud = await ConnectionInstance().query(QUERY.findSolicitudSAP, [id_solicitud]);
    if (!solicitud.rows || solicitud.rows.length === 0) {
      throw new Error("Solicitud no encontrada");
    }

    const solicitud_detalle = await ConnectionInstance().query(QUERY.findSolicitudDetalleSAP, [id_solicitud]);

    // Consulta de parámetros generales
    const tipoGastos = await ConnectionInstance().query(QUERY.findTipoGasto);
    if (!tipoGastos.rows || tipoGastos.rows.length === 0) {
      throw new Error("tipoGastos no encontrados");
    }

    // Consulta de parámetros generales
    const parametros = await ConnectionInstance().query(QUERY.findParametroGeneral);
    if (!parametros.rows || parametros.rows.length === 0) {
      throw new Error("Parámetros generales no encontrados");
    }

    var respuesta = 0;
    // Validar tipo de solicitud
    const tipoSolicitud = solicitud.rows[0]?.tipo_solicitud;


    var bodyDesembolso = await generarXMLDesembolsoCierreFF(parametros.rows, solicitud.rows, tipoSolicitud, tipoGastos.rows);
    var respuestaDesembolso = await send2SAP(bodyDesembolso);

    if (respuestaDesembolso.code == 0) {
      return respuestaDesembolso.code;
    }
    else {
      var bodyCompensacion = await generarXMLCompensacionCierreFF(parametros, solicitud.rows, tipoSolicitud, tipoGastos.rows, respuestaDesembolso.message);
      var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);

      if (respuestaCompensacion.code == 0) {
        return respuestaCompensacion.code;
      }
      if (respuestaCompensacion.uuid !=undefined) {
             await ConnectionInstance().query(QUERY.updateUUIDSolicitud, [respuestaCompensacion.uuid, solicitud]);
      }
    }

    await ConnectionInstance()
      .query(QUERY.cerrarFF, [id_solicitud
      ])

    return 1;

  }
  catch (err) {
    console.error("Error: ", err);
    throw new Error("Error getting despachos");
  }

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
  var {
    nro_solicitud
  } = params;


  if (nro_solicitud == "")
    nro_solicitud = null;

  return ConnectionInstance()
    .query(QUERY.detalleSolicitud, [
      nro_solicitud
    ])
    .then((resultSet) => {
      console.log("resultset");
      console.log(resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud)

      return { DetalleSolicitud: resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud };

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

exports.listaSolicitudAprobadoPorGerencia = async (params) => {
  console.log("entra repository")
  // Asegurarse de que todas las propiedades están bien definidas
  var {
    nro_proyecto = null,
    nro_solicitud = null,
    pais_gasto = null,
    cliente = null,
    unidad_minera = null,
    area = null,
    ceco = null,

    fecha_envio_contabilidad_inicio = null,
    tipo_solicitud = null,
    estado_solicitud = null,
    flag_proveedor = null,
    flag_enviado_sap = null,

    fecha_envio_contabilidad_fin = null,
    pendiente_rendicion = null,

    ind_activo = null,

    usuario_solicitante = null,

    page,
    pageSize
  } = params;


  if (nro_proyecto == "")
    nro_proyecto = null;
  if (nro_solicitud == "")
    nro_solicitud = null;
  if (pais_gasto == "")
    pais_gasto = null;
  if (cliente == "")
    cliente = null;
  if (unidad_minera == "")
    unidad_minera = null;
  if (area == "")
    area = null;
  if (ceco == "")
    ceco = null;

  if (fecha_envio_contabilidad_inicio == "")
    fecha_envio_contabilidad_inicio = null;
  if (tipo_solicitud == "")
    tipo_solicitud = null;
  if (estado_solicitud == "")
    estado_solicitud = null;
  if (flag_proveedor == "")
    flag_proveedor = null;
  if (flag_enviado_sap == "")
    flag_enviado_sap = null;

  if (ind_activo == "")
    ind_activo = null;

  if (fecha_envio_contabilidad_fin == "")
    fecha_envio_contabilidad_fin = null;
  if (pendiente_rendicion == "")
    pendiente_rendicion = null;

  if (usuario_solicitante == "")
    usuario_solicitante = null;

  const offsetValue = (page - 1) * pageSize;


  return Promise.all([
    ConnectionInstance().query(QUERY.listaSolicitudAprobadoPorGerencia, [
      nro_proyecto,
      nro_solicitud,
      pais_gasto,
      cliente,
      unidad_minera,
      area,
      ceco,

      fecha_envio_contabilidad_inicio,
      tipo_solicitud,
      estado_solicitud,
      flag_proveedor,
      flag_enviado_sap,

      fecha_envio_contabilidad_fin,
      pendiente_rendicion, ind_activo, usuario_solicitante, pageSize, offsetValue
    ]),
    ConnectionInstance().query(QUERY.countListaSolicitudAprobadoPorGerencia, [
      nro_proyecto,
      nro_solicitud,
      pais_gasto,
      cliente,
      unidad_minera,
      area,
      ceco,

      fecha_envio_contabilidad_inicio,
      tipo_solicitud,
      estado_solicitud,
      flag_proveedor,
      flag_enviado_sap,

      fecha_envio_contabilidad_fin,
      pendiente_rendicion, ind_activo, usuario_solicitante, pageSize
    ])
  ]).then(([resultSet, countResultSet]) => {
    let lst = [];
    for (let index in resultSet.rows) {
      let row = resultSet.rows[index];
      lst.push(buildListaSolicitud(row));
    }

    const totalRecords = countResultSet.rows[0].total_records;
    const totalPages = countResultSet.rows[0].total_pages;

    return {
      ListaSolicitudesAprobadoPorGerencia: lst,
      REGISTROS_TOTALES: totalRecords,
      PAGINAS_TOTALES: totalPages,
    };
  })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting ListaSolicitudesAprobadoPorGerencia");
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

exports.compensardocumentosap = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    nro_documento, usuario_registra, nro_solicitud
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.compensardocumentosap, [
        nro_documento, usuario_registra, nro_solicitud
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

exports.validarpoveedores = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.validarpoveedores, [
      ])
    /*.then((resultSet) => {
        console.log(resultSet);
      return;

    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting despachos");
    });*/
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


exports.grabarImportesDocumentoDetalle = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle, 
    base_imponible, igv, exonerado, ruc, id_tipo_documento, nro_documento, 
    fecha_documento, id_tipo_actividad, id_tipo_gasto, motivo_gasto, orden_compra,
    posicion_orden_compra,ind_retencion,id_tipo_tasa,id_impuesto
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.grabarImportesDocumentoDetalle, [
        importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle, 
        base_imponible, igv, exonerado, ruc, id_tipo_documento, nro_documento, 
        fecha_documento, id_tipo_actividad, id_tipo_gasto, motivo_gasto,
        orden_compra, posicion_orden_compra,ind_retencion,id_tipo_tasa,id_impuesto
      ])
      .then((resultSet) => {
        console.log(resultSet);
        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Se grabo correctamente.";
          console.log("Mensaje:", mensaje);
          return { mensaje: mensaje };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "No se pudo realizar la accion." };
        }

      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al actualizar: " + err.message };
      });
  }
  catch (err) {
    console.error("Error: ", err);
    return { mensaje: "Hubo un error al actualizar: " + err.message };
  }

};


exports.anularImportesDocumentoDetalle = async (params) => {
  console.log("entra repository")
  console.log(params);

  const {
    importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle, base_imponible, igv, exonerado, ruc, motivo_anulacion
  } = params;

  console.log("params:", params);

  try {
    return ConnectionInstance()
      .query(QUERY.anularImportesDocumentoDetalle, [
        importe_moneda_local, importe_dolares, tipo_cambio, id_solicitud_detalle, base_imponible, igv, exonerado, ruc, motivo_anulacion
      ])
      .then((resultSet) => {
        console.log(resultSet);

        if (resultSet && resultSet.rowCount > 0) {
          const mensaje = "Se Anulo correctamente el documento.";
          console.log("Mensaje:", mensaje);
          return { mensaje: mensaje };
        } else {
          console.error("No se pudo realizar la accion.");
          return { mensaje: "No se pudo realizar la accion." };
        }

      })
      .catch((err) => {
        console.error("Error: ", err);
        return { mensaje: "Hubo un error al actualizar: " + err.message };
      });
  }
  catch (err) {
    console.error("Error: ", err);
    return { mensaje: "Hubo un error al actualizar: " + err.message };
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

exports.findSolicitudesFondosFijos = async () => {
  return ConnectionInstance().query(QUERY.findSolicitudesFondosFijos, [])
    .then((resultSet) => {
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

exports.findClientes = async () => {
  return ConnectionInstance().query(QUERY.findClientes, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildClientes(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findClientes");
    });
};

exports.findUnidadMinera = async () => {
  return ConnectionInstance().query(QUERY.findUnidadMinera, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildUnidadMinera(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findUnidadMinera");
    });
};

exports.findArea = async () => {
  return ConnectionInstance().query(QUERY.findArea, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildArea(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findArea");
    });
};

exports.findCeco = async () => {
  return ConnectionInstance().query(QUERY.findCeco, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(buildCeco(row));
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting findCeco");
    });
};

exports.downloadPdf = async (data, res) => {
  console.log("ENTRA REPOSITORIO PARA GENERAR PDF");

  //Extraemos los parametros que requerimos para la consulta 
  var nro_solicitud = data.datos_cabecera_pdf.nro_solicitud
  var fecha = new Date();
  var dia = String(fecha.getDate()).padStart(2, '0');   // Asegura que tenga 2 dígitos
  var mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0, así que sumamos 1
  var año = fecha.getYear();
  var fecha_formateada = `${ dia } -${ mes } -${ año } `;

  //Realizamos una consulta para traer la data necesaria para poder generar el PDF
  console.log("-----Extracion de datos para generar el PDF-----")

  var DatosDetallePDF;
  await ConnectionInstance().query(QUERY.detalleSolicitud_pdf, [nro_solicitud
  ]).then((resultSet) => {
    console.log("resultset");
    //console.log(resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud)
    DatosDetallePDF = resultSet.rows[0].fn_monitor_contabilidad_detalle_solicitud_pdf;
  })

  console.log("-----------------Datos del Detalle del PDF-----------------")
  console.log(DatosDetallePDF)

  const doc = new PDFDocument({ margin: 40 });
  console.log("ENTRA AQUI 1");

  // Establecer los encabezados de la respuesta para que el navegador lo maneje como un archivo descargable
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="download.pdf"');
  console.log("ENTRA AQUI 2");

  // Pipe el PDF a la respuesta HTTP
  doc.pipe(res);
  console.log("ENTRA AQUI 3");

  // Crear encabezado con la imagen de la empresa
  const logoPath = path.join(__dirname, '../images/anddes-logo.png');
  console.log(logoPath);
  console.log("ENTRA AQUI 4")

  //CABECERA
  doc.rect(50, 40, 130, 100).fillAndStroke("#f5f6f7", "#000").fillColor("#FFF")
    .rect(180, 40, 250, 100).fillAndStroke("#f5f6f7", "#000").fillColor("#030303")
    .text("Administración y Finanzas", 230, 70)
    .text("Rendicion de Gastos", 240, 85)
    .rect(430, 40, 135, 100).fillAndStroke("#f5f6f7", "#000").fillColor("#030303")
    .image(logoPath, 55, 60, { width: 120 });

  // Títulos principales
  doc.fontSize(12)
    .fontSize(10)
    .text(nro_solicitud + "/", 435, 112)
    .text(fecha_formateada, 475, 124);
  doc.moveDown(2);

  doc.rect(430, 100, 135, 0.5).fillAndStroke("#f5f6f7", "#000").fillColor("#030303");

  //Calculando el saldo de la solicitud
  var saldo_solicitud = DatosDetallePDF.Cabecera.importe_solicitud_f_fijo - DatosDetallePDF.Cabecera.importe_total_comprobantes;
  var saldo_total = saldo_solicitud < 0 ? 0 : saldo_solicitud;

  function formatearFechaHora(fechaHora) {
    // Asume que fechaHora está en UTC (como viene del backend)
    const fechaUTC = new Date(fechaHora + 'Z'); // Forzamos a interpretarla como UTC

    const opciones = {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const formateador = new Intl.DateTimeFormat('es-CO', opciones);
    const partes = formateador.formatToParts(fechaUTC);

    const obtener = tipo => partes.find(p => p.type === tipo)?.value;

    return `${ obtener('year') } -${ obtener('month') } -${ obtener('day') } ${ obtener('hour') }:${ obtener('minute') } `;
  }


  /*var fecha_solicitud = DatosDetallePDF.Cabecera.fecha_solicitud;
  var fecha_date_doc = new Date(fecha_solicitud);
  var dia = String(fecha_date_doc.getDate()).padStart(2, '0');   // Asegura que tenga 2 dígitos
  var mes = String(fecha_date_doc.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0, así que sumamos 1
  var año = fecha_date_doc.getYear(); 

  var horas = String(fecha_date_doc.getHours()).padStart(2, '0');
  var minutos = String(fecha_date_doc.getMinutes()).padStart(2, '0');

  var fecha_formateada = `${ dia } -${ mes } -${ año } ${ horas }:${ minutos } `;*/

  // Cabecera de la solicitud Rendicion de Gastos
  doc.font('Helvetica-Bold')
    .fontSize(10)
    .text(`N° Solicitud: `, 55, 153)
    .text(`Tipo Solicitud: `, 260, 153)
    .text(`Fecha: `, 450, 153)
    .text(`Motivo de Solicitud: `, 55, 170)
    .text(`Usuario que Registra: `, 55, 185)
    .text(`Usuario Solicitante: `, 55, 200);
  /*.text(`Aprobador: `, 55, 241)
  .text(`Fecha Aprobación: `, 340, 241)
  .text(`Aprobador Contabilidad: `, 55, 263)
  .text(`Fecha Aprobación Contabilidad: `, 340, 263);

doc.rect(50, 290, 520, 20).fillAndStroke("#f5f6f7", "#000").fillColor("#030303")
  .text(`Monto recibido: `, 60, 296)
  .text(`Monto rendido: `, 245, 296)
  .text(`Saldo: `, 470, 296);

doc.rect(50, 315, 520, 1).fillAndStroke("#f5f6f7", "#000").fillColor("#030303");*/

  // Mover espacio para la tabla
  doc.moveDown(2);

  doc.font('Helvetica').fontSize(9.5)
    .text(DatosDetallePDF.Cabecera.nro_solicitud, 117, 153, { width: 150, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.tipo_solicitud, 332, 153, { width: 120, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.fecha_solicitud, 485, 153, { width: 100, lineGap: 2 })

    .text(DatosDetallePDF.Cabecera.motivo, 162, 170, { width: 250, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.usuario_registra, 162, 185, { width: 250, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.usuario_solicitante, 152, 200, { width: 250, lineGap: 2 });

  /*.text(DatosDetallePDF.Cabecera.usuario_aprobador_gerencia, 112, 241, { width: 250, lineGap: 2 })
  .text(formatearFechaHora(DatosDetallePDF.Cabecera.fecha_aprobacion_gerencia), 430, 241, { width: 100, lineGap: 2 })

  .text(DatosDetallePDF.Cabecera.usuario_aprobador_contabilidad, 174, 263, { width: 200, lineGap: 2 })
  .text(formatearFechaHora(DatosDetallePDF.Cabecera.fecha_aprobacion_contabilidad), 495, 263, { width: 100, lineGap: 2 })

  .text(DatosDetallePDF.Cabecera.importe_solicitud_f_fijo, 137, 296, { width: 100, lineGap: 2 })
  .text(DatosDetallePDF.Cabecera.importe_total_comprobantes, 322, 296, { width: 100, lineGap: 2 })
  .text(saldo_total.toFixed(2), 505, 296, { width: 100, lineGap: 2 });*/

  let proyHeight = 0;

  //Validacion en caso se haga referencia a un proyecto, de lo contrario se mostrara el area del solicitante
  if (DatosDetallePDF.Cabecera.nro_proyecto == "" && DatosDetallePDF.Cabecera.nombre_proyecto == "") {
    doc.font('Helvetica-Bold')
      .text(`Area: `, 55, 219)
    doc.font('Helvetica')
      .text(DatosDetallePDF.Cabecera.area, 103, 219)
  } else {
    doc.font('Helvetica-Bold')
      .text(`Proyecto: `, 55, 219);

    proyHeight = doc.heightOfString(DatosDetallePDF.Cabecera.nro_proyecto + "  " + DatosDetallePDF.Cabecera.nombre_proyecto);

    doc.font('Helvetica')
      .text(DatosDetallePDF.Cabecera.nro_proyecto + "  " + DatosDetallePDF.Cabecera.nombre_proyecto, 103, 219)
  }

  const offSet = 15;

  const baseY = 219 + proyHeight + offSet;
  const lineHeight = 20;

  doc.font('Helvetica-Bold')
    .fontSize(10)
    .text(`Aprobador: `, 55, baseY)
    .text(`Fecha Aprobación: `, 55, baseY + lineHeight)
    .text(`Aprobador Contabilidad: `, 55, baseY + 2 * lineHeight)
    .text(`Fecha Aprobación Contabilidad: `, 55, baseY + 3 * lineHeight);

  doc.font('Helvetica')
    .text(DatosDetallePDF.Cabecera.usuario_aprobador_gerencia, 112, baseY, { width: 250, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.fecha_aprobacion_gerencia, 145, baseY + lineHeight, { width: 100, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.usuario_aprobador_contabilidad, 175, baseY + 2 * lineHeight, { width: 200, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.fecha_aprobacion_contabilidad, 210, baseY + 3 * lineHeight, { width: 100, lineGap: 2 });

  const rectY = baseY + (4 * lineHeight) + 10;

  doc.rect(50, rectY, 520, 20).fillAndStroke("#f5f6f7", "#000").fillColor("#030303")
    .text(`Monto recibido: `, 60, rectY + 6)
    .text(`Monto rendido: `, 245, rectY + 6)
    .text(`Saldo: `, 470, rectY + 6);

    var saldtotal=parseFloat(parseFloat(DatosDetallePDF.Cabecera.importe_f_fijo)-parseFloat(DatosDetallePDF.Cabecera.importe_total_comprobantes)).toFixed(2);
    //SI ES REEMBOLSO
    if(DatosDetallePDF.Cabecera.tipo_solicitud === 'Reembolso'){
        saldtotal =0;
    }

  doc.font('Helvetica')
    .text(DatosDetallePDF.Cabecera.importe_f_fijo, 137, rectY + 6, { width: 100, lineGap: 2 })
    .text(DatosDetallePDF.Cabecera.importe_total_comprobantes, 322, rectY + 6, { width: 100, lineGap: 2 })
    // .text(saldo_total.toFixed(2), 505, rectY + 6, { width: 100, lineGap: 2 });
    .text(saldtotal, 505, rectY + 6, { width: 100, lineGap: 2 });

  doc.rect(50, rectY, 520, 1).fillAndStroke("#f5f6f7", "#000").fillColor("#030303");

  // Dibujar tabla con bordes de colores y estructura
  const tableTopY = rectY + 30;
  const rowHeight = 30;

  // Encabezado de la tabla con colores
  doc.rect(50, tableTopY, 530, rowHeight).fillAndStroke("#adadad", "#000").fillColor("#030303")
    .font('Helvetica-Bold')
    .fontSize(7)
    .text("Descripción", 65, tableTopY + 10)
    .text("Gasto", 150, tableTopY + 10)
    .text("Fecha", 210, tableTopY + 10)
    .text("Moneda", 255, tableTopY + 10)
    .text("Número de ", 307, tableTopY + 5)
    .text("comprobante", 303, tableTopY + 15)
    .text("Proveedor", 380, tableTopY + 10)
    .text("Neto", 450, tableTopY + 10)
    .text("Otro", 485, tableTopY + 7)
    .text("Imp.", 485, tableTopY + 17)
    .text("IGV", 524, tableTopY + 4)
    .text("(18%)", 521, tableTopY + 11)
    .text("(10%)", 521, tableTopY + 19)
    .text("Monto", 548, tableTopY + 7)
    .text("Total", 550, tableTopY + 17)
  // Dibujar filas

  var DatosDetalleArray = DatosDetallePDF.Detalle;

  console.log("!!!!!!!!!!!! Datos del Detalle !!!!!!!!!!!!");
  console.log(DatosDetalleArray);

  let yPos = tableTopY + rowHeight;

  // Establecer anchos fijos para cada columna
  const columnWidths = {
    descripcion: 60,
    gasto: 60,
    fecha: 50,
    moneda: 50,
    nro_comprobante: 65,
    proveedor: 75,
    neto: 50,
    otro_imp: 50,
    igv: 50,
    monto_total: 60
  };

  // Dibujar encabezados de tabla con líneas separadoras
  DatosDetalleArray.forEach((DatosDetalleArray, index) => {
    //Calcular la altura de la fila segun el contenido mas grandes
    let maxTextHeight = Math.max(
      doc.heightOfString(DatosDetalleArray.motivo_gasto, { width: columnWidths.descripcion }),
      doc.heightOfString(DatosDetalleArray.proveedor, { width: columnWidths.proveedor })
    );

    let rowHeightDynamic = Math.max(maxTextHeight + 10, rowHeight);

    // Dibujar el rectángulo completo de la fila
    doc.fillColor("#000").rect(50, yPos, 530, rowHeightDynamic).stroke();

    // Dibujar líneas para separar cada columna
    doc.lineWidth(0.5); // Establecer el grosor de la línea
    doc.moveTo(50, yPos).lineTo(50, yPos + rowHeightDynamic).stroke(); // Línea de borde izquierdo
    doc.moveTo(125, yPos).lineTo(125, yPos + rowHeightDynamic).stroke(); // Línea después de "Descripción"
    doc.moveTo(195, yPos).lineTo(195, yPos + rowHeightDynamic).stroke(); // Línea después de "Gasto"
    doc.moveTo(250, yPos).lineTo(250, yPos + rowHeightDynamic).stroke(); // Línea después de "Fecha"
    doc.moveTo(290, yPos).lineTo(290, yPos + rowHeightDynamic).stroke(); // Línea después de "Moneda"
    doc.moveTo(365, yPos).lineTo(365, yPos + rowHeightDynamic).stroke(); // Línea después de "Nro. comprobante"
    doc.moveTo(440, yPos).lineTo(440, yPos + rowHeightDynamic).stroke(); // Línea después de "Proveedor"
    doc.moveTo(475, yPos).lineTo(475, yPos + rowHeightDynamic).stroke(); // Línea después de "Neto"
    doc.moveTo(510, yPos).lineTo(510, yPos + rowHeightDynamic).stroke(); // Línea después de "Otro Imp."
    doc.moveTo(545, yPos).lineTo(545, yPos + rowHeightDynamic).stroke(); // Línea después de "IGV"
    //doc.moveTo(740, yPos).lineTo(740, yPos + rowHeight).stroke(); // Línea después de "Monto total"

    //var total_neto = DatosDetalleArray.importe_moneda_local - DatosDetalleArray.igv;
    var monto_total = DatosDetalleArray.tipo_moneda === "USD"
      ? DatosDetalleArray.importe_dolares
      : DatosDetalleArray.importe_moneda_local;
    var fecha_doc_format = DatosDetalleArray.fecha_documento;
    var fecha_partes = fecha_doc_format.split('/')
    var dia = fecha_partes[0];
    var mes = fecha_partes[1];
    var año = fecha_partes[2];
    var fecha_formateada = `${ dia } -${ mes } -${ año } `;
    /*var fecha_date_doc = new Date(fecha_doc_format);
    var dia = String(fecha_date_doc.getDate()).padStart(2, '0');   // Asegura que tenga 2 dígitos
    var mes = String(fecha_date_doc.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0, así que sumamos 1
    var año = fecha_date_doc.getYear();  
    var fecha_formateada = `${ dia } -${ mes } -${ año } `;*/
    // Manejo de columnas
    //doc.text(index + 1, 55, yPos + 5, { width: columnWidths.numero }) // Número de fila
    // Columna "DatosDetalleArray" con ajuste de texto y ancho definido
    doc.font('Helvetica')
      .text(DatosDetalleArray.motivo_gasto, 55, yPos + 5, { width: columnWidths.descripcion })
      .text(DatosDetalleArray.tipo_gasto, 130, yPos + 5, { width: columnWidths.gasto })
      .text(fecha_formateada, 200, yPos + 5, { width: columnWidths.fecha })
      .text(DatosDetalleArray.tipo_moneda, 255, yPos + 5, { width: columnWidths.moneda })
      .text(DatosDetalleArray.nro_documento, 295, yPos + 5, { width: columnWidths.nro_comprobante })
      .text(DatosDetalleArray.proveedor, 370, yPos + 5, { width: columnWidths.proveedor })
      .text(DatosDetalleArray.base_imponible, 445, yPos + 5, { width: columnWidths.neto })
      .text(DatosDetalleArray.exonerado, 480, yPos + 5, { width: columnWidths.otro_imp })
      .text(DatosDetalleArray.igv, 520, yPos + 5, { width: columnWidths.igv })
      .text(monto_total, 550, yPos + 5, { width: columnWidths.monto_total })

    //Observaciones y retorno
    //doc.text(equipo.observaciones, 335, yPos + 5, { width: columnWidths.observaciones })
    //   .text(equipo.estadoRetorno ? "X" : "", 510, yPos + 5, { width: columnWidths.estado });

    // Aumentar la posición Y para la siguiente fila
    yPos += rowHeightDynamic;

    // Si el texto en la columna de equipo es largo, aumentar la altura de la fila
    /*if (doc.heightOfString(DatosDetalleArray.proveedor, { width: columnWidths.proveedor }) > rowHeight) {
        yPos += doc.heightOfString(DatosDetalleArray.proveedor, { width: columnWidths.proveedor }) - rowHeight;
    }*/
  });

    //SE AGREGA EL ESPACIO PARA FIRMAS
    yPos+= 150;
    doc.font('Helvetica')
        .fontSize(10)
        .text(`Solicitado por: `, 55, yPos)
        .text(`Aprobado por: `, 370, yPos);

    yPos+= 15;
    doc.font('Helvetica-Bold').fontSize(9.5)
        .text(DatosDetallePDF.Cabecera.usuario_solicitante, 55, yPos, { width: 250, lineGap: 2 })
        .text(DatosDetallePDF.Cabecera.usuario_aprobador_gerencia, 370, yPos, { width: 250, lineGap: 2 })
        
  // Finalizar el PDF
  doc.end();
  console.log("DEVUELVE PDF")
};

const buildListaSolicitud = (row) => {
  return {
    id_solicitud: row.id_solicitud,
    nro_solicitud: row.nro_solicitud,
    fecha_envio_contabilidad: row.fecha_envio_contabilidad,
    fecha_contabilizacion: row.fecha_contabilizacion,
    pais_gasto: row.pais_gasto,
    id_pais_proyecto: row.id_pais_proyecto,
    pais_proyecto: row.pais_proyecto,

    cliente: row.cliente,
    unidad_minera: row.unidad_minera,
    nro_proyecto: row.nro_proyecto,
    data_propuesta: row.data_propuesta,
    usuario_solicitante: row.usuario_solicitante,
    usuario_creacion: row.usuario_creacion,
    area: row.area,
    tipo_solicitud: row.tipo_solicitud,
    tipo_moneda: row.tipo_moneda,
    importe: row.importe,
    centro_costo: row.centro_costo,
    estado_solicitud: row.estado_solicitud,
    codigo_sap: row.codigo_sap,

    compensado_sap: row.compensado_sap,
    documento_compensacion: row.documento_compensacion,
    usuario_compensacion: row.usuario_compensacion,

    estado_solicitud_ref: row.estado_solicitud_ref,
    nro_solicitud_rendicion_ref: row.nro_solicitud_rendicion_ref,
    saldo_sustentar_ref: row.saldo_sustentar_ref,
    ind_activo: row.ind_activo,

    proveedor_valido: row.proveedor_valido,
    fecha_envio_tesoreria: row.fecha_envio_tesoreria,
    id_solicitud_referencia: row.id_solicitud_referencia,
  };
};

const buildNroProyecto = (row) => {
  return {
    nro_proyecto: row.nro_proyecto,
  };
};

const buildTipoSolicitud = (row) => {
  return {
    tipo_solicitud: row.tipo_solicitud,
  };
};

const buildDespacho = (row) => {
  return {
    id: row.ID_DESPACHO,
    idSolicitud: row.ID_SOLICITUD,
  };
};

const buildClientes = (row) => {
  return {
    cliente: row.cliente,
  };
};


const buildUnidadMinera = (row) => {
  return {
    unidad_minera: row.unidad_minera,
  };
};

const buildArea = (row) => {
  return {
    area: row.area,
  };
};

const buildCeco = (row) => {
  return {
    ceco: row.ceco,
  };
};


const buildUsuarioSolicitante = (row) => {
  return {
    usuario_solicitante: row.usuario_solicitante,
    email: row.email,
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
    codigo_sap: row.codigo_sap,
    codigo: row.codigo,
    tabla: row.tabla,
    descripcion: row.descripcion
  };
};


exports.enviarSAP = async (params) => {
  console.log("entra enviar SAP");
  console.log(params);

  const { id_solicitud, usuario, fecha_contabilizacion, cerrar_ff } = params;

  var respuesta = { code: 0, message: "" };
  var msg ='';


  try {
    // Consulta de la solicitud
    await ConnectionInstance().query(QUERY.updateFechaContabilizacionSolicitud, [fecha_contabilizacion, id_solicitud])

    const solicitud = await ConnectionInstance().query(QUERY.findSolicitudSAP, [id_solicitud]);
    if (!solicitud.rows || solicitud.rows.length === 0) {
      throw new Error("Solicitud no encontrada");
    }

    const solicitud_detalle = await ConnectionInstance().query(QUERY.findSolicitudDetalleSAP, [id_solicitud]);

    // Consulta de parámetros generales
    const tipoGastos = await ConnectionInstance().query(QUERY.findTipoGasto);
    if (!tipoGastos.rows || tipoGastos.rows.length === 0) {
      throw new Error("tipoGastos no encontrados");
    }

    // Consulta de parámetros generales
    const parametros = await ConnectionInstance().query(QUERY.findParametroGeneral);
    if (!parametros.rows || parametros.rows.length === 0) {
      throw new Error("Parámetros generales no encontrados");
    }

    // Validar tipo de solicitud
    const tipoSolicitud = solicitud.rows[0]?.tipo_solicitud;
    if (tipoSolicitud === "Fondo Fijo" || tipoSolicitud === "Viáticos") {
      const body = await generarXMLFF(parametros.rows, solicitud.rows, tipoSolicitud);
      console.log("Body FF:", body);


      var response = await send2SAP(body);

      respuesta.code = response.code;
      respuesta.message = response.message;
      console.log("Respuesta SAP:", respuesta);

      await guardarEstadoSAP(respuesta.code, id_solicitud, usuario, respuesta.message);

      console.log("Estado SAP guardado");
      return respuesta;

    }
    else if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Rendición - Viáticos" || tipoSolicitud === "Pasajes Aéreos/Otros" || tipoSolicitud === "Reembolso") {

      //Validar que la solicitud tenga detalle de tipo Generar Fe
      let envioOCsap = await generarfacturaProveedor(solicitud_detalle.rows,fecha_contabilizacion);
      
      if(envioOCsap.length > 0){
          for (const respuestaOC of envioOCsap) {
              msg += " "+ respuestaOC.message + ' ';
              if(respuestaOC.code !==200){
                  respuesta.message = msg;
                  respuesta.code = 2;
                  return respuesta;
              }
          }
          
      }

      if (!solicitud_detalle.rows || solicitud_detalle.rows.length === 0) {
        throw new Error("Detalle Solicitud no encontrada");
      }
      const nuevosDetalle = [];
      const solicitudesDetalle = solicitud_detalle.rows;
      for (const detalle of solicitudesDetalle) {
        if(detalle.ind_retencion ==="" || detalle.ind_retencion ===null  || detalle.ind_retencion ==="N"){
          nuevosDetalle.push(detalle);
        }
      }
      if(nuevosDetalle.length > 0){
        respuesta = await generarXMLRendicionFF(parametros.rows, solicitud.rows, tipoSolicitud, nuevosDetalle, tipoGastos.rows, cerrar_ff);
      }else{
        respuesta.code = 1;
      }
    }
    else {
      console.warn("Tipo de solicitud no compatible:", tipoSolicitud);
    }
    if(msg!== " "){
      respuesta.message += "-"+msg;
    }
    

    await guardarEstadoSAP(respuesta.code, id_solicitud, usuario, respuesta.message);

    return respuesta;


  } catch (err) {
    console.error("Error en enviarSAP:", err);
    return respuesta;
  }
};

async function guardarEstadoSAP(respuesta, id_solicitud, usuario, mensaje) {
  if (respuesta == 1) {
    await ConnectionInstance().query(QUERY.actualizarEstadoSAPOk, [id_solicitud, mensaje]);
    await ConnectionInstance().query(QUERY.actualizarHistoricoEstadoSAP, [id_solicitud, usuario, 'Enviado a SAP', 'Enviado a SAP']);
  }
  else {

    await ConnectionInstance().query(QUERY.actualizarEstadoSapError, [id_solicitud, mensaje]);
    await ConnectionInstance().query(QUERY.actualizarHistoricoEstadoSAP, [id_solicitud, usuario, 'Error envío a SAP', mensaje]);

  }
};

const generarXMLFF = async (parametros, solicitud, tipoSolicitud) => {

  // Obtener cuentas
  var creditorAccount = null;
  var debtorAccount = null;

  if (tipoSolicitud === "Fondo Fijo") {
    if (solicitud[0].moneda == "PEN") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_FF_PEN");
      debtorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_PEN");
    }
    else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_FF_USD");
      debtorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_USD");
    }
  }

  if (tipoSolicitud === "Viáticos") {
    if (solicitud[0].moneda == "PEN") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_VT_PEN");
      debtorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_PEN");
    }
    else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_VT_USD");
      debtorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_USD");
    }
  }

  if (!creditorAccount || !debtorAccount) {
    throw new Error("Cuentas de acreedor o deudor no encontradas en los parámetros");
  }

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    moneda,
    motivo,
    fecha_contabilizacion,
    elemento_pep,
    nro_proyecto
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));

  const elemento_pep_max_caracteres = elemento_pep.length > 12 ? elemento_pep.substring(0, 12) : elemento_pep;

  const motivoGasto = await ConnectionInstance().query(
    QUERY.findSolicitudDetalleMontoGasto,
    [solicitud[0].id_solicitud]
  );
  let stringMotivoGasto = '';
  if (motivoGasto.rows && motivoGasto.rows.length > 0) {
    stringMotivoGasto = motivoGasto.rows[0].motivo_gasto
  }

  console.log(moneda);
  var xmlr = "";
  xmlr = `
  <soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN">
    <soap:Header/>
    <soap:Body>
      <sfin:JournalEntryBulkCreateRequest>
        <MessageHeader>
          <ID>${nro_solicitud}</ID>
          <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
        </MessageHeader>
        <JournalEntryCreateRequest>
          <MessageHeader>
            <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
            <ID>${nro_solicitud}</ID>
          </MessageHeader>
          <JournalEntry>
            <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
            <BusinessTransactionType>RFBU</BusinessTransactionType>
            <AccountingDocumentType>SA</AccountingDocumentType>
            <CompanyCode>10PE</CompanyCode>
            <DocumentDate>${fecha_actual_corta}</DocumentDate>
            <PostingDate>${fecha_contabilizacion}</PostingDate>
            <CreatedByUser>Rend-Gastos</CreatedByUser>
            <DocumentHeaderText>${motivo.substring(0, 25)}</DocumentHeaderText>
            <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader>
            <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>
            <CreditorItem>
              <ReferenceDocumentItem>1</ReferenceDocumentItem>
              <Creditor>${cod_auxilar_cont}</Creditor>
              <AmountInTransactionCurrency currencyCode="${moneda}">${importe_f_fijo * -1.00}</AmountInTransactionCurrency>
              <DebitCreditCode>H</DebitCreditCode>
              <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts>
              <DocumentItemText>${motivo.substring(0, 50)}</DocumentItemText>
              <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
              <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
            </CreditorItem>
            <DebtorItem>
              <ReferenceDocumentItem>2</ReferenceDocumentItem>
              <Debtor>${cod_auxilar_cont}</Debtor>
              <AmountInTransactionCurrency currencyCode="${moneda}">${importe_f_fijo}</AmountInTransactionCurrency>
              <DebitCreditCode>S</DebitCreditCode>
              <AltvRecnclnAccts>${debtorAccount.valor_general}</AltvRecnclnAccts>
              <DocumentItemText>${motivo.substring(0, 50)}</DocumentItemText>
              <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
              <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
            </DebtorItem>
          </JournalEntry>
        </JournalEntryCreateRequest>
      </sfin:JournalEntryBulkCreateRequest>
    </soap:Body>
  </soap:Envelope>`;
  console.log("LLEGO FONDO", xmlr);

  return xmlr;
};

async function generarXMLRendicionFF(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos, cierreFF) {

  console.log('init generarXMLRendicionFF');
  // Obtener cuentas
  var creditorAccount = null;

  let response = {
    code: 0,
    message: ''
  };

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    elemento_pep,
    saldo_pendiente,
    pais_gasto,
    diferencia_rendicion,
    fecha_contabilizacion,
    motivo,
    nro_proyecto,
    id_solicitud
  } = solicitud[0];

  if (elemento_pep != '') {
    ce_co = '';
  }

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));

  console.log(nro_solicitud_referencia);
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  let nuevoDetalle = [];
  for (const detalle of solicitudDetalle) {

    const {
      id_solicitud_detalle,
      id_solicitud,
      nro_documento,
      fecha_documento,
      ruc,
      razon_social,
      tipo_cambio,
      importe_moneda_local,
      importe_dolares,
      base_imponible,
      igv,
      valor,
      codigo_sap,
      codigo_proveedor,
      moneda_detalle,
      id_tipo_gasto,
      exonerado,
      tipo_documento,
      motivo_gasto
    } = detalle;

    var importe_final = importe_moneda_local;
    var igv_final = igv;
    var base_imponible_final = (base_imponible * 1.00);
    var base_imponible_final_exo = (base_imponible * 1.00) + (exonerado * 1.00);
    let baseImponbibleAjustado = (base_imponible * 1.00);

    let accountingDocumentType = nro_documento.substring(0, 2) == '00' ? 'Z2' : 'KR';

    var detalle_exonerado = '';
    if (exonerado > 0) {
      detalle_exonerado = `
        <ProductTaxItem>
          <TaxCode>C0</TaxCode>
          <TaxItemClassification>VST</TaxItemClassification>
          <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0</AmountInTransactionCurrency><!-- El valor del IGV en Co es siempre 0-->
          <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${exonerado}</TaxBaseAmountInTransCrcy> <!-- El importe exonerado-->
        </ProductTaxItem> 
      `;
    }

    const documentHeaderText = motivo_gasto.substring(0, 25);
    const documentItemText = motivo_gasto.substring(0, 50);

    const elemento_pep_max_caracteres = elemento_pep.length > 12 ? elemento_pep.substring(0, 12) : elemento_pep;

    var codigo_sap_tipo_gasto = tipoGastos.find(row => row.id_tipo_gasto === id_tipo_gasto).codigo_sap;

    if (moneda_detalle != "PEN") {
      importe_final = importe_dolares;
    }

    /*Evaluación */
    if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Pasajes Aéreos/Otros" || tipoSolicitud === "Reembolso") {


      if (tipo_documento != "Recibo por Honorario") {
        if (moneda_detalle == "PEN") {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
        }
        else {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");

        }

        if (solicitud[0].pais_gasto != 'Perú') {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

          if (moneda_detalle != "PEN") {
            importe_final = importe_dolares;
            igv_final = 0;
            base_imponible_final = 0;
          }

        }
      } else {

        if (moneda_detalle == "PEN") {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFFRH_PEN");
        }
        else {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFFRH_USD");
        }

      }
    }

    if (tipoSolicitud === "Rendición - Viáticos") {

      if (solicitud[0].moneda == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }

    }

    if (!creditorAccount) {
      throw new Error("Cuentas de acreedor no encontradas en los parámetros");
    }

    var body = ``;

    if (tipo_documento != "Recibo por Honorario") {
      body = `
        <soap:Envelope
          xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
          xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN">
          <soap:Header/>
          <soap:Body>
            <sfin:JournalEntryBulkCreateRequest>
              <MessageHeader>
                <ID>${nro_documento}</ID>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
              </MessageHeader>
            <JournalEntryCreateRequest>
              <MessageHeader>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime> <!-- Fecha de envío a SAP -->
                <ID>${nro_documento}</ID> <!-- Número de la factura "Número de documento" Con el siguiente formato 01-F001-12345678 -->
              </MessageHeader>
              <JournalEntry>
                <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                <BusinessTransactionType>RFBU</BusinessTransactionType>
                <AccountingDocumentType>${accountingDocumentType}</AccountingDocumentType>    
                <CompanyCode>10PE</CompanyCode>    
                <DocumentDate>${fecha_documento}</DocumentDate> <!-- Fecha de envío a SAP -->
                <PostingDate>${fecha_contabilizacion}</PostingDate> <!-- Fecha de envío a SAP -->
                <TaxDeterminationDate>${fecha_contabilizacion}</TaxDeterminationDate> <!-- Fecha de envío a SAP -->
                <TaxReportingDate>${fecha_contabilizacion}</TaxReportingDate> <!-- Fecha de envío a SAP -->
                <CreatedByUser>Rend-Gastos</CreatedByUser>
                <DocumentReferenceID>${nro_documento}</DocumentReferenceID> <!-- Número de la factura "Número de documento" -->
                <DocumentHeaderText>${documentHeaderText}</DocumentHeaderText> <!-- Número de la factura "Número de documento" -->
                <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader> <!-- Número de solicitud de fondo fijo -->
                <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader> <!-- Número de solicitud de rendición -->
                
                <!-- Tipo 4 -->
                <Item>
                  <GLAccount>${codigo_sap_tipo_gasto}</GLAccount> <!-- Cuenta de gastos -->
                  <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${base_imponible_final_exo}</AmountInTransactionCurrency> <!-- Importe menos el IGV -->
                  <DebitCreditCode>S</DebitCreditCode>
                  <DocumentItemText>${documentItemText}</DocumentItemText> <!-- Número de la factura -->
                  <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner> 
                  <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                  <Tax>
                    <TaxCode>${codigo_sap}</TaxCode> <!-- Código del IGV -->
                  </Tax>
                  <AccountAssignment>
                    <CostCenter>${ce_co}</CostCenter> <!-- Centro de costo del empleado -->
                    <WBSElement>${elemento_pep}</WBSElement>
                  </AccountAssignment>
                </Item>
                
                <!-- Tipo 2 -->
                <CreditorItem>
                  <ReferenceDocumentItem>1</ReferenceDocumentItem>
                  <Creditor>${codigo_proveedor}</Creditor> <!-- BP del proveedor -->
                  <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe_final * -1.00}</AmountInTransactionCurrency> <!-- Importe total -->
                  <DebitCreditCode>H</DebitCreditCode>
                  <DocumentItemText>${documentItemText}</DocumentItemText> <!-- Número de la factura -->
                  <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts> <!-- Cuenta alternativa -->
                  <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner> 
                  <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                </CreditorItem>
                
                <!-- Impuesto del producto -->
                <ProductTaxItem>
                  <TaxCode>${codigo_sap}</TaxCode>
                  <TaxItemClassification>VST</TaxItemClassification>
                  <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${igv_final}</AmountInTransactionCurrency> <!-- Valor del IGV -->
                  <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${baseImponbibleAjustado}</TaxBaseAmountInTransCrcy> <!-- Importe menos el IGV -->
                </ProductTaxItem>
                ${detalle_exonerado}
                <WithholdingTaxItem>
              <ReferenceDocumentItem>1</ReferenceDocumentItem>
              <WithholdingTaxType>9P</WithholdingTaxType>
              <WithholdingTaxCode></WithholdingTaxCode>
              <TaxIsToBeCalculated>true</TaxIsToBeCalculated>
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0.00</AmountInTransactionCurrency> <!-- El valor del IGV-->
              <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${base_imponible_final}</TaxBaseAmountInTransCrcy> <!-- El importe menos el IGV-->
            </WithholdingTaxItem>
              </JournalEntry>
            </JournalEntryCreateRequest>
            </sfin:JournalEntryBulkCreateRequest>
            </soap:Body>
          </soap:Envelope>
        `;
    }
    else {
      body = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
        <soap:Header/>
        <soap:Body>
          <sfin:JournalEntryBulkCreateRequest>   
          <MessageHeader>
            <ID>AST_20250109</ID>         
            <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
          </MessageHeader>
          <!--1 or more repetitions:-->
          <JournalEntryCreateRequest>
            <MessageHeader>
            <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
            <ID>${nro_documento}</ID>  <!-- documento -->
            <ReferenceID>${nro_documento}</ReferenceID> <!-- documento -->
            </MessageHeader>
            <JournalEntry>
            <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
            <BusinessTransactionType>RFBU</BusinessTransactionType>
            <AccountingDocumentType>${accountingDocumentType}</AccountingDocumentType>    
            <CompanyCode>10PE</CompanyCode>    
            <DocumentDate>${fecha_documento}</DocumentDate> <!-- Fecha de la factura -->
            <PostingDate>${fecha_contabilizacion}</PostingDate> <!-- Fecha de Contabilización -->
            <TaxDeterminationDate>${fecha_contabilizacion}</TaxDeterminationDate> <!-- Fecha de Contabilización -->
            <TaxReportingDate>${fecha_contabilizacion}</TaxReportingDate> <!-- Fecha de Contabilización -->
            <CreatedByUser>Rend-Gastos </CreatedByUser>
            <OriginalReferenceDocument>${nro_documento}</OriginalReferenceDocument>
            <OriginalReferenceDocumentLogicalSystem>CA</OriginalReferenceDocumentLogicalSystem>
            <DocumentReferenceID>${nro_documento}</DocumentReferenceID> <!-- documento -->
            <DocumentHeaderText>${documentHeaderText}</DocumentHeaderText> <!-- documento -->
            <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader> <!-- solicitud f. fijo-->
            <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader> <!--solicitud Rendición -->
            <!-- TIPO 4 -->
            <Item>
              <GLAccount>${codigo_sap_tipo_gasto}</GLAccount>  <!-- cuenta de gasto -->
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${base_imponible_final}</AmountInTransactionCurrency> <!-- importe menos igv (aunque igv es cero) -->
              <DebitCreditCode>S</DebitCreditCode>
              <DocumentItemText>${documentItemText}</DocumentItemText> <!-- Número de la factura  -->
              <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner> <!-- Código de la solicitud DEL FONDO FIJO-->     
              <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
              <Tax>
                <TaxCode>C0</TaxCode> <!-- Código del IGV-->
              </Tax>
              <AccountAssignment>
              <CostCenter>${ce_co}</CostCenter>   <!--si no hay proyecto Centro de Costo si tiene proyecto vacío-->
              <WBSElement>${elemento_pep}</WBSElement>
              </AccountAssignment>
            </Item>
            <!-- TIPO 02  -->
            <CreditorItem>
              <ReferenceDocumentItem>1</ReferenceDocumentItem>
              <Creditor>${codigo_proveedor}</Creditor> <!--BP del proveedor -->
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe_final * -1.00}</AmountInTransactionCurrency> <!-- importe total -->
              <DebitCreditCode>H</DebitCreditCode>
              <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts>  <!-- Cuenta alternativa -->     
              <DocumentItemText>${documentItemText}</DocumentItemText>  <!-- Número de la factura  -->
              <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner> <!-- Número solicitud de ffijo -->  
              <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
              <PaymentDetails>
              <PaymentBlockingReason>A</PaymentBlockingReason>
              <Paymentreason>Z001</Paymentreason>
              </PaymentDetails>
            </CreditorItem>
            <ProductTaxItem>
              <TaxCode>C0</TaxCode> <!-- Código del IGV-->
              <TaxItemClassification>VST</TaxItemClassification>
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0.00</AmountInTransactionCurrency> <!-- El valor del IGV-->

              <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${base_imponible_final}</TaxBaseAmountInTransCrcy> <!-- El importe menos el IGV-->
            </ProductTaxItem>
            <WithholdingTaxItem>
              <ReferenceDocumentItem>1</ReferenceDocumentItem>
              <WithholdingTaxType>LP</WithholdingTaxType>
              <WithholdingTaxCode>01</WithholdingTaxCode>
              <TaxIsToBeCalculated>true</TaxIsToBeCalculated>
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0.00</AmountInTransactionCurrency> <!-- El valor del IGV-->
              <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${base_imponible_final}</TaxBaseAmountInTransCrcy> <!-- El importe menos el IGV-->
            </WithholdingTaxItem>
            <WithholdingTaxItem>
              <ReferenceDocumentItem>1</ReferenceDocumentItem>
              <WithholdingTaxType>9P</WithholdingTaxType>
              <WithholdingTaxCode></WithholdingTaxCode>
              <TaxIsToBeCalculated>true</TaxIsToBeCalculated>
              <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0.00</AmountInTransactionCurrency> <!-- El valor del IGV-->
              <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${base_imponible_final}</TaxBaseAmountInTransCrcy> <!-- El importe menos el IGV-->
            </WithholdingTaxItem>
            </JournalEntry>
          </JournalEntryCreateRequest>
          </sfin:JournalEntryBulkCreateRequest>
        </soap:Body>
      </soap:Envelope>
      `;
    }
    //Solo enviar los que no tienen retención o son menores a 700 soles
        var respuesta = await send2SAP(body);
        if (respuesta.code == 0) {
          respuesta.message = respuesta.message;
          respuesta.code = 0;
          
          return respuesta;
        }
        else {
    
          //Guardamos 
          detalle.codigo_sap_factura = respuesta.message;
    
          response.message = response.message == "" ? respuesta.message : response.message + " - " + respuesta.message;
    
          console.log("diferencia_rendicion - 1: ", diferencia_rendicion);
          /* if(tipoSolicitud === "Rendición - Viáticos"  && diferencia_rendicion == 0){
            var bodyCompensacion = await generarXMLCompensacionViaticos(parametros, solicitud, tipoSolicitud, detalle, tipoGastos, respuesta.message, "100000483");
            var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);
    
            if(respuestaCompensacion.code == 0){
              response.code = respuestaCompensacion.code;
              response.message = respuestaCompensacion.message;
              return response;
            } 
            response.message = response.message == "" ? respuestaCompensacion.message : response.message + " - " + respuestaCompensacion.message;
    
          } */
    
        }
        nuevoDetalle.push(detalle);
        

  };

  //Compesasación de viáticos
  if (tipoSolicitud === "Rendición - Viáticos") {

    /* response.code = 1;
    response.message = response.message;
    return response; */

    // generar un tipo de asiento de desembolso para viaticos, con las cuentas proporcionadas

    let asientoAdicionalViaticos = null;
    let diferenciaR =parseFloat(diferencia_rendicion);

    if(diferenciaR!= 0){

    let bodyAsientoAdicionalViaticos = await   generarXMLAsientoAdicionalViaticos(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos, diferencia_rendicion);
    let respuestaAsientoAdicionalViaticos = await send2SAP(bodyAsientoAdicionalViaticos);

    if (respuestaAsientoAdicionalViaticos.code == 0) {
      response.code = respuestaAsientoAdicionalViaticos.code;
      response.message = respuestaAsientoAdicionalViaticos.message;
      return response;
    }
    asientoAdicionalViaticos = respuestaAsientoAdicionalViaticos.message;
    response.code = respuestaAsientoAdicionalViaticos.code;
    response.message = response.message + " - " + respuestaAsientoAdicionalViaticos.message;

    
    }

    var bodyCompensacion = await generarXMLCompensacionViaticos(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos, asientoAdicionalViaticos);
    var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);

    if (respuestaCompensacion.code == 0) {
      response.code = respuestaCompensacion.code;
      response.message = respuestaCompensacion.message;
      return response;
    }
    if (respuestaCompensacion.uuid !=undefined) {
             await ConnectionInstance().query(QUERY.updateUUIDSolicitud, [respuestaCompensacion.uuid, solicitud]);
    }
    response.code = respuestaCompensacion.code;
    response.message = response.message == "" ? respuestaCompensacion.message : response.message + " - " + respuestaCompensacion.message;
  }
  if (tipoSolicitud === "Pasajes Aéreos/Otros") {
    response.code = 1;
    response.message = response.message;
    return response;
  }


  // separar nuevoDetalle en la cantidad de arrays necesarior por tipo de moneda. 
  //for each por cada tipo de moneda, para hacer enviar desembolso y compensacion

  //Reembolso y compensacion
  if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Reembolso") {

    let asientoAdicionalFf = null;
    let diferenciaR =parseFloat(diferencia_rendicion);
    if(cierreFF && cierreFF!=='false'){
      if(diferenciaR !=0 ){
        let bodyAsientoRendicionCierre = await generarXMLAsientoAdicionalRendionFF(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos, diferencia_rendicion)
        let respuestaAsientoAdicionalRendicionFf = await send2SAP(bodyAsientoRendicionCierre);

        if (respuestaAsientoAdicionalRendicionFf.code == 0) {
          response.code = respuestaAsientoAdicionalRendicionFf.code;
          response.message = respuestaAsientoAdicionalRendicionFf.message;
          return response;
        }
      asientoAdicionalFf = respuestaAsientoAdicionalRendicionFf.message;
      response.code = respuestaAsientoAdicionalRendicionFf.code;
      response.message = response.message + " - " + respuestaAsientoAdicionalRendicionFf.message;
      }
    var bodyCompensacion = await generarXMLCompensacionViaticos(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos, asientoAdicionalFf);
    var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);

    if (respuestaCompensacion.code == 0) {
      response.code = respuestaCompensacion.code;
      response.message = respuestaCompensacion.message;
      return response;
    }
    if (respuestaCompensacion.uuid !=undefined) {
             await ConnectionInstance().query(QUERY.updateUUIDSolicitud, [respuestaCompensacion.uuid, solicitud]);
             await ConnectionInstance().query(QUERY.cerrarFF, [id_solicitud_referencia]);

    }
    response.code = respuestaCompensacion.code;
    response.message = response.message == "" ? respuestaCompensacion.message : response.message + " - " + respuestaCompensacion.message;

    }else
    {

      // Agrupar detalles por moneda_detalle de forma dinámica
      const detallesPorMoneda = {};

      nuevoDetalle.forEach(detalle => {
        const moneda = detalle.moneda_detalle;
        if (!detallesPorMoneda[moneda]) {
          detallesPorMoneda[moneda] = [];
        }
        detallesPorMoneda[moneda].push(detalle);
      });

      console.log("Detalles agrupados por moneda:", detallesPorMoneda);

      // Procesar cada grupo de moneda
      for (const [moneda, detalles] of Object.entries(detallesPorMoneda)) {
        console.log(`Procesando detalles en ${ moneda }: `, detalles);

        if (detalles.length > 0) {
          var bodyDesembolso = await generarXMLDesembolsoFF(parametros, solicitud, tipoSolicitud, detalles, tipoGastos);
          var respuestaDesembolso = await send2SAP(bodyDesembolso);

          if (respuestaDesembolso.code == 0) {
            response.code = respuestaDesembolso.code;
            response.message = respuestaDesembolso.message;
            return response;
          }
          else {
            response.code = respuestaDesembolso.code;
            response.message = response.message + " - " + respuestaDesembolso.message;
            var bodyCompensacion = await generarXMLCompensacionFF(parametros, solicitud, tipoSolicitud, detalles, tipoGastos, respuesta.message, respuestaDesembolso.message);
            var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);
            if (respuestaCompensacion.uuid !=undefined) {
              await ConnectionInstance().query(QUERY.updateUUIDSolicitud, [respuestaCompensacion.uuid, solicitud]);
            }
          }
        }
      }
    }
  }


  //Reembolso y compensacion
  /* if(tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Reembolso"){
    var bodyDesembolso  = await generarXMLDesembolsoFF(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos);
    console.log("llego aca line 2278")
    var respuestaDesembolso = await send2SAP(bodyDesembolso);
    
    if(respuestaDesembolso.code == 0){
      return respuestaDesembolso.code;
    }
    else{
      var bodyCompensacion = await generarXMLCompensacionFF(parametros, solicitud, tipoSolicitud, nuevoDetalle, tipoGastos, respuesta.message, respuestaDesembolso.message);
      console.log("llego aca line 2286")
      var respuestaCompensacion = await send2SAPCompensacion(bodyCompensacion);
          
      // if(respuestaCompensacion.code == 0){
      //   return respuestaCompensacion.code;
      // } 
    }
  } */

  return response;


};

async function generarXMLDesembolsoFF(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos) {

  console.log('init generarXMLDesembolsoFF');
  // Obtener cuentas
  var creditorAccount = null;
  var debitorAccount = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    fecha_contabilizacion,
    motivo,
    nro_proyecto,
    elemento_pep
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));


  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  // Validar que todas las facturas tengan la misma moneda
  const moneda_unica = solicitudDetalle[0].moneda_detalle;
  const moneda_detalle = solicitudDetalle[0].moneda_detalle;
  // Acumular importes
  let importe_total = 0;
  let tipo_documento_general = null;
  let codigo_proveedor_general = null;
  let aplica_retencion = true;

  for (const detalle of solicitudDetalle) {
    aplica_retencion = false;
    const {
      importe_moneda_local,
      importe_dolares,
      tipo_documento,
      codigo_proveedor,
      importe_final_tc
    } = detalle;

    let importe_final = moneda_unica === "PEN" ? importe_moneda_local : importe_dolares;
    // Retención para RH >= 1500
    if (tipo_documento === "Recibo por Honorario" && importe_final_tc >= 1500) {
      importe_final = importe_final * 0.92;
    }
    importe_total += parseFloat(importe_final);
    importe_total = parseFloat(importe_total.toFixed(2)); // Redondear a 2 decimales

    if (!tipo_documento_general) tipo_documento_general = tipo_documento;
    if (!codigo_proveedor_general) codigo_proveedor_general = codigo_proveedor;

    
  }
  const elemento_pep_max_caracteres = elemento_pep.length > 12 ? elemento_pep.substring(0, 12) : elemento_pep;

  console.log("Importe Total:" + importe_total);
  /*Evaluación */
  if (moneda_detalle == "PEN") {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_DSRNFF_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_DSRNFF_PEN");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_DSRNFFRH_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_DSRNFFRH_PEN");
    }

  }
  else {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_DSRNFF_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_DSRNFF_USD");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_DSRNFFRH_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_DSRNFFRH_USD");
    }
  }

  if(solicitud[0].pais_gasto != 'Perú'){
    //creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

    debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RNFF_EXT");

    /*  if(moneda_detalle != "PEN"){
      importe_final = importe_dolares;
      igv_final = 0;
      base_imponible_final = 0;
    }  */   
  }



  //OTROS DOCUMENTOS
  //TIPO 2
  //46111040 Soles 
  //46111050 Dolares

  //TIPO 4
  //42121001 Soles 
  //42121002 Dolares
  const documentHeaderText = motivo.substring(0, 25);
  const documentItemText = motivo.substring(0, 50);

  if (!creditorAccount) {
    throw new Error("Cuentas de acreedor no encontradas en los parámetros");
  }
  var body = ``;
  
    body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
        <soap:Header/>
        <soap:Body>
          <sfin:JournalEntryBulkCreateRequest>
            
            <MessageHeader>
              <ID>LOTE_01</ID>         
              <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
          </MessageHeader>
          <JournalEntryCreateRequest>
              <MessageHeader>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ID>LOTE_01</ID>
              </MessageHeader>
              <JournalEntry>
              <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                <BusinessTransactionType>RFBU</BusinessTransactionType>
                <AccountingDocumentType>SA</AccountingDocumentType>    
                <CompanyCode>10PE</CompanyCode>    
                <DocumentDate>${fecha_contabilizacion}</DocumentDate> 
                <PostingDate>${fecha_contabilizacion}</PostingDate>
                <CreatedByUser>COM_0002</CreatedByUser>                
                <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                <DocumentHeaderText>${documentHeaderText}</DocumentHeaderText>
                <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader>
                <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>              
                <!-- TIPO 02   -->
                  <CreditorItem>
                    <ReferenceDocumentItem>1</ReferenceDocumentItem>
                    <Creditor>${cod_auxilar_cont}</Creditor> 
                    <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe_total * -1.00}</AmountInTransactionCurrency>
                    <DebitCreditCode>H</DebitCreditCode>
                    <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts> 
                    
                    <DocumentItemText>${documentItemText}</DocumentItemText>
                    <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                    <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                </CreditorItem>
                <!-- TIPO 4 -->
                <CreditorItem>
                    <ReferenceDocumentItem>1</ReferenceDocumentItem>
                    <Creditor>${cod_auxilar_cont}</Creditor> <!-- codigo_proveedor_general -->
                    <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe_total}</AmountInTransactionCurrency>
                    <DebitCreditCode>S</DebitCreditCode>
                    <AltvRecnclnAccts>${debitorAccount.valor_general}</AltvRecnclnAccts>
                    <DocumentItemText>${documentItemText}</DocumentItemText>
                    <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner> 
                    <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                </CreditorItem>             
              </JournalEntry>
          </JournalEntryCreateRequest>
          </sfin:JournalEntryBulkCreateRequest>
          </soap:Body>
        </soap:Envelope>
    `
    console.log("LLEGO REEMBOLSO 1");
    console.log(body);
  return body;

};

async function generarXMLCompensacionFF(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos, codigoFactura, codigo_sap_desembolso) {

  console.log('init generarXMLCompensacionFF');
  // Obtener cuentas
  var creditorAccount = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    fecha_contabilizacion,
    nro_proyecto,
    motivo,
    elemento_pep
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }


  let itemXML = '';
  let nroItems = 0;
  //Generar ITEMS
  for (const detalle of solicitudDetalle) {
    nroItems++;
    const {
      id_solicitud_detalle,
      id_solicitud,
      nro_documento,
      fecha_documento,
      ruc,
      razon_social,
      tipo_cambio,
      importe_moneda_local,
      importe_dolares,
      base_imponible,
      igv,
      valor,
      codigo_sap,
      codigo_proveedor,
      moneda_detalle,
      id_tipo_gasto,
      tipo_documento,
      codigo_sap_factura
    } = detalle;


    itemXML += `<APARItems>
                      <ReferenceDocumentItem>${nroItems}</ReferenceDocumentItem>
                      <AccountType>K</AccountType>
                      <APARAccount>${codigo_proveedor}</APARAccount>
                      <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
                      <AccountingDocument>${codigo_sap_factura.replace(/^0+/, "")}</AccountingDocument> 
                      <AccountingDocumentItem>1</AccountingDocumentItem>
                  </APARItems>`;

    var importe_final = importe_moneda_local;
    var igv_final = igv;
    var base_imponible_final = base_imponible;

    var codigo_sap_tipo_gasto = tipoGastos.find(row => row.id_tipo_gasto === id_tipo_gasto).codigo_sap;

    if (moneda_detalle != "PEN") {
      importe_final = importe_dolares;
    }

    /*Evaluación */
    if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Reembolso") {
      if (moneda_detalle == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }

    }

    if (tipoSolicitud === "Rendición - Viáticos") {

      if (moneda_detalle == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }
    }

    /* if (!creditorAccount) {
      throw new Error("Cuentas de acreedor no encontradas en los parámetros");
    } */
  }




  var body = ``;
  var uuidEnviado = generateUUID();

  if (solicitudDetalle[0].tipo_documento != "Recibo por Honorario") {
    body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:wsa="http://www.w3.org/2005/08/addressing" >
      <soap:Header>
            <wsa:Action>http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest</wsa:Action>
            <wsa:MessageID>urn:uuid:${uuidEnviado}</wsa:MessageID>
            <wsa:To>https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques</wsa:To>
            <wsa:ReplyTo>
            <wsa:Address>http://www.w3.org/2005/08/addressing/anonymous</wsa:Address>
            </wsa:ReplyTo>
      </soap:Header>
      <soap:Body>
          <sfin:JournalEntryBulkClearingRequest>
              <MessageHeader>
                <ID>${codigo_sap_desembolso}</ID>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ReferenceUUID>${uuidEnviado}</ReferenceUUID>
                <SenderBusinessSystemID>${businessSystemID}</SenderBusinessSystemID>
            </MessageHeader>
            <!--1 or more repetitions:-->
            <JournalEntryClearingRequest>
                <MessageHeader>
                  <CreationDateTime>${fecha_actual_larga}</CreationDateTime> <!-- Fecha de envío a SAP -->
                  <ID>${codigo_sap_desembolso}</ID>                  
                  <ReferenceID>${codigo_sap_desembolso}</ReferenceID>
                </MessageHeader>
                <JournalEntry>
                  <CompanyCode>10PE</CompanyCode>
                  <AccountingDocumentType>AB</AccountingDocumentType>
                  <DocumentDate>${fecha_solicitud}</DocumentDate>
                  <PostingDate>${fecha_contabilizacion}</PostingDate>
                  <CurrencyCode>PEN</CurrencyCode>
                  <CurrencyTranslationDate>${fecha_contabilizacion}</CurrencyTranslationDate>
                  <DocumentHeaderText>${codigo_sap_desembolso}</DocumentHeaderText>
                  <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                  <ReferenceDocument>${codigo_sap_desembolso}</ReferenceDocument>
                  <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>  
                  <CreatedByUser>Ren-Gastos</CreatedByUser>
                  <!--Zero or more repetitions:-->
                        ${itemXML}
                        <APARItems>
                            <ReferenceDocumentItem>${(nroItems + 1)}</ReferenceDocumentItem>
                            <AccountType>K</AccountType>
                            <APARAccount>${cod_auxilar_cont}</APARAccount>
                            <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
                            <AccountingDocument>${codigo_sap_desembolso.replace(/^0+/, "")}</AccountingDocument>
                            <AccountingDocumentItem>2</AccountingDocumentItem>
                        </APARItems>
                </JournalEntry>
            </JournalEntryClearingRequest>
          </sfin:JournalEntryBulkClearingRequest>
      </soap:Body>
    </soap:Envelope>
    `;
    console.log("COMPENSACION 1");
  }
  else {
    body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:wsa="http://www.w3.org/2005/08/addressing">
      <soap:Header>
            <wsa:Action>http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest</wsa:Action>
            <wsa:MessageID>urn:uuid:${uuidEnviado}</wsa:MessageID>
            <wsa:To>https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques</wsa:To>
            <wsa:ReplyTo>
            <wsa:Address>http://www.w3.org/2005/08/addressing/anonymous</wsa:Address>
            </wsa:ReplyTo>
      </soap:Header>
      <soap:Body>
          <sfin:JournalEntryBulkClearingRequest>
          <MessageHeader>
            <ID>${codigo_sap_desembolso}</ID>
            <ReferenceUUID>${uuidEnviado}</ReferenceUUID>
            <SenderBusinessSystemID>${businessSystemID}</SenderBusinessSystemID>
            <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
          </MessageHeader>
            <!--1 or more repetitions:-->
            <JournalEntryClearingRequest>
            <MessageHeader>
              <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
              <ID>${codigo_sap_desembolso}</ID>
              <ReferenceID>${codigo_sap_desembolso}</ReferenceID>
            </MessageHeader>
            <JournalEntry>
              <CompanyCode>10PE</CompanyCode>
              <AccountingDocumentType>AB</AccountingDocumentType>
              <DocumentDate>${fecha_solicitud}</DocumentDate> <!-- Fecha de la factura -->
              <PostingDate>${fecha_contabilizacion}</PostingDate> <!-- Fecha de contabilización -->
              <CurrencyCode>PEN</CurrencyCode>
              <CurrencyTranslationDate>${fecha_contabilizacion}</CurrencyTranslationDate> <!-- Fecha de contabilización-->
              <DocumentHeaderText>${codigo_sap_desembolso}</DocumentHeaderText>
              <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
              <ReferenceDocument>${codigo_sap_desembolso}</ReferenceDocument>
              <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>  
              <CreatedByUser>Ren-Gastos</CreatedByUser>
              <!--Zero or more repetitions:-->
              ${itemXML}
              <APARItems>
                  <ReferenceDocumentItem>${(nroItems + 1)}</ReferenceDocumentItem>
                  <AccountType>K</AccountType>
                  <APARAccount>${cod_auxilar_cont}</APARAccount> <!-- bp proveedor -->
                  <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear> <!--año de Contabilización -->
                  <AccountingDocument>${codigo_sap_desembolso.replace(/^0+/, "")}</AccountingDocument>
                  <AccountingDocumentItem>2</AccountingDocumentItem>
              </APARItems>
              </JournalEntry>
            </JournalEntryClearingRequest>
          </sfin:JournalEntryBulkClearingRequest>
      </soap:Body>
    </soap:Envelope>

    `;
    console.log("COMPENSACION 2");
  }
  return body;
};

async function generarXMLCompensacionViaticos(parametros, solicitud, tipoSolicitud, detalles, tipoGastos, asientoAdicionalViaticos
) {

  console.log('init generarXMLCompensacionFF');
  // Obtener cuentas
  var creditorAccount = null;

  const tipoCambio = await ConnectionInstance().query(QUERY.tipoCambio).then(res => Number(res.rows[0].valor_tipo_cambio));

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    asiento_anticipo,
    fecha_contabilizacion,
    diferencia_rendicion,
    moneda
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  var itemXML = '';
  let nroItems = 2;
  const importePorProveedor = {};
  for (const detalle of detalles) {
    nroItems++;
    const {
      id_solicitud_detalle,
      id_solicitud,
      nro_documento,
      fecha_documento,
      ruc,
      razon_social,
      tipo_cambio,
      importe_moneda_local,
      importe_dolares,
      base_imponible,
      igv,
      valor,
      codigo_sap,
      codigo_proveedor,
      moneda_detalle,
      id_tipo_gasto,
      codigo_sap_factura
    } = detalle;

    //query de cuentas

    var importe_final = importe_moneda_local;
    var igv_final = igv;
    var base_imponible_final = base_imponible;

    itemXML += `<APARItems>
    <ReferenceDocumentItem>${nroItems}</ReferenceDocumentItem>
    <AccountType>K</AccountType>
    <APARAccount>${codigo_proveedor}</APARAccount>
    <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
    <AccountingDocument>${codigo_sap_factura.replace(/^0+/, "")}</AccountingDocument> 
    <AccountingDocumentItem>1</AccountingDocumentItem>
</APARItems>`;

    var codigo_sap_tipo_gasto = tipoGastos.find(row => row.id_tipo_gasto === id_tipo_gasto).codigo_sap;

    if (moneda_detalle != "PEN") {
      importe_final = importe_dolares;
    }

    /*Evaluación */
    if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Reembolso") {
      if (moneda_detalle == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }

    }

    if (tipoSolicitud === "Rendición - Viáticos") {

      if (moneda_detalle == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }
    }

    if (!creditorAccount) {
      throw new Error("Cuentas de acreedor no encontradas en los parámetros");
    }

    if(!importePorProveedor[codigo_proveedor]) {
      importePorProveedor[codigo_proveedor] = 0;
    }
    importePorProveedor[codigo_proveedor] += parseFloat(importe_final);
    importePorProveedor[codigo_proveedor] = parseFloat(importePorProveedor[codigo_proveedor].toFixed(2));


  }
  diferencia_rendicion = diferencia_rendicion * 1.00;
  let valor_compensacion = 0;
  if (moneda == "PEN") {
    valor_compensacion = (importe_f_fijo - diferencia_rendicion)*1.00;
  }
  else if (moneda == "USD") {
    valor_compensacion = (importe_f_fijo - diferencia_rendicion)*tipoCambio;
  }else{
    valor_compensacion = 0;

  }

  const resultadoArray = Object.entries(importePorProveedor).map(([codigo_proveedor, importe]) => ({
    codigo_proveedor,
    importe
  }));
  const numberItem  = 3; 
  var creditorItems ='';
  if(asientoAdicionalViaticos != null){
    //pertence a la linea 3262 
    creditorItems += `<APARItems>
                            <ReferenceDocumentItem>2</ReferenceDocumentItem>
                            <AccountType>D</AccountType>
                            <APARAccount>${cod_auxilar_cont}</APARAccount>
                            <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
                            <AccountingDocument>${asientoAdicionalViaticos.replace(/^0+/, "")}</AccountingDocument> 
                            <AccountingDocumentItem>1</AccountingDocumentItem>
                        </APARItems>`;
    resultadoArray.map(({codigo_proveedor, importe}, index) => {
      nroItems++;
      creditorItems += `<APARItems>
      <ReferenceDocumentItem>${nroItems}</ReferenceDocumentItem>
      <AccountType>K</AccountType>
      <APARAccount>${codigo_proveedor}</APARAccount>
      <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
      <AccountingDocument>${asientoAdicionalViaticos.replace(/^0+/, "")}</AccountingDocument> 
      <AccountingDocumentItem>${numberItem+ index}</AccountingDocumentItem>
  </APARItems>`;
    })
  }

  var uuidEnviado = generateUUID();
  const body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:wsa="http://www.w3.org/2005/08/addressing" >
      <soap:Header>
            <wsa:Action>http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest</wsa:Action>
            <wsa:MessageID>urn:uuid:${uuidEnviado}</wsa:MessageID>
            <wsa:To>https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques</wsa:To>
            <wsa:ReplyTo>
            <wsa:Address>http://www.w3.org/2005/08/addressing/anonymous</wsa:Address>
            </wsa:ReplyTo>
      </soap:Header>
      <soap:Body>
          <sfin:JournalEntryBulkClearingRequest>
              <MessageHeader>
                <ID>${asiento_anticipo.replace(/^0+/, "")}</ID>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ReferenceUUID>${uuidEnviado}</ReferenceUUID>
                <SenderBusinessSystemID>${businessSystemID}</SenderBusinessSystemID>
            </MessageHeader>
            <!--1 or more repetitions:-->
            <JournalEntryClearingRequest>
                <MessageHeader>
                  <CreationDateTime>${fecha_actual_larga}</CreationDateTime> <!-- Fecha de envío a SAP -->
                  <ID>${asiento_anticipo.replace(/^0+/, "")}</ID>                  
                  <ReferenceID>${asiento_anticipo.replace(/^0+/, "")}</ReferenceID>
                </MessageHeader>
                <JournalEntry>
                  <CompanyCode>10PE</CompanyCode>
                  <AccountingDocumentType>AB</AccountingDocumentType>
                  <DocumentDate>${fecha_actual_corta}</DocumentDate>
                  <PostingDate>${fecha_contabilizacion}</PostingDate>
                  <CurrencyCode>${moneda}</CurrencyCode>
                  <CurrencyTranslationDate>${fecha_contabilizacion}</CurrencyTranslationDate>
                  <DocumentHeaderText>${asiento_anticipo.replace(/^0+/, "")}</DocumentHeaderText>
                  <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                  <ReferenceDocument>${asiento_anticipo.replace(/^0+/, "")}</ReferenceDocument>
                  <CreatedByUser>Ren-Gastos</CreatedByUser>
                  <!--Zero or more repetitions:-->
                        <APARItems>
                            <ReferenceDocumentItem>1</ReferenceDocumentItem>
                            <AccountType>D</AccountType>
                            <APARAccount>${cod_auxilar_cont}</APARAccount>
                            <FiscalYear>${fecha_contabilizacion.substring(0, 4)}</FiscalYear>
                            <AccountingDocument>${asiento_anticipo.replace(/^0+/, "")}</AccountingDocument> 
                            <AccountingDocumentItem>1</AccountingDocumentItem>
                        </APARItems>
                        
                        ${itemXML}
                        ${creditorItems}
                </JournalEntry>
            </JournalEntryClearingRequest>
          </sfin:JournalEntryBulkClearingRequest>
      </soap:Body>
    </soap:Envelope>
  `;

  return body;
};

async function generarXMLCompensacionViatico(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos, codigo_sap_factura, codigo_sap_desembolso) {

  console.log('init generarXMLCompensacionFF');
  // Obtener cuentas
  var creditorAccount = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    moneda
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  var totalFacturas = 0;

  if (moneda == "PEN") {
    totalFacturas = solicitudDetalle.reduce((sum, item) => sum + item.importe_moneda_local, 0);
  }
  else {
    totalFacturas = solicitudDetalle.reduce((sum, item) => sum + item.importe_moneda_local, 0);
  }

  var detalle_string = '';

  for (const detalle of solicitudDetalle) {

    const {
      id_solicitud_detalle,
      id_solicitud,
      nro_documento,
      fecha_documento,
      ruc,
      razon_social,
      tipo_cambio,
      importe_moneda_local,
      importe_dolares,
      base_imponible,
      igv,
      valor,
      codigo_sap,
      codigo_proveedor,
      moneda_detalle,
      id_tipo_gasto
    } = detalle;

    var importe_final = importe_moneda_local;
    var igv_final = igv;
    var base_imponible_final = base_imponible;

    var codigo_sap_tipo_gasto = tipoGastos.find(row => row.id_tipo_gasto === id_tipo_gasto).codigo_sap;

    /*Evaluación */
    if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Reembolso") {
      if (solicitud[0].moneda == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");

        importe_final = importe_dolares;
        igv_final = 0;
        base_imponible_final = 0;

      }

      if (solicitud[0].moneda != moneda_detalle) {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }

      }

    }

    if (tipoSolicitud === "Rendición - Viáticos") {

      if (solicitud[0].moneda == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
        importe_final = importe_dolares;
        igv_final = 0;
        base_imponible_final = 0;
      }

      if (solicitud[0].moneda != moneda_detalle) {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }

    }

    if (!creditorAccount) {
      throw new Error("Cuentas de acreedor no encontradas en los parámetros");
    }


    detalle_string = detalle_string + ``;


  }

  var uuidEnviado = generateUUID();
  const body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:wsa="http://www.w3.org/2005/08/addressing" >
      <soap:Header>
            <wsa:Action>http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest</wsa:Action>
            <wsa:MessageID>urn:uuid:${uuidEnviado}</wsa:MessageID>
            <wsa:To>https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques</wsa:To>
            <wsa:ReplyTo>
            <wsa:Address>http://www.w3.org/2005/08/addressing/anonymous</wsa:Address>
            </wsa:ReplyTo>
      </soap:Header>
      <soap:Body>
          <sfin:JournalEntryBulkClearingRequest>
              <MessageHeader>
                <ID>${nro_documento}</ID>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ReferenceUUID>${uuidEnviado}</ReferenceUUID>
                <SenderBusinessSystemID>${businessSystemID}</SenderBusinessSystemID>
            </MessageHeader>
            <!--1 or more repetitions:-->
            <JournalEntryClearingRequest>
                <MessageHeader>
                  <CreationDateTime>${fecha_actual_larga}</CreationDateTime> <!-- Fecha de envío a SAP -->
                  <ID>${nro_documento}</ID>                  
                  <ReferenceID>${nro_documento}</ReferenceID>
                </MessageHeader>
                <JournalEntry>
                  <CompanyCode>10PE</CompanyCode>
                  <AccountingDocumentType>AB</AccountingDocumentType>
                  <DocumentDate>${fecha_actual_corta}</DocumentDate>
                  <PostingDate>${fecha_actual_corta}</PostingDate>
                  <CurrencyCode>PEN</CurrencyCode>
                  <CurrencyTranslationDate>${fecha_actual_corta}</CurrencyTranslationDate>
                  <DocumentHeaderText>${nro_documento}</DocumentHeaderText>
                  <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                  <ReferenceDocument>${nro_documento}</ReferenceDocument>
                  <CreatedByUser>Ren-Gastos</CreatedByUser>
                  <!--Zero or more repetitions:-->
                    <APARItems>
                      <ReferenceDocumentItem>1</ReferenceDocumentItem>
                      <AccountType>D</AccountType>
                      <APARAccount>${codigo_proveedor}</APARAccount>
                      <FiscalYear>${fecha_actual_corta.substring(0, 4)}</FiscalYear>
                      <AccountingDocument>${codigo_sap_factura.replace(/^0+/, "")}</AccountingDocument> 
                      <PartialPaymentAmtInDspCrcy currencyCode="${solicitud[0].moneda}">${totalFacturas}</PartialPaymentAmtInDspCrcy>
                    </APARItems>
                    <APARItems>
                      <ReferenceDocumentItem>2</ReferenceDocumentItem>
                      <AccountType>K</AccountType>
                      <APARAccount>${codigo_proveedor}</APARAccount>
                      <FiscalYear>${fecha_actual_corta.substring(0, 4)}</FiscalYear>
                      <AccountingDocument>${codigo_sap_desembolso.replace(/^0+/, "")}</AccountingDocument>
                      <AccountingDocumentItem>2</AccountingDocumentItem>
                    </APARItems>
                </JournalEntry>
            </JournalEntryClearingRequest>
          </sfin:JournalEntryBulkClearingRequest>
      </soap:Body>
    </soap:Envelope>
  `;

  return body;
};

async function generarXMLDesembolsoCierreFF(parametros, solicitud, tipoSolicitud, tipoGastos) {

  console.log('init generarXMLDesembolsoCierreFF');
  // Obtener cuentas
  var creditorAccount = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    elemento_pep,
    moneda,
    fecha_contabilizacion,
    tipo_moneda
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));


  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }


  const body = `
  <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
      <soap:Header/>
      <soap:Body>
        <sfin:JournalEntryBulkCreateRequest>
          
          <MessageHeader>
            <ID>AST_20250110</ID>         
            <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
         </MessageHeader>
         <JournalEntryCreateRequest>
            <MessageHeader>
               <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
               <ID>${nro_solicitud}</ID>
            </MessageHeader>
            <JournalEntry>
            <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
               <BusinessTransactionType>RFBU</BusinessTransactionType>
               <AccountingDocumentType>SA</AccountingDocumentType>    
               <CompanyCode>10PE</CompanyCode>    
               <DocumentDate>${fecha_actual_corta}</DocumentDate> 
               <PostingDate>${fecha_actual_corta}</PostingDate>
               <TaxDeterminationDate>${fecha_actual_corta}</TaxDeterminationDate>
               <TaxReportingDate>${fecha_actual_corta}</TaxReportingDate>
               <CreatedByUser>RENDI_GASTOS</CreatedByUser>
               <OriginalReferenceDocument>${nro_solicitud}</OriginalReferenceDocument>
               <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
               <DocumentHeaderText>Cierre FFijo</DocumentHeaderText>
               <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader>
               
               <!-- TIPO 4 -->
               <Item>
                    <GLAccount>10010000</GLAccount> 
                    <AmountInTransactionCurrency currencyCode="${moneda}">${importe_f_fijo}</AmountInTransactionCurrency>
                    <DebitCreditCode>S</DebitCreditCode>
                    <DocumentItemText>Cierre FFijo</DocumentItemText>
                    <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                    <AccountAssignment>
                       <CostCenter>${ce_co}</CostCenter>
                       <WBSElement>${elemento_pep}</WBSElement>
                    </AccountAssignment>
               </Item>
               <!-- TIPO 02   -->
               <DebtorItem>
                   <ReferenceDocumentItem>2</ReferenceDocumentItem>
                   <Debtor>${cod_auxilar_cont}</Debtor> 
                   <AmountInTransactionCurrency currencyCode="${moneda}">${importe_f_fijo * -1.00}</AmountInTransactionCurrency> 
                   <DebitCreditCode>H</DebitCreditCode>
                   <AltvRecnclnAccts>10210003</AltvRecnclnAccts>
                   <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
               </DebtorItem>              

            </JournalEntry>
         </JournalEntryCreateRequest>
         </sfin:JournalEntryBulkCreateRequest>
        </soap:Body>
      </soap:Envelope>
  `
  console.log("body", body);
  return body;

};

async function generarXMLCompensacionCierreFF(parametros, solicitud, tipoSolicitud, tipoGastos, codigo_sap_desembolso) {

  console.log('init generarXMLCompensacionFF');
  // Obtener cuentas
  var creditorAccount = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    moneda,
    codigo_sap,
    fecha_contabilizacion
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  const body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:wsa="http://www.w3.org/2005/08/addressing" >
      <soap:Header>
            <wsa:Action>http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest</wsa:Action>
            <wsa:MessageID>urn:uuid:${generateUUID()}</wsa:MessageID>
            <wsa:To>https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques</wsa:To>
            <wsa:ReplyTo>
            <wsa:Address>http://www.w3.org/2005/08/addressing/anonymous</wsa:Address>
            </wsa:ReplyTo>
      </soap:Header>
      <soap:Body>
          <sfin:JournalEntryBulkClearingRequest>
              <MessageHeader>
                <ID>${nro_solicitud}</ID>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
            </MessageHeader>
            <!--1 or more repetitions:-->
            <JournalEntryClearingRequest>
                <MessageHeader>
                  <CreationDateTime>${fecha_actual_larga}</CreationDateTime> <!-- Fecha de envío a SAP -->
                  <ID>${nro_solicitud}</ID>                  
                  <ReferenceID>${nro_solicitud}</ReferenceID>
                </MessageHeader>
                <JournalEntry>
                  <CompanyCode>10PE</CompanyCode>
                  <AccountingDocumentType>AB</AccountingDocumentType>
                  <DocumentDate>${fecha_actual_corta}</DocumentDate>
                  <PostingDate>${fecha_actual_corta}</PostingDate>
                  <CurrencyCode>PEN</CurrencyCode>
                  <CurrencyTranslationDate>${fecha_actual_corta}</CurrencyTranslationDate>
                  <DocumentHeaderText>Cierre FFijo</DocumentHeaderText>
                  <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                  <ReferenceDocument>${nro_solicitud}</ReferenceDocument>
                  <CreatedByUser>COM_0002</CreatedByUser>
                  <!--Zero or more repetitions:-->
                        <APARItems>
                            <ReferenceDocumentItem>1</ReferenceDocumentItem>
                            <AccountType>D</AccountType>
                            <APARAccount>${cod_auxilar_cont}</APARAccount>
                            <FiscalYear>${fecha_actual_corta.substring(0, 4)}</FiscalYear>
                            <AccountingDocument>${codigo_sap}</AccountingDocument> 
                            <AccountingDocumentItem>1</AccountingDocumentItem>
                        </APARItems>
                        <APARItems>
                            <ReferenceDocumentItem>2</ReferenceDocumentItem>
                            <AccountType>D</AccountType>
                            <APARAccount>${cod_auxilar_cont}</APARAccount>
                            <FiscalYear>${fecha_actual_corta.substring(0, 4)}</FiscalYear>
                            <AccountingDocument>${codigo_sap_desembolso}</AccountingDocument>
                            <AccountingDocumentItem>1</AccountingDocumentItem>
                        </APARItems>
                </JournalEntry>
            </JournalEntryClearingRequest>
          </sfin:JournalEntryBulkClearingRequest>
      </soap:Body>
    </soap:Envelope>
  `;

  return body;
};


async function send2SAP(body) {

  const parser = new xml2js.Parser({ explicitArray: false });

  const username = 'COM_0002';//process.env.USR_SAP; //'COM_0002';
  const password = 'MEVQYrHF7AcdwawYRrYgVzrMXRgT%DWfkiwuFgGr';//process.env.PWD_SAP; //'MEVQYrHF7AcdwawYRrYgVzrMXRgT%DWfkiwuFgGr';

  const url = 'https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrycreaterequestconfi';// process.env.URL_SAP; //'https://my412623-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkcreationreques';

  console.log("soapBody", body);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Accept-Encoding': 'gzip,deflate',
        'Content-Type': 'application/soap+xml',
        'charset': 'UTF-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'action': 'http://sap.com/xi/SAPSCORE/SFIN/JournalEntryCreateRequestConfirmation_In/JournalEntryCreateRequestConfirmation_InRequest',
      },
      auth: {
        username: username,
        password: password
      }
    });

    console.log('Response:', response)
    console.log('Respuesta del servicio:', response.data);

    const parsedData = await parser.parseStringPromise(response.data);

    console.log("parsedData:");
    console.log(JSON.stringify(parsedData, null, 2));

    // Debug: Verificar la estructura del XML
    console.log("env:Envelope:", parsedData['env:Envelope']);
    console.log("env:Body:", parsedData['env:Envelope']?.['env:Body']);
    console.log("n0:JournalEntryBulkCreateConfirmation:", parsedData['env:Envelope']?.['env:Body']?.['n0:JournalEntryBulkCreateConfirmation']);

    // Navegar al campo AccountingDocument
    const accountingDocument = parsedData['env:Envelope']?.['env:Body']?.['n0:JournalEntryBulkCreateConfirmation']?.['JournalEntryCreateConfirmation']?.['JournalEntryCreateConfirmation']?.['AccountingDocument'];

    console.log("AccountingDocument encontrado:", accountingDocument);

    // Verificar si no contiene "Document posted successfully"
    if (!response.data.includes("Document posted successfully")) {
      // Verificar si el AccountingDocument es "0000000000"
      if (accountingDocument === "0000000000") {
        // Extraer todas las notas del XML
        const notes = [];

        // Buscar en la estructura del XML las notas dentro de Log
        const logSection = parsedData['env:Envelope']?.['env:Body']?.['n0:JournalEntryBulkCreateConfirmation']?.['JournalEntryCreateConfirmation']?.['Log'];

        console.log("logSection encontrado:", logSection);

        if (logSection && logSection.Item) {
          // Log es una etiqueta única, Item puede ser un array o un objeto único
          const items = Array.isArray(logSection.Item) ? logSection.Item : [logSection.Item];

          // Recorrer cada Item y extraer las notas
          items.forEach(item => {
            if (item.Note) {
              if (Array.isArray(item.Note)) {
                // Si Note es un array dentro del Item
                notes.push(...item.Note);
              } else {
                // Si Note es un string único dentro del Item
                notes.push(item.Note);
              }
            }
          });
        }

        // Retornar todas las notas encontradas
        return { code: 0, message: notes.join('; ') };
      }

      return { code: 0, message: "Document Error posted" };
    }

    return { code: 1, message: accountingDocument };
  } catch (error) {
    console.error('Error al consumir el servicio SOAP:', error.message);
    return { code: 0, message: error.message };;
  }

};

async function send2SAPCompensacion(body) {

  const parser = new xml2js.Parser({ explicitArray: false });

  const username = 'COM_0003';//process.env.USR_SAP; //'COM_0002';
  const password = '7ZDjS)r/tN5$wUY[Cc}\\gJRT3t<bs-qEL>Q[rjz+';//process.env.PWD_SAP; //'MEVQYrHF7AcdwawYRrYgVzrMXRgT%DWfkiwuFgGr';

  const url = 'https://my417125-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkclearingreques';// process.env.URL_SAP; //'https://my412623-api.s4hana.cloud.sap/sap/bc/srt/scs_ext/sap/journalentrybulkcreationreques';

  console.log("soapBody", body);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Accept-Encoding': 'gzip,deflate',
        'charset': 'UTF-8',
        'Content-Type': 'application/soap+xml;',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'Action': 'http://sap.com/xi/SAPSCORE/SFIN/JournalEntryBulkClearingRequest_In/JournalEntryBulkClearingRequest_InRequest',
      },
      auth: {
        username: username,
        password: password
      }
    });

    console.log('Response:', response)
    console.log('Respuesta del servicio:', response.data);

    if (response.status != 202) {
      return { code: 0, message: "Document Error posted" };
    }

    /*const parsedData = await parser.parseStringPromise(response.data);

    // Navegar al campo AccountingDocument
    const accountingDocument = parsedData['env:Envelope']?.['env:Body']?.['n0:JournalEntryBulkCreateConfirmation']?.['JournalEntryCreateConfirmation']?.['JournalEntryCreateConfirmation']?.['AccountingDocument'];


    if (!response.data.includes("Document posted successy")) {
      return { code: 0, message: "Document Error posted" };
    }*/
    const result = await parser.parseStringPromise(body, { explicitArray: false });
    const referenceUUID = result["soap:Envelope"]["soap:Body"]["sfin:JournalEntryBulkClearingRequest"]["MessageHeader"]["ReferenceUUID"];
    
    return { code: 1, message: referenceUUID,uuid:referenceUUID };
  } catch (error) {
    console.log(error);
    console.error('Error al consumir el servicio SOAP:', error.message);
    return { code: 0, message: error.message };;
  }

};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
async function generarXMLAsientoAdicionalViaticos(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos) {

  console.log('init generarXMLAsientoAdicionalViaticos');
  // Obtener cuentas
  var creditorAccount = null;
  var debitorAccount = null;
  let creditorAccountDiferencia = null;
  let debitorAccountDiferencia = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    elemento_pep,
    ce_co,
    fecha_contabilizacion,
    motivo,
    diferencia_rendicion,
    nro_proyecto
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));

  const elemento_pep_max_caracteres = elemento_pep.length > 12 ? elemento_pep.substring(0, 12) : elemento_pep;


  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  // Validar que todas las facturas tengan la misma moneda
  const moneda_unica = solicitudDetalle[0].moneda_detalle;
  const moneda_detalle = solicitudDetalle[0].moneda_detalle;
  // Acumular importes
  let importe_total = 0;
  let tipo_documento_general = null;
  let aplica_retencion = true;
  let importeRecibo = 0;

  const importePorProveedor = {};

  for (const detalle of solicitudDetalle) {
    aplica_retencion = false;
    const {
      importe_moneda_local,
      importe_dolares,
      tipo_documento,
      codigo_proveedor,
      importe_final_tc
    } = detalle;

    let importe_final = moneda_unica === "PEN" ? importe_moneda_local : importe_dolares;
    // Retención para RH >= 1500
    if (tipo_documento === "Recibo por Honorario" && importe_final_tc >= 1500) {
      importeRecibo += parseFloat((importe_final*0.08).toFixed(2));
      importe_final = importe_final * 0.92;
    }
    importe_total += parseFloat(importe_final);
    importe_total = parseFloat(importe_total.toFixed(2)); // Redondear a 2 decimales

    if (!tipo_documento_general) tipo_documento_general = tipo_documento;
    
    if(!importePorProveedor[codigo_proveedor]) {
      importePorProveedor[codigo_proveedor] = 0;
    }
    importePorProveedor[codigo_proveedor] += parseFloat(importe_final);
    importePorProveedor[codigo_proveedor] = parseFloat(importePorProveedor[codigo_proveedor].toFixed(2));


    
  }

  


  console.log("Importe Total:" + importe_total);
  /*Evaluación */
  if (moneda_detalle == "PEN") {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_PEN");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RVH_PEN");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RVD_PEN");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_PEN");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RVH_PEN");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RVD_PEN");
    }
 
  }
  else {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_USD");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RVH_USD");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RVD_USD");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_VT_USD");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RVH_USD");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RVD_USD");
    }
  }





  const documentHeaderText = motivo.substring(0, 25);
  const documentItemText = motivo.substring(0, 50);

  const numberItem  = 3; 
  const resultadoArray = Object.entries(importePorProveedor).map(([codigo_proveedor, importe]) => ({
    codigo_proveedor,
    importe
  }));
  const creditorItems = resultadoArray.map(({codigo_proveedor, importe}, index) => {
    return `
    <CreditorItem>
      <ReferenceDocumentItem>${numberItem+ index}</ReferenceDocumentItem>
      <Creditor>${codigo_proveedor}</Creditor>
      <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe}</AmountInTransactionCurrency>
      <DebitCreditCode>S</DebitCreditCode>
      <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts>
      <DocumentItemText>${documentItemText}</DocumentItemText>
      <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
      <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
    </CreditorItem>`
  });

  const withholdingItems = resultadoArray.map(({codigo_proveedor, importe}, index) => {
    return `
    <WithholdingTaxItem>
      <ReferenceDocumentItem>${numberItem+ index}</ReferenceDocumentItem>
      <WithholdingTaxType>9P</WithholdingTaxType>
      <WithholdingTaxCode></WithholdingTaxCode>
      <TaxIsToBeCalculated>true</TaxIsToBeCalculated>
      <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0</AmountInTransactionCurrency>
      <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${importe}</TaxBaseAmountInTransCrcy>
    </WithholdingTaxItem>`
  });

  const allItems = [...creditorItems, ...withholdingItems];

  let posicionAsientoDiferencia = '';
  diferencia_rendicion = parseFloat(diferencia_rendicion);
  
  let diferencia = diferencia_rendicion + importeRecibo;
  diferencia = parseFloat(diferencia.toFixed(2));

  if (diferencia_rendicion < 0) {
    posicionAsientoDiferencia = `<CreditorItem>
                        <ReferenceDocumentItem>2</ReferenceDocumentItem>
                        <Creditor>${cod_auxilar_cont}</Creditor>
                        <!-- Código de BP Empleado -->
                        <AmountInTransactionCurrency currencyCode="${moneda_unica}">${diferencia}</AmountInTransactionCurrency>
                        <!-- Importe del fondo fijo-->
                        <DebitCreditCode>H</DebitCreditCode>
                        <AltvRecnclnAccts>${debitorAccountDiferencia.valor_general}</AltvRecnclnAccts>
                        <!-- Cuenta alternativa de deudor cuando es fondo fijo-->
                        <DocumentItemText>${documentItemText}</DocumentItemText>
                        <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                        <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                        <!-- Código de la solicitud-->     
                    </CreditorItem>`
  } else if (diferencia_rendicion > 0) {
    posicionAsientoDiferencia = `<DebtorItem>
                        <ReferenceDocumentItem>2</ReferenceDocumentItem>
                        <Debtor>${cod_auxilar_cont}</Debtor>
                        <AmountInTransactionCurrency currencyCode="${moneda_unica}">${diferencia}</AmountInTransactionCurrency>
                        <DebitCreditCode>S</DebitCreditCode>
                        <AltvRecnclnAccts>${creditorAccountDiferencia.valor_general}</AltvRecnclnAccts>
                        <DocumentItemText>${documentItemText}</DocumentItemText>
                        <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                        <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                    </DebtorItem>`
  }

  if (!creditorAccount) {
    throw new Error("Cuentas de acreedor no encontradas en los parámetros");
  }
  var body = ``;
  
    body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
        <soap:Header/>
        <soap:Body>
          <sfin:JournalEntryBulkCreateRequest>
            
            <MessageHeader>
              <ID>LOTE_01</ID>         
              <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
          </MessageHeader>
          <JournalEntryCreateRequest>
              <MessageHeader>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ID>LOTE_01</ID>
              </MessageHeader>
              <JournalEntry>
              <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                <BusinessTransactionType>RFBU</BusinessTransactionType>
                <AccountingDocumentType>AB</AccountingDocumentType>    
                <CompanyCode>10PE</CompanyCode>    
                <DocumentDate>${fecha_contabilizacion}</DocumentDate> 
                <PostingDate>${fecha_contabilizacion}</PostingDate>
                <CreatedByUser>COM_0002</CreatedByUser>                
                <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                <DocumentHeaderText>${documentHeaderText}</DocumentHeaderText>
                <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader>
                <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>              
                <!-- TIPO 02   -->
                  <DebtorItem>
                    <ReferenceDocumentItem>1</ReferenceDocumentItem>
                    <Debtor>${cod_auxilar_cont}</Debtor> 
                    <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe_f_fijo * -1.00}</AmountInTransactionCurrency>
                    <DebitCreditCode>H</DebitCreditCode>
                    <AltvRecnclnAccts>${debitorAccount.valor_general}</AltvRecnclnAccts> 
                    
                    <DocumentItemText>${documentItemText}</DocumentItemText>
                    <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                    <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                </DebtorItem>
                ${posicionAsientoDiferencia}
                <!-- TIPO 4 -->
                ${allItems.join('')}            
              </JournalEntry>
          </JournalEntryCreateRequest>
          </sfin:JournalEntryBulkCreateRequest>
          </soap:Body>
        </soap:Envelope>
    `
    console.log("LLEGo RENDICION ADICIONAL");
    console.log(body);
  return body;

};

async function generarXMLAsientoAdicionalRendionFF(parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos) {

  console.log('init generarXMLAsientoAdicionalRendionFF');
  // Obtener cuentas
  var creditorAccount = null;
  var debitorAccount = null;
  let creditorAccountDiferencia = null;
  let debitorAccountDiferencia = null;

  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    elemento_pep,
    ce_co,
    fecha_contabilizacion,
    motivo,
    diferencia_rendicion,
    nro_proyecto,
    saldo_pendiente 
  } = solicitud[0];

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));

  const elemento_pep_max_caracteres = elemento_pep.length > 12 ? elemento_pep.substring(0, 12) : elemento_pep;


  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  // Validar que todas las facturas tengan la misma moneda
  const moneda_unica = solicitudDetalle[0].moneda_detalle;
  const moneda_detalle = solicitudDetalle[0].moneda_detalle;
  // Acumular importes
  let importe_total = 0;
  let tipo_documento_general = null;
  let aplica_retencion = true;
  let importeRecibo = 0;

  const importePorProveedor = {};

  for (const detalle of solicitudDetalle) {
    aplica_retencion = false;
    const {
      importe_moneda_local,
      importe_dolares,
      tipo_documento,
      codigo_proveedor,
      importe_final_tc
    } = detalle;

    let importe_final = moneda_unica === "PEN" ? importe_moneda_local : importe_dolares;
    // Retención para RH >= 1500
    if (tipo_documento === "Recibo por Honorario" && importe_final_tc >= 1500) {
      importeRecibo += parseFloat((importe_final*0.08).toFixed(2));
      importe_final = importe_final * 0.92;
    }
    importe_total += parseFloat(importe_final);
    importe_total = parseFloat(importe_total.toFixed(2)); // Redondear a 2 decimales

    if (!tipo_documento_general) tipo_documento_general = tipo_documento;
    
    if(!importePorProveedor[codigo_proveedor]) {
      importePorProveedor[codigo_proveedor] = 0;
    }
    importePorProveedor[codigo_proveedor] += parseFloat(importe_final);
    importePorProveedor[codigo_proveedor] = parseFloat(importePorProveedor[codigo_proveedor].toFixed(2));


    
  }

  


  console.log("Importe Total:" + importe_total);
  /*Evaluación */
  if (moneda_detalle == "PEN") {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_PEN");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RFF_PEN");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RFF_PEN");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_PEN");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RFF_PEN");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RFF_PEN");
    }
 
  }
  else {
    if (tipo_documento_general != "Recibo por Honorario") {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_USD");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RFF_USD");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RFF_USD");
    } else {
      creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");
      debitorAccount = parametros.find(row => row.codigo_general === "GRL_DEBTOR_FF_USD");
      creditorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RFF_USD");
      debitorAccountDiferencia = parametros.find(row => row.codigo_general === "GRL_DEBDITOR_RFF_USD");
    }
  }





  const documentHeaderText = motivo.substring(0, 25);
  const documentItemText = motivo.substring(0, 50);

  const numberItem  = 3; 
  const resultadoArray = Object.entries(importePorProveedor).map(([codigo_proveedor, importe]) => ({
    codigo_proveedor,
    importe
  }));
  const creditorItems = resultadoArray.map(({codigo_proveedor, importe}, index) => {
    return `
    <CreditorItem>
      <ReferenceDocumentItem>${numberItem+ index}</ReferenceDocumentItem>
      <Creditor>${codigo_proveedor}</Creditor>
      <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${importe}</AmountInTransactionCurrency>
      <DebitCreditCode>S</DebitCreditCode>
      <AltvRecnclnAccts>${creditorAccount.valor_general}</AltvRecnclnAccts>
      <DocumentItemText>${documentItemText}</DocumentItemText>
      <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
      <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
    </CreditorItem>`
  });

  const withholdingItems = resultadoArray.map(({codigo_proveedor, importe}, index) => {
    return `
    <WithholdingTaxItem>
      <ReferenceDocumentItem>${numberItem+ index}</ReferenceDocumentItem>
      <WithholdingTaxType>9P</WithholdingTaxType>
      <WithholdingTaxCode></WithholdingTaxCode>
      <TaxIsToBeCalculated>true</TaxIsToBeCalculated>
      <AmountInTransactionCurrency currencyCode="${moneda_detalle}">0</AmountInTransactionCurrency>
      <TaxBaseAmountInTransCrcy currencyCode="${moneda_detalle}">${importe}</TaxBaseAmountInTransCrcy>
    </WithholdingTaxItem>`
  });

  const allItems = [...creditorItems, ...withholdingItems];

  let posicionAsientoDiferencia = '';
  diferencia_rendicion = parseFloat(diferencia_rendicion);
  
  let diferencia = diferencia_rendicion + importeRecibo;
  diferencia = parseFloat(diferencia.toFixed(2));

  if (diferencia_rendicion < 0) {
    posicionAsientoDiferencia = `<CreditorItem>
                        <ReferenceDocumentItem>2</ReferenceDocumentItem>
                        <Creditor>${cod_auxilar_cont}</Creditor>
                        <!-- Código de BP Empleado -->
                        <AmountInTransactionCurrency currencyCode="${moneda_unica}">${diferencia}</AmountInTransactionCurrency>
                        <!-- Importe del fondo fijo-->
                        <DebitCreditCode>H</DebitCreditCode>
                        <AltvRecnclnAccts>${debitorAccountDiferencia.valor_general}</AltvRecnclnAccts>
                        <!-- Cuenta alternativa de deudor cuando es fondo fijo-->
                        <DocumentItemText>${documentItemText}</DocumentItemText>
                        <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                        <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                        <!-- Código de la solicitud-->     
                    </CreditorItem>`
  } else if (diferencia_rendicion > 0) {
    posicionAsientoDiferencia = `<DebtorItem>
                        <ReferenceDocumentItem>2</ReferenceDocumentItem>
                        <Debtor>${cod_auxilar_cont}</Debtor>
                        <AmountInTransactionCurrency currencyCode="${moneda_unica}">${diferencia}</AmountInTransactionCurrency>
                        <DebitCreditCode>S</DebitCreditCode>
                        <AltvRecnclnAccts>${creditorAccountDiferencia.valor_general}</AltvRecnclnAccts>
                        <DocumentItemText>${documentItemText}</DocumentItemText>
                        <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                        <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                    </DebtorItem>`
  }

  if (!creditorAccount) {
    throw new Error("Cuentas de acreedor no encontradas en los parámetros");
  }
  var body = ``;
  
    body = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
        <soap:Header/>
        <soap:Body>
          <sfin:JournalEntryBulkCreateRequest>
            
            <MessageHeader>
              <ID>LOTE_01</ID>         
              <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
          </MessageHeader>
          <JournalEntryCreateRequest>
              <MessageHeader>
                <CreationDateTime>${fecha_actual_larga}</CreationDateTime>
                <ID>LOTE_01</ID>
              </MessageHeader>
              <JournalEntry>
              <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                <BusinessTransactionType>RFBU</BusinessTransactionType>
                <AccountingDocumentType>AB</AccountingDocumentType>    
                <CompanyCode>10PE</CompanyCode>    
                <DocumentDate>${fecha_contabilizacion}</DocumentDate> 
                <PostingDate>${fecha_contabilizacion}</PostingDate>
                <CreatedByUser>COM_0002</CreatedByUser>                
                <DocumentReferenceID>${nro_solicitud}</DocumentReferenceID>
                <DocumentHeaderText>${documentHeaderText}</DocumentHeaderText>
                <Reference1InDocumentHeader>${nro_solicitud}</Reference1InDocumentHeader>
                <Reference2InDocumentHeader>${elemento_pep}</Reference2InDocumentHeader>              
                <!-- TIPO 02   -->
                  <DebtorItem>
                    <ReferenceDocumentItem>1</ReferenceDocumentItem>
                    <Debtor>${cod_auxilar_cont}</Debtor> 
                    <AmountInTransactionCurrency currencyCode="${moneda_detalle}">${saldo_pendiente * -1.00}</AmountInTransactionCurrency>
                    <DebitCreditCode>H</DebitCreditCode>
                    <AltvRecnclnAccts>${debitorAccount.valor_general}</AltvRecnclnAccts> 
                    
                    <DocumentItemText>${documentItemText}</DocumentItemText>
                    <Reference1IDByBusinessPartner>${nro_solicitud}</Reference1IDByBusinessPartner>
                    <Reference2IDByBusinessPartner>${elemento_pep_max_caracteres}</Reference2IDByBusinessPartner>
                </DebtorItem>
                ${posicionAsientoDiferencia}
                <!-- TIPO 4 -->
                ${allItems.join('')}            
              </JournalEntry>
          </JournalEntryCreateRequest>
          </sfin:JournalEntryBulkCreateRequest>
          </soap:Body>
        </soap:Envelope>
    `
    console.log("LLEGo RENDICION ADICIONAL");
    console.log(body);
  return body;

};

exports.updateEnviadoTesoreria = async (params) => {
  const {id_solicitud, usuario, fecha_envio, id_solicitud_referencia} = params;
  let usuarioFinal = usuario;
  if(usuarioFinal === null || usuarioFinal === undefined){
    usuarioFinal = 'prueba@prueba.com';
  }


  try {
    await ConnectionInstance().query(QUERY.updateEnviarTesoreria, [id_solicitud, fecha_envio]);
    await ConnectionInstance().query(QUERY.cerrarFF, [id_solicitud_referencia]);
    await ConnectionInstance().query(QUERY.actualizarHistoricoEstadoSAP, [id_solicitud, usuarioFinal, 'Pago a Tesoreria', 'Pago a Tesoreria']);
    return {
      code: 1,
      message: "Se ha pagado a tesoreria"
    }
    
  } catch (error) {
    return {
      code: 0,
      message: "Error al actualizar el estado " + error
    }
  }

  
};

exports.findEstadoSolicitudRepository = async (params) => {
  console.log("Entra repository findEstadoSolicitud");

  const {estado_solicitud} = params;

  const query = await ConnectionInstance().query(QUERY.findEstadoSolicitudById, [estado_solicitud]).then(result => {
    return result.rows[0];
  });

  return buildEstadoSolicitudRepository(query);
};

const buildEstadoSolicitudRepository = (row) => {
  return {
    id_parametro: row.id_parametro,
    codigo: row.codigo,
    valor_parametro: row.valor_parametro,
  }
}

exports.getViewAsiento = async (params) => {
  console.log("Params recibidos en getViewAsiento:", params);
  const {id_solicitud} = params;
  console.log("id_solicitud extraído:", id_solicitud);
  try {
    

    const solicitud = await ConnectionInstance().query(QUERY.findSolicitudSAP, [id_solicitud]);
    if (!solicitud.rows || solicitud.rows.length === 0) {
      throw new Error("Solicitud no encontrada");
    }

    const solicitud_detalle = await ConnectionInstance().query(QUERY.findSolicitudDetalleSAP, [id_solicitud]);

    // Consulta de parámetros generales
    const tipoGastos = await ConnectionInstance().query(QUERY.findTipoGasto);
    if (!tipoGastos.rows || tipoGastos.rows.length === 0) {
      throw new Error("tipoGastos no encontrados");
    }

    // Consulta de parámetros generales
    const parametros = await ConnectionInstance().query(QUERY.findParametroGeneral);
    if (!parametros.rows || parametros.rows.length === 0) {
      throw new Error("Parámetros generales no encontrados");
    }

    // Validar tipo de solicitud
    const tipoSolicitud = solicitud.rows[0]?.tipo_solicitud;

    return  generarJsonAsiento(parametros.rows, solicitud.rows, tipoSolicitud, solicitud_detalle.rows, tipoGastos.rows);

  } catch (error) {
    console.error("Error: ", error);
    throw new Error("Error getting view asiento");
  }
}

const generarJsonAsiento = (parametros, solicitud, tipoSolicitud, solicitudDetalle, tipoGastos) => {

  var creditorAccount = null;
  let solicitudAsientodetalle = []

  let montoTotal = 0;


  var {
    nro_solicitud,
    fecha_actual_larga,
    fecha_actual_corta,
    fecha_solicitud,
    cod_auxilar_cont,
    importe_f_fijo,
    nro_solicitud_referencia,
    ce_co,
    elemento_pep,
    saldo_pendiente,
    pais_gasto,
    diferencia_rendicion,
    fecha_contabilizacion,
    motivo,
    nro_proyecto
  } = solicitud[0];

  if (elemento_pep != '') {
    ce_co = '';
  }

  nro_solicitud = nro_solicitud.substring(nro_solicitud.indexOf('REN'));

  console.log(nro_solicitud_referencia);
  if (nro_solicitud_referencia != null) {
    if (nro_solicitud_referencia != '' && nro_solicitud_referencia != 'null') {
      nro_solicitud_referencia = nro_solicitud_referencia.substring(nro_solicitud_referencia.indexOf('REN'));
    } else {
      nro_solicitud_referencia = nro_solicitud;
    }
  }
  else {
    nro_solicitud_referencia = nro_solicitud;
  }

  for (const detalle of solicitudDetalle) {

    const {
      id_solicitud_detalle,
      id_solicitud,
      nro_documento,
      fecha_documento,
      ruc,
      razon_social,
      tipo_cambio,
      importe_moneda_local,
      importe_dolares,
      base_imponible,
      igv,
      valor,
      codigo_sap,
      codigo_proveedor,
      moneda_detalle,
      id_tipo_gasto,
      exonerado,
      tipo_documento,
      motivo_gasto
    } = detalle;

    var importe_final = importe_moneda_local;
    var igv_final = igv;
    var base_imponible_final = (base_imponible * 1.00);

    var codigo_sap_tipo_gasto = tipoGastos.find(row => row.id_tipo_gasto === id_tipo_gasto).codigo_sap;

    if (moneda_detalle != "PEN") {
      importe_final = importe_dolares;
    }

    /*Evaluación */
    if (tipoSolicitud === "Rendición - Fondo Fijo" || tipoSolicitud === "Pasajes Aéreos/Otros" || tipoSolicitud === "Reembolso") {


      if (tipo_documento != "Recibo por Honorario") {
        if (moneda_detalle == "PEN") {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_PEN");
        }
        else {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_USD");

        }

        if (solicitud[0].pais_gasto != 'Perú') {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFF_EXT");

          if (moneda_detalle != "PEN") {
            importe_final = importe_dolares;
            igv_final = 0;
            base_imponible_final = 0;
          }

        }
      } else {

        if (moneda_detalle == "PEN") {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFFRH_PEN");
        }
        else {
          creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNFFRH_USD");
        }

      }
    }

    if (tipoSolicitud === "Rendición - Viáticos") {

      if (solicitud[0].moneda == "PEN") {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_PEN");
      }
      else {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_USD");
      }

      if (solicitud[0].pais_gasto != 'Perú') {
        creditorAccount = parametros.find(row => row.codigo_general === "GRL_CREDITOR_RNVT_EXT");

        if (moneda_detalle != "PEN") {
          importe_final = importe_dolares;
          igv_final = 0;
          base_imponible_final = 0;
        }
      }

      

    }

    if (!creditorAccount) {
      throw new Error("Cuentas de acreedor no encontradas en los parámetros");
    }
    montoTotal+= parseFloat(importe_final);

    solicitudAsientodetalle.push({
      moneda: moneda_detalle,
      cuentaGasto: codigo_sap_tipo_gasto,
      proveedor: codigo_proveedor,
      monto: parseFloat(importe_final)
    })

  }
  solicitudAsientodetalle.push({
    moneda : solicitudDetalle[0].moneda_detalle,
    cuentaGasto: creditorAccount.valor_general,
    proveedor: cod_auxilar_cont,
    monto: montoTotal
  })

  return {
    solicitudAsientodetalle
  }
}

exports.confirmacionCompensacion = async (params) => {
  
  try {
    await ConnectionInstance().query(QUERY.registrarLogIntegraciones, ["SAP","/v1/confirmacionCompensacion", params]);
    return { code: 1, message: params };

  } catch (error) {
    console.error("Error: ", error);
    throw new Error("Error getting view asiento");
  }
}



async function generarfacturaProveedor(solicitudDetalle,fecha_contabilizacion) {
 var listaFacturas = [];
 for (const detalle of solicitudDetalle) {
    let valores ="";
    if(detalle.id_tipo_tasa != 0 && detalle.orden_compra != "" && detalle.ind_retencion == "S"){
        let baseUrl = 'https://my417125-api.s4hana.cloud.sap';
        let url = `${baseUrl}/sap/opu/odata/sap/YY1_SUPPLIERINVOICE_CDS/YY1_SupplierInvoice?$filter=PurchaseOrder eq '${detalle.orden_compra}' and PurchaseOrderItem eq '${detalle.posicion_orden_compra}'`;
        let usernameFindAll = 'API_ANDDES';
        let passwordFindAll = 'sfQE]TS=Wf4HoLvJxvj99mY(ll~MJpA=sFL9y/Z~';

        let username = 'COM_0002';
        let password = 'MEVQYrHF7AcdwawYRrYgVzrMXRgT%DWfkiwuFgGr';

        try {
          const response = await axios.get(url, {
            headers: {
              'Accept-Encoding': 'gzip,deflate',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'charset': 'UTF-8',
            },
            auth: {
              username: usernameFindAll,
              password: passwordFindAll
            }
          });

          if(response.data.d.results.length === 0){
            return [{code:0, message:`No se encontraron datos de OC ${detalle.orden_compra} con posición ${detalle.posicion_orden_compra} en SAP` }];
          }
          let data = response.data.d.results[0];

          const now = new Date();
          const timestamp = now.getTime(); // milisegundos desde 1970
          const sapDate = `/Date(${timestamp})/`;

          const dateContable = new Date(fecha_contabilizacion);
          const timestampContable = dateContable.getTime();
          const sapDateContabilizacion = `/Date(${timestampContable})/`;
          const sapDateFactura = toSapDate(detalle.fecha_documento);

          let jsonOC = {
                        "CompanyCode": "10PE",
                        "InvoicingParty": detalle.codigo_proveedor,//
                        "DocumentDate": sapDateFactura,
                        "PostingDate": sapDateContabilizacion,
                        "TaxDeterminationDate": sapDateFactura,
                        "TaxIsCalculatedAutomatically": true,
                        "SupplierInvoiceStatus": "A",
                        "InvoiceGrossAmount": detalle.importe_moneda_local,
                        "DocumentCurrency": detalle.moneda_detalle,
                        "PaymentTerms": "NT00",
                        "SupplierInvoiceIDByInvcgParty": detalle.nro_documento,
                        "to_SuplrInvcItemPurOrdRef": [
                            {
                                "SupplierInvoiceItem": "1",
                                "PurchaseOrder": detalle.orden_compra,
                                "PurchaseOrderItem": detalle.posicion_orden_compra,
                                "ServiceEntrySheet": data.ServiceEntrySheet,
                                "ServiceEntrySheetItem": data.ServiceEntrySheetItem,
                                "ReferenceDocument": data.MaterialDocument,
                                "ReferenceDocumentItem": data.MaterialDocumentItem,
                                "ReferenceDocumentFiscalYear": data.MaterialDocumentYear,
                                "SupplierInvoiceItemAmount": data.NetAmount,
                                "QuantityInPurchaseOrderUnit": data.QuantityInEntryUnit,
                                "PurchaseOrderQtyUnitISOCode": data.EntryUnit,
                                "DocumentCurrency":data.DocumentCurrency,
                                "TaxCode": data.TaxCode
                            }
                        ],
                        "to_SupplierInvoiceWhldgTax": [
                            {
                                "WithholdingTaxType": detalle.codigo_retencion,
                                "DocumentCurrency": detalle.moneda_detalle,
                                "WithholdingTaxCode": "01"
                            }
                        ]
                    }
        //Consultar token
        console.log(JSON.stringify(jsonOC));
        let urlGet = `${baseUrl}/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/`;
        const responseToken = await axios.get(urlGet,{
            headers: {
              'Accept-Encoding': 'gzip,deflate',
              'x-csrf-token': 'Fetch',
            },
            auth: {
              username: username,
              password: password
            }
        });
        // Capturamos el token desde los headers
        const csrfToken = responseToken.headers['x-csrf-token'];
        const cookies = responseToken.headers['set-cookie'];


        //Enviar Estrucutra a SAP
        let urlPost = `${baseUrl}/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice`;
        const responsePost = await axios.post(urlPost, jsonOC,{
            headers: {
              'Accept-Encoding': 'gzip,deflate',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'charset': 'UTF-8',
              'x-csrf-token': csrfToken,
              'Cookie': cookies.join('; '),
            },
            auth: {
              username: username,
              password: password
            }
        });

          listaFacturas.push({ code: 200, message: "F"+responsePost.data.d.SupplierInvoice,nro_documento:detalle.nro_documento});
        }catch (error) {;
          listaFacturas.push({ code: 400, message: error.response.data.error.message.value,nro_documento:detalle.nro_documento});
        }

    }

 }
 return listaFacturas;

}

exports.findTipoRendicion = async () => {
  return ConnectionInstance().query(QUERY.findTipoRetencion, [])
    .then((resultSet) => {
      let listResult = [];
      for (let index in resultSet.rows) {
        let row = resultSet.rows[index];
        listResult.push(row);
      }
      return {
        RESULT: listResult,
      };
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error("Error getting tipo Rendicion");
    });
};
function toSapDate(input, { includeOffset = false } = {}) {
  let d;

  if (input instanceof Date) {
    d = input;
  } else if (typeof input === 'number') {
    d = new Date(input);
  } else if (typeof input === 'string') {
    // Para 'YYYY-MM-DD' crea la fecha en UTC a medianoche (evita corrimientos)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    d = m
      ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0))
      : new Date(input); // fallback (ISO, etc.)
  } else {
    throw new Error('Tipo no reconocido para fecha_documento');
  }

  const ms = d.getTime();
  if (!includeOffset) return `/Date(${ms})/`;

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `/Date(${ms}${sign}${hh}${mm})/`;
}