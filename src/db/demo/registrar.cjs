// Las filas se registran en la misma transacción que crea los datos de ejemplo.
const tablaRegistro = 'registros_demo';

function passwordDemo() {
  const password = process.env.DEMO_PASSWORD ?? process.env.HU5_DEMO_PASSWORD ??
    process.env.HU3_DEMO_PASSWORD ?? process.env.HU4_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Define DEMO_PASSWORD en .env con al menos 12 caracteres para cargar los datos de ejemplo.');
  }
  return password;
}

async function leerRegistro(query, seeder, transaction) {
  const [[registro]] = await query.sequelize.query(
    'SELECT filas FROM registros_demo WHERE seeder = :seeder',
    { replacements: { seeder }, transaction },
  );
  return registro;
}

async function cargarDemo(query, seeder, cargar) {
  return query.sequelize.transaction(async transaction => {
    await query.sequelize.query("SELECT pg_advisory_xact_lock(hashtext('congreso_registros_demo'))", { transaction });
    if (await leerRegistro(query, seeder, transaction)) return;
    const filas = [];
    const opciones = { transaction, validate: true, returning: true };

    function recordar(modelo, fila) {
      const clave = Object.fromEntries(modelo.primaryKeyAttributes.map(atributo => [
        modelo.getAttributes()[atributo].field,
        fila.get(atributo),
      ]));
      filas.push({ tabla: modelo.tableName, clave });
      return fila;
    }

    const crear = async (modelo, datos) => recordar(modelo, await modelo.create(datos, opciones));
    const crearVarios = async (modelo, datos) => {
      const creadas = await modelo.bulkCreate(datos, opciones);
      return creadas.map(fila => recordar(modelo, fila));
    };
    const buscarOCrear = async (modelo, where, defaults = {}) => {
      const [fila, creada] = await modelo.findOrCreate({ where, defaults, transaction });
      if (creada) recordar(modelo, fila);
      return [fila, creada];
    };

    await cargar({ transaction, crear, crearVarios, buscarOCrear });
    await query.bulkInsert(tablaRegistro, [{ seeder, filas: JSON.stringify(filas) }], { transaction });
  });
}

async function revertirDemo(query, seeder) {
  return query.sequelize.transaction(async transaction => {
    await query.sequelize.query("SELECT pg_advisory_xact_lock(hashtext('congreso_registros_demo'))", { transaction });
    const registro = await leerRegistro(query, seeder, transaction);
    if (!registro) return;

    const [referencias] = await query.sequelize.query(
      `SELECT tc.table_schema AS esquema, tc.table_name AS tabla, kcu.column_name AS columna,
              ccu.table_name AS destino, ccu.column_name AS campo_destino
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           USING (constraint_catalog, constraint_schema, constraint_name)
         JOIN information_schema.constraint_column_usage ccu
           USING (constraint_catalog, constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = current_schema()`,
      { transaction },
    );
    const citar = nombre => query.quoteIdentifier(nombre);
    for (const { tabla, clave } of registro.filas.reverse()) {
      const condiciones = Object.keys(clave).map(campo => `${citar(campo)} = :${campo}`);
      const [[existente]] = await query.sequelize.query(
        `SELECT 1 FROM ${citar(tabla)} WHERE ${condiciones.join(' AND ')} FOR UPDATE`,
        { replacements: clave, transaction },
      );
      if (!existente) continue;
      for (const ref of referencias) {
        if (ref.destino !== tabla || !Object.hasOwn(clave, ref.campo_destino)) continue;
        const [[dependiente]] = await query.sequelize.query(
          `SELECT 1 FROM ${citar(ref.esquema)}.${citar(ref.tabla)}
             WHERE ${citar(ref.columna)} = :valor LIMIT 1`,
          { replacements: { valor: clave[ref.campo_destino] }, transaction },
        );
        if (dependiente) {
          throw new Error(`La demo ${seeder} conserva sus datos porque ${ref.tabla} aún depende de ${tabla}.`);
        }
      }
      await query.bulkDelete(tabla, clave, { transaction });
    }
    await query.bulkDelete(tablaRegistro, { seeder }, { transaction });
  });
}

module.exports = { cargarDemo, passwordDemo, revertirDemo };
