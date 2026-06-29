-- ══════════════════════════════════════════════════════════════
--  FILTCAR – Seed de Turnos (demo)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Requiere que seed.sql ya se haya ejecutado (usa los Clientes existentes)
--  Usa fechas relativas a NOW() para que siempre caigan en la semana
--  actual de la agenda (vista de Turnos).
-- ══════════════════════════════════════════════════════════════

-- 1. Turnos asociados a clientes existentes
INSERT INTO "Turnos" ("Fecha","ClienteNombre","ClienteId","Telefono","Vehiculo","Servicio","Observacion","EmpleadoId","Estado","CreadaEn")
SELECT v.fecha, NULL, c."Id", c."Telefono", v.vehiculo, v.servicio, v.observacion, v.empleadoid, v.estado, NOW()
FROM (VALUES
  (NOW()-INTERVAL '2 days'+TIME '09:00', 'Martínez',  'Ford Fiesta AB123CD',          'Cambio de aceite',         NULL::text,                                1,    'Completado'),
  (NOW()-INTERVAL '2 days'+TIME '11:00', 'García',    'Chevrolet Onix AC456EF',        'Filtro de aire',           NULL::text,                                1,    'Completado'),
  (NOW()-INTERVAL '1 day'+TIME '15:30',  'López',     'Volkswagen Gol Trend AD789GH',  'Revisión general',         'Cliente reprogramó para otra semana',    NULL::int, 'Cancelado'),
  (NOW()+TIME '09:30',                   'Rodríguez', 'Renault Sandero AE012IJ',       'Filtro de aceite',         NULL::text,                                1,    'Confirmado'),
  (NOW()+TIME '11:00',                   'Fernández', 'Peugeot 208 AF345KL',           'Lubricación de chasis',    NULL::text,                                NULL::int, 'Pendiente'),
  (NOW()+INTERVAL '1 day'+TIME '10:00',  'González',  'Toyota Etios AG678MN',          'Filtro de combustible',    NULL::text,                                1,    'Confirmado'),
  (NOW()+INTERVAL '1 day'+TIME '14:00',  'Pérez',     'Fiat Cronos AH901OP',           'Cambio de aceite de caja', NULL::text,                                NULL::int, 'Pendiente'),
  (NOW()+INTERVAL '2 days'+TIME '09:00', 'Jiménez',   'Citroën C3 AI234QR',            'Filtro de habitáculo',     NULL::text,                                NULL::int, 'Pendiente'),
  (NOW()+INTERVAL '2 days'+TIME '11:30', 'Soto',      'Honda Fit AJ567ST',             'Cambio de aceite',         NULL::text,                                1,    'Confirmado'),
  (NOW()+INTERVAL '3 days'+TIME '10:00', 'Torres',    'Nissan Versa AK890UV',          'Cambio de aceite',         NULL::text,                                NULL::int, 'Pendiente'),
  (NOW()+INTERVAL '3 days'+TIME '13:00', 'Reyes',     'Chevrolet Prisma AL123WX',      'Filtro de aire',           NULL::text,                                NULL::int, 'Pendiente')
) AS v(fecha, apellido, vehiculo, servicio, observacion, empleadoid, estado)
JOIN "Clientes" c ON c."Apellido" = v.apellido;

-- 2. Turnos de clientes ocasionales (sin alta previa — texto libre)
INSERT INTO "Turnos" ("Fecha","ClienteNombre","ClienteId","Telefono","Vehiculo","Servicio","Observacion","EmpleadoId","Estado","CreadaEn") VALUES
(NOW()-INTERVAL '1 day'+TIME '10:00', 'Roberto Sánchez', NULL, '351-4998877', 'Honda Civic',   'Cambio de aceite',  NULL, 1,    'Completado', NOW()),
(NOW()+TIME '16:00',                  'Marcela Funes',   NULL, '351-4887766', 'Toyota Corolla','Cambio de aceite',  'Pidió turno por WhatsApp', NULL, 'Pendiente',  NOW()),
(NOW()+INTERVAL '2 days'+TIME '17:00','Diego Aranda',    NULL, '351-4776655', 'Fiat Palio',    'Revisión general',  NULL, NULL, 'Pendiente',  NOW());
