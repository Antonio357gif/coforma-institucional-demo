\# MAPA DE VERDAD — COFORMA INSTITUCIONAL



\*\*Documento vivo de arquitectura, lógica backend, fuentes de datos y reglas semánticas del pilar institucional de Coforma.\*\*  

\*\*Proyecto:\*\* `coforma-institucional-demo`  

\*\*Dominio:\*\* `https://institucional.coforma.es`  

\*\*Ubicación:\*\* `docs/MAPA\_VERDAD\_INSTITUCIONAL.md`  

\*\*Fecha de creación:\*\* 14/05/2026  

\*\*Estado:\*\* primera versión de control arquitectónico.



\---



\## 1. Propósito de este documento



Este documento existe para fijar la lógica real del proyecto \*\*Coforma Institucional\*\*, evitando que la demo dependa de memoria de chat, reconstrucciones parciales, “fotos madre” no explicadas o decisiones tomadas sin trazabilidad.



Su finalidad es responder siempre a estas preguntas:



\- de dónde nace cada dato;

\- qué tabla es fuente real;

\- qué vista es de detalle;

\- qué vista o tabla sirve para resumen ejecutivo;

\- qué pantalla consume cada fuente;

\- qué reglas semánticas no se deben romper;

\- qué parte procede de resolución oficial;

\- qué parte sigue siendo simulación controlada;

\- qué debe escalar si el proyecto pasa de demo a sistema real autonómico o nacional.



\---



\## 2. Finalidad del pilar institucional



Coforma Institucional no es el CRM operativo de academias.



Su finalidad es representar una plataforma institucional para la \*\*fiscalización de la Formación Profesional para el Empleo\*\*, con lectura de:



\- resolución concedida;

\- entidades beneficiarias;

\- acciones AF/CP concedidas;

\- subexpedientes administrativos;

\- ejecución;

\- recepción documental;

\- justificación económica;

\- alertas;

\- actuaciones administrativas;

\- decisiones;

\- trazabilidad técnica;

\- auditoría/intervención.



La lógica institucional debe seguir este recorrido natural:



Resolución oficial  

→ Entidad beneficiaria  

→ Oferta concedida  

→ Subexpediente  

→ Ejecución  

→ Recepción documental  

→ Justificación  

→ Actuación administrativa  

→ Decisión  

→ Auditoría / trazabilidad



\---



\## 3. Principio rector



El backend debe ser la fuente de verdad.



El frontend no debe inventar cifras, maquillar datos ni corregir incoherencias mediante lógica visual.



La demo puede contener simulación controlada, pero esa simulación debe estar:



\- identificada;

\- trazada;

\- diferenciada de dato oficial;

\- reproducible por reglas backend;

\- documentada.



La “foto madre” actual no debe convertirse en arquitectura permanente. Debe considerarse una referencia saneada de validación.



Principio clave:



> No dependemos de la foto madre.  

> El objetivo es que el backend produzca de forma natural la coherencia que hoy usamos como foto madre de referencia.



\---



\## 4. Estado actual reconocido



La demo institucional actual se construyó a partir de datos de resolución oficial FPED 2025, ampliaciones de volumen, simulación controlada y regularizaciones realizadas para recomponer incoherencias detectadas durante el desarrollo.



La base actual es válida como demo funcional, pero debe evolucionar hacia una arquitectura más gobernada.



Estado actual consolidado:



\- convocatoria principal: `FPED-2025-ANEXO-I`;

\- acciones concedidas: `2053`;

\- acciones AF: `1449`;

\- acciones CP: `604`;

\- entidades activas reales con oferta: `106`;

\- entidad técnica histórica inactiva: `id 45`;

\- documentos bajo control: `78377`;

\- documentos validados: `22838`;

\- documentos recibidos pendientes: `19637`;

\- documentos no aplica: `35902`;

\- sin recibir: `0`;

\- revisión/riesgo vivo: `0`.



Estos datos deben entenderse como fotografía actual saneada, no como sustituto de las reglas permanentes.



\---



\## 5. Separación de capas



El sistema institucional debe organizarse en capas.



\### 5.1. Capa fuente / resolución



Contiene la información de concesión oficial y estructura base de la resolución.



Tablas principales:



