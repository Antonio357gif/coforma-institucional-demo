\# COFORMA — MAPA DEL ECOSISTEMA



\*\*Documento vivo de arquitectura, contexto y gobierno del proyecto Coforma.\*\*  

\*\*Ubicación actual:\*\* `coforma-institucional-demo/docs/COFORMA\_ECOSISTEMA.md`  

\*\*Fecha de creación:\*\* 14/05/2026  

\*\*Estado:\*\* documento inicial de control y orientación.



\---



\## 1. Propósito de este documento



Este documento existe para evitar pérdida de contexto entre chats, sesiones de trabajo, cambios de código, cambios de backend y decisiones estratégicas.



Coforma ha evolucionado desde un proyecto inicial centrado en un \*\*CRM INTEGRAL FPE\*\* hacia un ecosistema compuesto por tres pilares relacionados, pero funcional y técnicamente diferenciados:



1\. \*\*Web pública Coforma\*\*

2\. \*\*CRM INTEGRAL FPE para academias\*\*

3\. \*\*Coforma Institucional para fiscalización FPE\*\*



La finalidad de este documento no es sustituir la bitácora ni los puntos de reenganche, sino actuar como \*\*mapa estable del ecosistema\*\*, para que cualquier decisión futura tenga una base común y no dependa exclusivamente de la memoria del chat.



\---



\## 2. Principio rector del ecosistema Coforma



Coforma debe entenderse como un ecosistema de soluciones para la Formación Profesional para el Empleo, no como una única aplicación mezclada.



Cada pilar debe ser independiente a nivel técnico y funcional, pero coherente con una visión común:



\- sustituir controles manuales, Excel, Access y procesos dispersos;

\- centralizar información;

\- mejorar trazabilidad;

\- permitir control operativo;

\- permitir fiscalización institucional;

\- conectar datos reales con lectura ejecutiva;

\- preparar una futura integración por API entre operación académica e instituciones.



\---



\## 3. Los tres pilares actuales



\### 3.1. Pilar 1 — Web pública Coforma



\*\*Dominio:\*\* `https://coforma.es`  

\*\*Finalidad:\*\* presencia pública, marca, relato comercial, presentación del producto y acceso hacia el área cliente.



La web pública no debe contener lógica operativa pesada ni fiscalización. Su función es explicar Coforma, generar confianza y dirigir al usuario correcto hacia el entorno adecuado.



\*\*Rol dentro del ecosistema:\*\*



\- presentación institucional/comercial;

\- comunicación de valor;

\- puerta de entrada;

\- enlace hacia `app.coforma.es`;

\- futura explicación del ecosistema Coforma.



\---



\### 3.2. Pilar 2 — CRM INTEGRAL FPE



\*\*Dominio:\*\* `https://app.coforma.es`  

\*\*Finalidad:\*\* aplicación SaaS multitenant para academias, centros de formación y entidades que gestionan Formación Profesional para el Empleo.



Este pilar es el corazón operativo para academias.



\*\*Flujo funcional principal:\*\*



Persona → Lead → Matrícula → Alumno → Expediente



\*\*Ámbitos principales:\*\*



\- captación;

\- leads;

\- matrículas;

\- alumnos;

\- expedientes;

\- oferta formativa;

\- planificación;

\- convocatorias;

\- agenda;

\- mensajería;

\- gestión de llamadas;

\- usuarios/licencias;

\- documentación operativa y académica.



\*\*Principio crítico:\*\*



El CRM operativo no debe contaminarse con lógica institucional directa. Debe poder entregar información a la capa institucional en el futuro mediante integración controlada, trazada y preferiblemente por API.



\---



\### 3.3. Pilar 3 — Coforma Institucional



\*\*Dominio:\*\* `https://institucional.coforma.es`  

\*\*Finalidad:\*\* demo/plataforma institucional para fiscalización de Formación Profesional para el Empleo.



Este pilar no gestiona la captación ni la operación diaria de academias. Su función es representar la lectura institucional:



Resolución concedida → Entidad beneficiaria → Oferta concedida → Subexpediente → Ejecución → Documentación → Justificación → Actuación → Decisión → Auditoría



\*\*Ámbitos principales:\*\*



\- dashboard ejecutivo institucional;

\- entidades beneficiarias;

\- oferta formativa concedida;

\- subexpedientes;

\- recepción documental;

\- justificación económica;

\- decisiones;

\- actuaciones administrativas;

\- alertas;

\- trazabilidad técnica;

\- auditoría/intervención;

\- conexiones futuras/API.



\---



\## 4. Separación entre los tres pilares



Aunque los tres pilares forman parte de Coforma, deben mantenerse separados.



\### No deben mezclarse directamente:



\- datos comerciales de la web;

\- datos operativos del CRM;

\- datos institucionales de fiscalización;

\- usuarios de academias;

\- usuarios institucionales;

\- reglas de captación;

\- reglas de fiscalización;

\- dashboards operativos de academia;

\- dashboards institucionales.



\### La conexión futura debe hacerse mediante integración controlada



La relación lógica futura debe ser:



CRM operativo  

→ API / capa de integración  

→ Coforma Institucional  

→ recepción, validación, fiscalización y trazabilidad



Esto permite que una academia trabaje en su CRM y que la Administración reciba información fiscalizable sin mezclar bases de datos de forma insegura o confusa.



\---



\## 5. Estado actual del pilar institucional



Coforma Institucional nació como una demo basada en datos de resolución oficial FPED 2025 y fue creciendo mediante simulación controlada, ampliación de volumen, saneamiento de datos y regularizaciones trazadas.



Actualmente existe una base funcional, pero se reconoce una preocupación estratégica:



