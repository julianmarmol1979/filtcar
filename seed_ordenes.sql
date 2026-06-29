-- ══════════════════════════════════════════════════════════════
--  FILTCAR – Seed de Vehículos + Órdenes de trabajo (demo)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Requiere que seed.sql ya se haya ejecutado (usa los Clientes existentes)
-- ══════════════════════════════════════════════════════════════

-- Tabla temporal con el checklist pre-armado, igual al que usa el backend
-- (OrdenesController.ChecklistTemplate) — se reutiliza en cada orden de abajo.
DROP TABLE IF EXISTS checklist_template;
CREATE TEMP TABLE checklist_template (posicion int, descripcion text);
INSERT INTO checklist_template (posicion, descripcion) VALUES
  (0,  'Nivel de aceite de motor'),
  (1,  'Nivel de líquido refrigerante'),
  (2,  'Nivel de líquido de frenos'),
  (3,  'Estado de frenos'),
  (4,  'Estado de neumáticos'),
  (5,  'Luces (delanteras, traseras, freno)'),
  (6,  'Batería'),
  (7,  'Correas y manguitos'),
  (8,  'Filtro de aire'),
  (9,  'Escobillas / limpiaparabrisas'),
  (10, 'Suspensión / amortiguadores'),
  (11, 'Sistema de escape'),
  (12, 'Carrocería (golpes o rayones visibles)');

-- ──────────────────────────────────────────────────────────────
-- O1: Martínez – Ford Fiesta 2015 – Completada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Martínez' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AB123CD','Ford','Fiesta','2015','Gris',85000,true,NOW()-INTERVAL '8 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '8 days', 'Completada',
                 'Cambio de aceite y filtros + revisión de frenos', 85000,
                 'Pastilla delantera derecha con desgaste, recomendamos cambio en el próximo service',
                 NOW()-INTERVAL '8 days', NOW()-INTERVAL '8 days'+INTERVAL '2 hours'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,true,true,false,true,true,true,true,true,true,true,true,true]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O2: García – Chevrolet Onix 2019 – En proceso
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='García' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AC456EF','Chevrolet','Onix','2019','Blanco',42000,true,NOW()-INTERVAL '2 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '2 days', 'EnProceso',
                 'Ruido en suspensión delantera', 42000,
                 'Amortiguador izquierdo vencido, esperando aprobación del cliente para el presupuesto',
                 NOW()-INTERVAL '2 days', NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,true,true,true,true,true,true,true,null,null,false,null,null]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O3: López – Volkswagen Gol Trend 2017 – Pendiente
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='López' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AD789GH','Volkswagen','Gol Trend','2017','Azul',67000,true,NOW()-INTERVAL '1 day' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '1 day', 'Pendiente',
                 'Service de los 70.000km', 67000, NULL,
                 NOW()-INTERVAL '1 day', NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, NULL::boolean
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O4: Rodríguez – Renault Sandero 2018 – Completada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Rodríguez' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AE012IJ','Renault','Sandero','2018','Rojo',51000,true,NOW()-INTERVAL '6 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '6 days', 'Completada',
                 'Cambio de pastillas de freno delanteras', 51000,
                 'Discos en buen estado, no requieren cambio',
                 NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'+INTERVAL '1 hour'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, true
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O5: Fernández – Peugeot 208 2020 – Completada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Fernández' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AF345KL','Peugeot','208','2020','Negro',28000,true,NOW()-INTERVAL '4 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '4 days', 'Completada',
                 'Revisión general antes de viaje a la costa', 28000,
                 'Todo en orden, se recomienda revisar neumáticos en 5.000km más',
                 NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'+INTERVAL '1 hour'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,true,true,true,false,true,true,true,true,true,true,true,true]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O6: González – Toyota Etios 2016 – En proceso
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='González' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AG678MN','Toyota','Etios','2016','Blanco',95000,true,NOW()-INTERVAL '1 day' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '1 day', 'EnProceso',
                 'Pérdida de líquido refrigerante', 95000,
                 'Pérdida detectada por manguera inferior, se cotiza el repuesto',
                 NOW()-INTERVAL '1 day', NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,false,true,null,null,null,null,null,null,null,null,null,null]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O7: Pérez – Fiat Cronos 2021 – Pendiente
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Pérez' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AH901OP','Fiat','Cronos','2021','Gris',35000,true,NOW() FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW(), 'Pendiente',
                 'Cambio de correa de distribución (preventivo 40.000km)', 35000, NULL,
                 NOW(), NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, NULL::boolean
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O8: Jiménez – Citroën C3 2014 – Completada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Jiménez' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AI234QR','Citroën','C3','2014','Bordo',110000,true,NOW()-INTERVAL '9 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '9 days', 'Completada',
                 'Service 100.000km + alineación y balanceo', 110000,
                 'Se realizó alineación, balanceo y cambio de líquido de frenos',
                 NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'+INTERVAL '3 hours'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, true
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O9: Soto – Honda Fit 2013 – Completada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Soto' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AJ567ST','Honda','Fit','2013','Plateado',130000,true,NOW()-INTERVAL '3 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '3 days', 'Completada',
                 'No arranca en frío, chequeo de batería y arranque', 130000,
                 'Batería con baja capacidad, se reemplazó por una nueva',
                 NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days'+INTERVAL '1 hour'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,true,true,true,true,true,false,true,true,true,true,true,true]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O10: Torres – Nissan Versa 2019 – En proceso
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Torres' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AK890UV','Nissan','Versa','2019','Blanco',48000,true,NOW() FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW(), 'EnProceso',
                 'Cambio de amortiguadores traseros', 48000,
                 'Amortiguadores en camino, se termina la próxima semana',
                 NOW(), NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion,
       (ARRAY[true,true,true,true,true,null,null,null,null,null,null,null,null]::boolean[])[t.posicion+1]
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O11: Reyes – Chevrolet Prisma 2017 – Pendiente
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Reyes' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AL123WX','Chevrolet','Prisma','2017','Negro',72000,true,NOW() FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW(), 'Pendiente',
                 'Ruido en el escape, posible falla en soporte', 72000, NULL,
                 NOW(), NULL
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, NULL::boolean
FROM orden CROSS JOIN checklist_template t;