\- `convocatorias`

\- `entidades\_beneficiarias`

\- `convocatoria\_entidades`

\- `oferta\_concedida`



Función:



\- representar la resolución concedida;

\- vincular entidades beneficiarias con convocatorias;

\- registrar acciones AF/CP concedidas;

\- mantener importes, horas, alumnado previsto, especialidades y datos administrativos base.



\---



\### 5.2. Capa canónica institucional



Contiene entidades, acciones y subexpedientes ya interpretados como unidades fiscalizables.



Tablas principales:



\- `entidades\_beneficiarias`

\- `oferta\_concedida`

\- `subexpedientes\_accion`



Reglas actuales:



\- entidad operativa = entidad activa y con oferta asociada;

\- entidad `id 45` = entidad técnica histórica inactiva, conservada por trazabilidad, no debe contar como entidad operativa;

\- acción concedida = registro válido en `oferta\_concedida`;

\- subexpediente = unidad administrativa/fiscalizable derivada de una acción concedida.



\---



\### 5.3. Capa operativa



Contiene estados vivos o simulados-controlados de ejecución, documentación, pago, justificación y actuaciones.



Tablas principales:



\- `ejecucion\_acciones`

\- `recepcion\_documentacion`

\- `justificacion\_acciones`

\- `actuaciones\_administrativas`

\- `subexpedientes\_accion`



Función:



\- registrar ejecución;

\- registrar documentación;

\- registrar validación documental;

\- registrar justificación;

\- registrar actuaciones;

\- registrar decisiones o estados administrativos;

\- permitir trazabilidad.



\---



\### 5.4. Capa de detalle fiscalizable



Son vistas o funciones que enriquecen datos para pantallas operativas y de fiscalización.



Ejemplos actuales:



\- `v\_oferta\_formativa\_institucional`

\- `v\_recepcion\_documentacion\_panel`

\- `v\_fiscalizacion\_trazabilidad\_accion`

\- `v\_alertas\_institucionales\_tipificadas`

\- funciones RPC de paginación/filtrado documental.



Uso correcto:



\- listados filtrados;

\- mesas de trabajo;

\- fichas;

\- auditoría;

\- detalle de subexpedientes;

\- revisión documental.



No deben utilizarse sin control como fuente directa de dashboards ejecutivos si implican cruces pesados.



\---



\### 5.5. Capa ejecutiva / resumen



Contiene vistas o tablas de resumen para lectura rápida del dashboard y control institucional.



Vistas actuales:



\- `v\_fiscalizacion\_resumen`

\- `v\_oferta\_formativa\_resumen\_institucional`

\- `v\_recepcion\_documentacion\_resumen`



Problema detectado:



`v\_recepcion\_documentacion\_resumen` calcula sobre `v\_recepcion\_documentacion\_panel`, que a su vez cruza múltiples tablas. Esto puede generar timeouts si el dashboard la consulta en vivo.



Decisión pendiente:



Crear una capa estable de resumen documental institucional, calculada desde tablas base y no desde vista pesada de detalle.



Posible nombre futuro:



\- `resumen\_documental\_institucional`



\---



\## 6. Regla crítica para dashboards



El dashboard institucional no debe recalcular en vivo el detalle documental masivo.



Regla de arquitectura:



\- Dashboard = resumen ejecutivo.

\- Listado = consulta filtrada/paginada.

\- Mesa documental = detalle operativo.

\- Ficha de subexpediente = detalle puntual.

\- Auditoría = trazabilidad bajo demanda.



Esto es imprescindible si el proyecto escala a cientos de miles o millones de documentos.



\---



\## 7. Fuentes actuales por pantalla



\### 7.1. `/dashboard`



Función:



\- lectura ejecutiva de la resolución;

\- estado económico;

\- estado operativo;

\- documentación;

\- impacto potencial;

\- control institucional;

\- focos de fiscalización.



Fuentes actuales:



\- `v\_fiscalizacion\_resumen`

\- `v\_oferta\_formativa\_resumen\_institucional`

\- `v\_recepcion\_documentacion\_resumen` actualmente problemática/pesada.



Estado reciente:



Se estabilizó el dashboard para que no caiga si el resumen documental tarda o falla, mostrando aviso de resumen documental pendiente.