La demo no debe depender conceptualmente de una “foto madre” como fuente permanente de verdad.



La foto madre actual debe entenderse como:



\- base saneada de referencia;

\- punto de validación;

\- resultado de regularizaciones;

\- fotografía coherente para comprobar que las pantallas leen correctamente.



Pero el objetivo futuro es que la coherencia proceda de:



\- tablas fuente;

\- reglas backend;

\- estados administrativos;

\- vistas de detalle;

\- resúmenes ejecutivos trazados;

\- auditoría de cambios.



\---



\## 6. Principio de evolución institucional



La dirección correcta no es crear otro proyecto ni rehacer todo desde cero.



La dirección correcta es:



Mantener la app institucional actual, pero reforzar su arquitectura de datos para que la información fluya de forma natural desde el backend.



El sistema institucional debe funcionar así:



1\. La resolución oficial define la concesión.

2\. Las entidades beneficiarias se registran y validan.

3\. La oferta concedida genera subexpedientes.

4\. Los subexpedientes concentran estado administrativo, ejecución, documentación y justificación.

5\. La documentación se registra en detalle.

6\. Las vistas operativas permiten trabajar con filtros, fases y trazabilidad.

7\. Los resúmenes ejecutivos leen datos consolidados, no recalculan millones de documentos en vivo.

8\. El dashboard muestra lectura institucional rápida, defendible y trazada.



\---



\## 7. Regla crítica para dashboards institucionales



Un dashboard institucional no debe recalcular miles, cientos de miles o millones de documentos en cada carga.



Debe leer resúmenes ejecutivos persistidos, calculados desde fuentes reales, con trazabilidad.



Regla:



\- Dashboard = lectura ejecutiva agregada.

\- Listados = consultas filtradas y paginadas.

\- Ficha = detalle del expediente/subexpediente.

\- Auditoría = trazabilidad bajo demanda.

\- Backend = fuente de verdad.

\- Frontend = lectura, no invención de datos.



\---



\## 8. Riesgo detectado: dependencia de vistas pesadas



El error reciente de producción en `institucional.coforma.es/dashboard` mostró que el dashboard dependía de una vista documental pesada:



`v\_recepcion\_documentacion\_resumen`



Esta vista calcula sobre:



`v\_recepcion\_documentacion\_panel`



Y esta vista panel cruza:



\- `recepcion\_documentacion`

\- `oferta\_concedida`

\- `subexpedientes\_accion`

\- `cat\_documentos\_normativos`

\- `convocatoria\_entidades`

\- `convocatorias`

\- `entidades\_beneficiarias`



Conclusión:



La vista panel es correcta para una mesa documental o detalle fiscalizable, pero no debe ser la fuente directa de carga inicial del dashboard ejecutivo si el volumen escala.



\---



\## 9. Decisión arquitectónica pendiente



Antes de crear nuevas tablas, funciones o cambios de frontend, se debe definir el mapa de verdad institucional.



Pendiente inmediato:



Crear el documento específico:



`docs/MAPA\_VERDAD\_INSTITUCIONAL.md`



Ese documento debe fijar:



\- tablas fuente;

\- tablas canónicas;

\- tablas operativas;

\- vistas de detalle;

\- vistas/resúmenes ejecutivos;

\- pantallas y fuentes de datos;

\- reglas semánticas;

\- qué sigue siendo simulación controlada;

\- qué procede de resolución oficial;

\- qué no debe alimentar directamente un dashboard.



\---



\## 10. Criterios de trabajo



A partir de este punto, cualquier cambio sensible debe seguir estas reglas:



1\. Una cosa cada vez.

2\. Una consulta SQL por turno.

3\. Un comando PowerShell por turno cuando haya despliegue.

4\. No tocar backend sin saber qué regla se está cambiando.

5\. No cambiar una pantalla sensible con fragmentos sueltos si requiere archivo completo.

6\. No pintar datos manualmente en frontend.

7\. No usar la foto madre como dogma permanente.

8\. Usar la foto madre actual como referencia de validación, no como arquitectura definitiva.

9\. Documentar decisiones relevantes en este mapa o en el mapa específico correspondiente.

10\. Validar local antes de subir.

11\. Build antes de commit.

12\. Git add selectivo.

13\. Commit claro.

14\. Push a main.

15\. Verificar Vercel listo/producción/actualidad.



\---



\## 11. Documentos vivos previstos



Este documento es el mapa general del ecosistema.



Documentos previstos:



\- `docs/COFORMA\_ECOSISTEMA.md`

\- `docs/MAPA\_VERDAD\_INSTITUCIONAL.md`

\- futuro `MAPA\_VERDAD\_CRM\_FPE.md`

\- futuro `MAPA\_WEB\_COFORMA.md`



\---



\## 12. Estado al crear este documento



A fecha 14/05/2026:



\- `https://coforma.es` funciona como web pública.

\- `https://app.coforma.es` funciona como CRM operativo.

\- `https://institucional.coforma.es` funciona como demo institucional.

\- El dashboard institucional fue estabilizado para que no caiga si el resumen documental tarda o falla.

\- Se detectó que esa estabilización es un airbag, no la solución arquitectónica definitiva.

\- El siguiente bloque correcto es documentar el mapa de verdad institucional antes de tocar más backend o frontend sensible.



\---



\## 13. Principio final



Coforma no debe depender de memoria de chat ni de recomposiciones improvisadas.



El ecosistema debe apoyarse en:



\- backend como fuente de verdad;

\- reglas documentadas;

\- trazabilidad;

\- resúmenes ejecutivos calculados;

\- separación clara entre web, CRM e institucional;

\- documentación viva versionada en GitHub.

