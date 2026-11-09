/* =========================================================
   NUBE — Dónde se guardan las familias compartidas
   Proyecto de Supabase «NutriPlan». La app llama directamente a
   sus funciones (crear_sala, obtener_sala, version_sala y
   guardar_sala); la tabla no se puede leer sin el código de la
   familia. La clave es la pública: está hecha para ir en la web.

   Si se borra este archivo (o se deja url vacía), la app vuelve
   a usar server.py en local, o los enlaces si no hay servidor.
   ========================================================= */

const NUBE = {
  url: 'https://dvevyqyxadulbnsznaux.supabase.co',
  clave: 'sb_publishable_l5atiaZJ2nwsOTS9M4leOA_0gSl59Gh'
};