Esto es un airbag funcional, no la arquitectura definitiva.



Pendiente:



Sustituir lectura documental pesada por resumen documental institucional persistido y trazable.



\---



\### 7.2. `/oferta-formativa`



Función:



\- consulta general de acciones AF/CP concedidas;

\- estados administrativos;

\- fechas previstas/validadas;

\- importes;

\- filtros por estado, tipo, entidad y fin validada;

\- acceso a subexpediente.



Fuentes actuales:



\- `v\_oferta\_formativa\_institucional`

\- `v\_oferta\_formativa\_resumen\_institucional`



Regla:



La oferta formativa debe representar acciones concedidas y su estado fiscalizable, no programación interna del SCE.



\---



\### 7.3. `/recepcion-documentacion`



Función:



\- mesa documental por subexpediente;

\- control por fases;

\- revisión de documentos;

\- registro de recepción;

\- validación;

\- subsanación;

\- no aplica;

\- estado de pago operativo.



Fuentes actuales:



\- `v\_recepcion\_documentacion\_resumen`

\- RPC `get\_recepcion\_documentacion\_acciones\_pagina\_filtrada`

\- `v\_recepcion\_documentacion\_panel`

\- tabla `recepcion\_documentacion`

\- tabla `subexpedientes\_accion`



Regla:



Esta pantalla sí puede usar vistas de detalle, siempre con paginación, filtros y selección de subexpediente.



\---



\### 7.4. `/subexpedientes-accion/\[id]`



Función:



\- ficha central del subexpediente;

\- lectura administrativa;

\- alerta concreta si procede;

\- evidencia;

\- estado económico/documental/operativo.



Fuentes relacionadas:



\- `v\_oferta\_formativa\_institucional`

\- `subexpedientes\_accion`

\- `recepcion\_documentacion`

\- alertas/tipologías cuando entren desde `/alertas`.



Regla:



El subexpediente es la unidad central de fiscalización de una acción concedida.



\---



\### 7.5. `/justificacion-economica`



Función:



\- lectura económica de la resolución;

\- importes concedidos, ejecutados, finalizados, pendientes, no devengados o sujetos a revisión;

\- acceso a decisión económica.



Fuentes actuales:



\- vistas/resúmenes económicos institucionales;

\- `subexpedientes\_accion`;

\- `justificacion\_acciones`;

\- `v\_oferta\_formativa\_resumen\_institucional`.



Regla:



No debe mostrar riesgo vivo si la lectura backend actual lo tiene saneado a cero.



\---



\### 7.6. `/decisiones` y `/decisiones-economicas/\[id]`



Función:



\- lectura de decisión administrativa/económica;

\- ficha económica del subexpediente;

\- actuación sugerida;

\- evidencia;

\- preparación de actuación administrativa.



Regla:



La decisión debe estar vinculada a subexpediente, evidencia y trazabilidad, no a un dato pintado.



\---



\### 7.7. `/acciones`, `/acciones/nueva`, `/actuaciones-emitidas`, `/actuaciones-emitidas/\[id]`



Función:



\- preparación y registro de actuaciones administrativas;

\- trazabilidad de actuaciones emitidas;

\- conexión con decisiones, alertas y subexpedientes.



Regla:



Una actuación administrativa debe poder emitirse desde un subexpediente real, con contexto y trazabilidad.



\---



\### 7.8. `/alertas`



Función:



\- lectura de alertas tipificadas;

\- alertas críticas/medias;

\- alertas documentales subsanables;

\- acceso al subexpediente con tipología concreta.



Regla:



Las alertas deben reflejar riesgo real o control documental concreto, no restos de simulaciones antiguas.



\---



\## 8. Semántica no negociable



\### 8.1. Entidad beneficiaria



Entidad beneficiaria = titular de expediente/concesión.



Debe distinguirse entre:



\- entidad activa operativa;

\- entidad técnica histórica;

\- entidad incompleta;

\- entidad con oferta;

\- entidad sin oferta.



Regla actual:



\- entidades totales en tabla: `107`;

\- entidades activas reales: `106`;

\- entidad `id 45`: técnica, inactiva, conservada por trazabilidad histórica.



\---



\### 8.2. Acción concedida



