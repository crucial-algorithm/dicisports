INSERT iNTO sports (id, name, picture, created_at, updated_at)
VALUES  (1, '{"pt": "Atletismo"}', 'running', current_date, current_date),
        (2, '{"pt": "Trail"}', 'trail', current_date, current_date),
        (3, '{"pt": "Ciclismo Estrada"}', 'road', current_date, current_date),
        (4, '{"pt": "Ciclismo BTT"}', 'btt', current_date, current_date),
        (5, '{"pt": "E-bike"}', 'ebike', current_date, current_date),
        (6, '{"pt": "Gravel"}', 'gravel', current_date, current_date),
        (7, '{"pt": "Enduro"}', 'enduro', current_date, current_date);


INSERT iNTO groups_spirit (id,  name, created_at, updated_at)
VALUES  (1, '{"pt": "Convívio"}', current_date, current_date),
        (2, '{"pt": "Desportivo"}', current_date, current_date),
        (3, '{"pt": "Treino"}', current_date, current_date),
        (4, '{"pt": "Amizade"}', current_date, current_date),
        (5, '{"pt": "Turismo"}', current_date, current_date);


INSERT iNTO groups_type (id, name, created_at, updated_at)
VALUES  (1, '{"pt": "Informal"}', current_date, current_date),
        (2, '{"pt": "Clube"}', current_date, current_date),
        (3, '{"pt": "Loja"}', current_date, current_date);