-- ──────────────────────────────────────────────────────────────
-- O12: Castro – Ford Ka 2012 – Cancelada
-- ──────────────────────────────────────────────────────────────
WITH cliente AS (SELECT "Id" FROM "Clientes" WHERE "Apellido"='Castro' LIMIT 1),
auto AS (INSERT INTO "Autos" ("ClienteId","Patente","Marca","Modelo","Anio","Color","Kilometraje","Activo","CreadoEn")
         SELECT "Id",'AM456YZ','Ford','Ka','2012','Rojo',145000,true,NOW()-INTERVAL '5 days' FROM cliente RETURNING "Id","ClienteId"),
orden AS (INSERT INTO "OrdenesTrabajo" ("ClienteId","AutoId","EmpleadoId","Fecha","Estado","Motivo","KilometrajeIngreso","Observaciones","CreadaEn","FinalizadaEn")
          SELECT auto."ClienteId", auto."Id", 1, NOW()-INTERVAL '5 days', 'Cancelada',
                 'Service completo + cambio de filtro de habitáculo', 145000,
                 'Cliente decidió postergar el service',
                 NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'+INTERVAL '30 minutes'
          FROM auto RETURNING "Id")
INSERT INTO "OrdenChecklistItems" ("OrdenTrabajoId","Descripcion","Posicion","Respuesta")
SELECT orden."Id", t.descripcion, t.posicion, NULL::boolean
FROM orden CROSS JOIN checklist_template t;

DROP TABLE IF EXISTS checklist_template;
