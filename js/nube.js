/* =========================================================
   NUBE — Dónde se guardan las familias compartidas
   Firebase Realtime Database del proyecto «NutriPlan»
   (nutriplan-26ca1), en Bélgica (europe-west1), plan gratuito.

   La app habla directamente con la base de datos: no hace falta
   clave porque las reglas (firebase-reglas.json, publicadas en la
   consola de Firebase) solo dejan leer o escribir una familia si
   se conoce su código, nunca listarlas, y no dejan pisar cambios.

   Si se borra este archivo (o se deja url vacía), la app vuelve
   a usar server.py en local, o los enlaces si no hay servidor.
   ========================================================= */

const NUBE = {
  tipo: 'firebase',
  url: 'https://nutriplan-26ca1-default-rtdb.europe-west1.firebasedatabase.app'
};