Acción concedida = AF/CP aprobada en resolución.



Tabla base:



\- `oferta\_concedida`



No debe confundirse con curso programado por SCE.



El SCE valida, controla y fiscaliza. No “programa” la formación en el sentido operativo de academia.



\---



\### 8.3. Subexpediente



Subexpediente = unidad administrativa/fiscalizable de una acción concedida.



Tabla base:



\- `subexpedientes\_accion`



El subexpediente concentra:



\- estado operativo administrativo;

\- prioridad técnica;

\- documentación;

\- incidencias;

\- requerimientos;

\- riesgo administrativo;

\- riesgo económico;

\- fechas previstas/comunicadas/validadas;

\- observaciones;

\- estado de pago;

\- trazabilidad.



\---



\### 8.4. Documento / control documental



Documento o control documental = registro individual fiscalizable dentro de `recepcion\_documentacion`.



Debe poder responder:



\- qué documento es;

\- de qué fase;

\- de qué subexpediente;

\- de qué acción;

\- de qué entidad;

\- en qué estado está;

\- si se recibió;

\- si se validó;

\- si requiere subsanación;

\- si tiene riesgo activo;

\- qué técnico lo revisó;

\- qué fuente normativa aplica.



\---



\### 8.5. Recibido vs validado



Recibido no significa validado.



La lectura correcta es:



\- `recibido` = aportado, pendiente de validación definitiva;

\- `validado` = documentación conforme;

\- `no\_aplica` = fase/documento no procedente;

\- `no\_recibido` = pendiente real de aportación;

\- `en\_revision` = pendiente de análisis técnico;

\- `subsanable` = requiere corrección;

\- `rechazado` = no conforme;

\- `vencido` = fuera de plazo.



Por claridad visual, el KPI puede nombrar `recibidos` como `Recibidos pendientes`.



\---



\## 9. Simulación controlada vs dato oficial



La demo institucional mezcla:



\- datos basados en resolución oficial;

\- datos derivados de cargas ampliadas;

\- simulación controlada para ejecución/documentación;

\- regularizaciones trazadas para corregir incoherencias.



Regla:



Cada dato importante debe poder clasificarse como:



\- resolución oficial;

\- simulación controlada;

\- regularización técnica;

\- dato operativo futuro;

\- dato calculado.



El objetivo futuro es reducir dependencia de simulación y aumentar trazabilidad de origen.



\---



\## 10. Problemas/riesgos detectados



\### 10.1. Dependencia mental de la foto madre



Riesgo:



Tomar la foto madre como fuente permanente de verdad.



Corrección conceptual:



La foto madre debe ser referencia de validación, no arquitectura.



\---



\### 10.2. Vistas pesadas en dashboard



Riesgo:



El dashboard puede fallar por timeout si consulta vistas de detalle masivas.



Caso detectado:



`v\_recepcion\_documentacion\_resumen`

→ `v\_recepcion\_documentacion\_panel`

→ múltiples joins sobre documentación, oferta, entidades, catálogo, convocatoria y subexpedientes.



Corrección futura:



Crear resumen documental institucional persistido, trazado y recalculable.



\---



\### 10.3. Pérdida de contexto entre chats



Riesgo:



Decisiones tomadas durante horas de trabajo pueden perderse al cambiar de chat.



Corrección:



Mantener documentación viva en el repositorio:



\- `docs/COFORMA\_ECOSISTEMA.md`

\- `docs/MAPA\_VERDAD\_INSTITUCIONAL.md`



\---



\## 11. Pendiente arquitectónico inmediato



Antes de tocar de nuevo SQL o frontend sensible:



1\. Completar este mapa.

2\. Validar fuentes por pantalla.

3\. Diseñar `resumen\_documental\_institucional`.

4\. Crear función de refresco controlada.

5\. Comparar resultado con la situación actual.

6\. Cambiar `/dashboard` para leer el resumen estable.

7\. Documentar la decisión.

8\. Subir a GitHub.



\---



\## 12. Principio de escalabilidad



Si el proyecto escala a nivel autonómico o nacional, no puede depender de recalcular vistas completas en cada entrada de usuario.



Debe funcionar con:



\- tablas operativas normalizadas;

\- índices correctos;

\- funciones de refresco;

\- resúmenes ejecutivos;

\- paginación;

\- filtros;

\- auditoría;

\- trazabilidad;

\- integración por API;

\- separación entre CRM e institucional.



\---



\## 13. Criterio de trabajo



Reglas de trabajo para este pilar:



1\. Backend manda.

2\. Una consulta SQL por turno.

3\. No ejecutar cambios estructurales sin explicar su propósito.

4\. No confundir dato oficial con simulación.

5\. No mezclar CRM operativo con institucional.

6\. No tocar varias páginas a la vez.

7\. Si una página sensible requiere cambios, entregar archivo completo.

8\. No usar `git add .`.

9\. Hacer `git status` antes de añadir.

10\. Añadir archivos selectivos.

11\. Build antes de commit si se toca código.

12\. Commit claro.

13\. Push a main.

14\. Verificar Vercel.

15\. Actualizar documentación si cambia una regla de arquitectura o semántica.



\---



\## 14. Estado inicial de este documento



Este documento se crea después de detectar que el dashboard institucional podía fallar por timeout al consultar el resumen documental vivo.



Se decidió no seguir parchando sin mapa.



Primero se creó:



`docs/COFORMA\_ECOSISTEMA.md`



Después se crea este documento específico:



`docs/MAPA\_VERDAD\_INSTITUCIONAL.md`



El objetivo es que cualquier cambio futuro en la arquitectura institucional se pueda razonar desde este mapa y no desde memoria dispersa de chat.


---

## Actualización 14/05/2026 - Dashboard documental persistido

El dashboard institucional /dashboard queda actualizado para consumir el resumen documental desde la tabla persistida public.resumen_documental_institucional.

Deja de consumir directamente public.v_recepcion_documentacion_resumen, evitando que el dashboard ejecutivo dependa de una vista documental pesada en cada carga.

La tabla public.resumen_documental_institucional se alimenta mediante public.refresh_resumen_documental_institucional(), calculando desde tablas base y dejando trazabilidad de origen_calculo, version_regla, calculado_en y registros_procesados.

Valores validados en la carga inicial: documentos_total 78377, recibidos_pendientes 19637, validados 22838, no_aplica 35902, no_recibidos 0, ofertas 2053, subexpedientes 2053, entidades 106, registros_procesados 78377.

Criterio arquitectónico confirmado: Dashboard = resumen ejecutivo persistido; Listado/documentación = consulta paginada y filtrada; Ficha = detalle puntual; Auditoría = trazabilidad bajo demanda.

Cambio validado en localhost y desplegado en producción mediante el commit 524e6f3 - Leer resumen documental persistido en dashboard.

---

## Actualización 14/05/2026 - Control técnico de refresco documental

Se añade una vía operativa controlada para refrescar el resumen documental persistido desde la propia demo institucional.

Backend incorporado:
- public.refrescar_resumen_documental_institucional_rpc()

Esta RPC ejecuta public.refresh_resumen_documental_institucional() y devuelve evidencia del cálculo actualizado: convocatoria_codigo, documentos_total, recibidos_pendientes, validados, no_aplica, riesgo_activo_alto_critico, ofertas, subexpedientes, entidades, registros_procesados, version_regla y calculado_en.

Frontend incorporado:
- src/app/trazabilidad-tecnica/page.tsx

La página /trazabilidad-tecnica incorpora un bloque de control técnico llamado Resumen documental persistido. Desde este bloque se puede consultar el estado actual de public.resumen_documental_institucional, ver la última fecha de cálculo y ejecutar el refresco mediante la RPC trazada.

Criterio semántico corregido:
- No se usa el concepto registros madre.
- La lectura pasa a controles documentales trazados.
- La página mantiene la lógica de trazabilidad documental viva, no de foto madre estática.

Valores validados en local:
- documentos_total: 78377
- recibidos_pendientes: 19637
- validados: 22838
- no_aplica: 35902
- riesgo_activo_alto_critico: 0
- registros_procesados: 78377
- ofertas/subexpedientes: 2053 / 2053
- entidades: 106

Estado local:
- Build correcto.
- Validación visual correcta en /trazabilidad-tecnica.
- Pendiente de subir en una tanda conjunta junto con los próximos cambios coherentes.
