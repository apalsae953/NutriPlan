/* =========================================================
   DATOS INICIALES — PLANTILLAS DE EJEMPLO
   Contiene la dieta semanal de lunes a viernes con macros,
   ingredientes y preparaciones, la lista de la compra y el
   catálogo de comidas preparadas para precargar si el usuario lo desea.
   ========================================================= */

const DATOS_INICIALES = {

  /* -----------------------------------------------------------
     CATÁLOGO DE COMIDAS / PLATOS DE EJEMPLO
     Cada plato contiene sus ingredientes clasificados (tipo),
     pesos (opcionales), preparación detallada y macros.
  ----------------------------------------------------------- */
  comidas: [
    {
      id: 'comida_ej_1',
      nombre: 'Lentejas salteadas con pollo',
      toma: 'Almuerzo',
      preparacion: 'Dora el pollo con la cebolla y zanahoria picadas, añade pimentón y saltea con las lentejas lavadas 3 min.',
      kcal: 455,
      proteina: '48 g',
      carbos: '42 g',
      grasa: '9 g',
      ingredientesDetallados: [
        { nombre: 'Lentejas de bote (medio bote)', peso: '200 g', tipo: 'Conservas' },
        { nombre: 'Pechuga de pollo en dados', peso: '150 g', tipo: 'Carne fresca' },
        { nombre: 'Cebolla', peso: '50 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Zanahoria', peso: '50 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Ajo en polvo y pimentón', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_2',
      nombre: 'Tortilla de atún y ensalada fresca',
      toma: 'Cena',
      preparacion: 'Haz la tortilla con los 2 huevos y el atún escurrido. Acompaña con el tomate picado y la zanahoria aliñada con limón y orégano.',
      kcal: 355,
      proteina: '32 g',
      carbos: '10 g',
      grasa: '19 g',
      ingredientesDetallados: [
        { nombre: 'Huevos talla M/L', peso: '2 uds', tipo: 'Huevos / Lácteos' },
        { nombre: 'Atún al natural (media lata escurrida)', peso: '30 g', tipo: 'Conservas' },
        { nombre: 'Tomate de ensalada', peso: '150 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Zanahoria rallada', peso: '50 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Zumo de limón y orégano', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_3',
      nombre: 'Macarrones boloñesa en déficit',
      toma: 'Almuerzo',
      preparacion: 'Cuece la pasta. Sofríe la carne con el calabacín picado fino (da mucho volumen sin calorías) y añade el tomate triturado y orégano.',
      kcal: 485,
      proteina: '43 g',
      carbos: '52 g',
      grasa: '11 g',
      ingredientesDetallados: [
        { nombre: 'Macarrones integrales', peso: '65 g (crudo)', tipo: 'Legumbres / Cereales' },
        { nombre: 'Carne picada de pollo/pavo', peso: '150 g', tipo: 'Carne fresca' },
        { nombre: 'Calabacín (picado muy fino)', peso: '150 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Tomate natural triturado', peso: '150 g', tipo: 'Conservas' },
        { nombre: 'Aceite de oliva', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Ajo en polvo y orégano', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_4',
      nombre: 'Lomo al ajillo con brócoli',
      toma: 'Cena',
      preparacion: 'Cocina el brócoli 4 min al microondas o vapor sin descongelar. Marca el lomo a la plancha a fuego vivo y saltea todo con ajo y perejil.',
      kcal: 335,
      proteina: '37 g',
      carbos: '8 g',
      grasa: '16 g',
      ingredientesDetallados: [
        { nombre: 'Cinta de lomo de cerdo fresco', peso: '160 g', tipo: 'Carne fresca' },
        { nombre: 'Brócoli ultracongelado', peso: '200 g', tipo: 'Congelados' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Ajo en polvo y perejil', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_5',
      nombre: 'Pollo con patata y verdura a la plancha',
      toma: 'Almuerzo',
      preparacion: 'Pincha la patata con un tenedor y cocínala 6 min al microondas a máxima potencia con piel. Haz los filetes de pollo y la verdura a la plancha con sal y pimienta.',
      kcal: 430,
      proteina: '42 g',
      carbos: '36 g',
      grasa: '11 g',
      ingredientesDetallados: [
        { nombre: 'Pechuga de pollo fileteada', peso: '160 g', tipo: 'Carne fresca' },
        { nombre: 'Patata mediana con piel', peso: '150 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Calabacín y cebolla', peso: '200 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Sal y pimienta negra', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_6',
      nombre: 'Revuelto de espinacas y atún',
      toma: 'Cena',
      preparacion: 'Saltea las espinacas en la sartén hasta que pierdan el agua, añade el atún escurrido y cuaja los 2 huevos removiendo a fuego medio.',
      kcal: 350,
      proteina: '37 g',
      carbos: '5 g',
      grasa: '19 g',
      ingredientesDetallados: [
        { nombre: 'Huevos talla M/L', peso: '2 uds', tipo: 'Huevos / Lácteos' },
        { nombre: 'Atún al natural escurrido', peso: '90 g', tipo: 'Conservas' },
        { nombre: 'Espinacas ultracongeladas', peso: '150 g', tipo: 'Congelados' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Ajo en polvo', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_7',
      nombre: 'Arroz a la cubana fit',
      toma: 'Almuerzo',
      preparacion: 'Cuece el arroz. Pasa las salchichas y el huevo a la plancha con unas gotas de aceite. Calienta el tomate con orégano y sirve junto.',
      kcal: 540,
      proteina: '39 g',
      carbos: '54 g',
      grasa: '17 g',
      ingredientesDetallados: [
        { nombre: 'Arroz en grano', peso: '60 g (crudo)', tipo: 'Legumbres / Cereales' },
        { nombre: 'Salchichas frescas de pollo/pavo', peso: '150 g (3 uds)', tipo: 'Carne fresca' },
        { nombre: 'Huevo talla M/L', peso: '1 ud', tipo: 'Huevos / Lácteos' },
        { nombre: 'Tomate natural triturado', peso: '150 g', tipo: 'Conservas' },
        { nombre: 'Aceite de oliva y orégano', peso: '5 ml', tipo: 'Aceites y grasas' }
      ]
    },
    {
      id: 'comida_ej_8',
      nombre: 'Merluza al limón con verde',
      toma: 'Cena',
      preparacion: 'Cocina los filetes de merluza a la plancha 3 min por lado con limón y perejil picado. Acompaña con el brócoli o espinacas al vapor.',
      kcal: 270,
      proteina: '36 g',
      carbos: '8 g',
      grasa: '9 g',
      ingredientesDetallados: [
        { nombre: 'Filetes de merluza sin piel', peso: '200 g', tipo: 'Pescado / Marisco fresco' },
        { nombre: 'Brócoli o espinacas congeladas', peso: '200 g', tipo: 'Congelados' },
        { nombre: 'Zumo de limón natural', peso: '', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva y perejil', peso: '5 ml', tipo: 'Aceites y grasas' }
      ]
    },
    {
      id: 'comida_ej_9',
      nombre: 'Salteado de legumbres y lomo',
      toma: 'Almuerzo',
      preparacion: 'Saltea las tiras de lomo con la cebolla a fuego fuerte. Añade una cucharadita de pimentón dulce y las legumbres escurridas 3 min.',
      kcal: 450,
      proteina: '44 g',
      carbos: '38 g',
      grasa: '12 g',
      ingredientesDetallados: [
        { nombre: 'Lentejas o garbanzos cocidos', peso: '200 g', tipo: 'Conservas' },
        { nombre: 'Cinta de lomo de cerdo en tiras', peso: '150 g', tipo: 'Carne fresca' },
        { nombre: 'Cebolla picada', peso: '50 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Ajo y pimentón dulce de la Vera', peso: '', tipo: 'Especias y condimentos' }
      ]
    },
    {
      id: 'comida_ej_10',
      nombre: 'Hamburguesa casera con huevo y tomate',
      toma: 'Cena',
      preparacion: 'Salpimienta la carne picada, dale forma de hamburguesa y hazla a la plancha con el huevo encima. Sirve con tomate en rodajas y orégano.',
      kcal: 380,
      proteina: '38 g',
      carbos: '7 g',
      grasa: '21 g',
      ingredientesDetallados: [
        { nombre: 'Carne picada de pollo/pavo', peso: '150 g', tipo: 'Carne fresca' },
        { nombre: 'Huevo talla M/L', peso: '1 ud', tipo: 'Huevos / Lácteos' },
        { nombre: 'Tomate de ensalada en rodajas', peso: '150 g', tipo: 'Verdura / Hortaliza fresca' },
        { nombre: 'Aceite de oliva virgen extra', peso: '5 ml', tipo: 'Aceites y grasas' },
        { nombre: 'Sal, pimienta y orégano', peso: '', tipo: 'Especias y condimentos' }
      ]
    }
  ],

  /* -----------------------------------------------------------
     DIETAS DE EJEMPLO
  ----------------------------------------------------------- */
  dietas: [
    {
      id: 'dieta_1',
      nombre: 'Dieta de déficit L-V (Ejemplo)',
      descripcion: 'Dieta semanal de lunes a viernes orientada al déficit calórico. Cada comida se prepara en menos de 15 minutos.',
      fechaCreacion: '2025-05-01',
      comidas: [
        {
          id: 'c1',
          dia: 'Lunes',
          toma: 'Almuerzo',
          plato: 'Lentejas salteadas con pollo',
          ingredientes: [
            '200 g lentejas de bote (medio bote)',
            '150 g pechuga de pollo en dados',
            '50 g cebolla + 50 g zanahoria',
            '5 ml aceite, ajo en polvo y pimentón'
          ],
          preparacion: 'Dora el pollo con la cebolla y zanahoria picadas, añade pimentón y saltea con las lentejas lavadas 3 min.',
          kcal: 455,
          proteina: '48 g',
          carbos: '42 g',
          grasa: '9 g'
        },
        {
          id: 'c2',
          dia: 'Lunes',
          toma: 'Cena',
          plato: 'Tortilla de atún y ensalada fresca',
          ingredientes: [
            '2 huevos talla M/L',
            '30 g atún al natural (media lata escurrida)',
            '150 g tomate + 50 g zanahoria rallada',
            '5 ml aceite, limón y orégano'
          ],
          preparacion: 'Haz la tortilla con los 2 huevos y el atún. Acompaña con el tomate picado y la zanahoria aliñada.',
          kcal: 355,
          proteina: '32 g',
          carbos: '10 g',
          grasa: '19 g'
        },
        {
          id: 'c3',
          dia: 'Martes',
          toma: 'Almuerzo',
          plato: 'Macarrones boloñesa en déficit',
          ingredientes: [
            '65 g macarrones integrales (en crudo)',
            '150 g carne picada de pollo/pavo',
            '150 g calabacín (medio, picado muy fino)',
            '150 g tomate natural triturado',
            '5 ml aceite, ajo en polvo y orégano'
          ],
          preparacion: 'Cuece la pasta. Sofríe la carne con el calabacín picado fino (da volumen sin calorías) y añade el tomate y orégano.',
          kcal: 485,
          proteina: '43 g',
          carbos: '52 g',
          grasa: '11 g'
        },
        {
          id: 'c4',
          dia: 'Martes',
          toma: 'Cena',
          plato: 'Lomo al ajillo con brócoli',
          ingredientes: [
            '160 g cinta de lomo de cerdo fresco',
            '200 g brócoli ultracongelado',
            '5 ml aceite, ajo en polvo y perejil'
          ],
          preparacion: 'Haz el brócoli 4 min al microondas o vapor. Marca el lomo a la plancha a fuego vivo y saltea todo con ajo.',
          kcal: 335,
          proteina: '37 g',
          carbos: '8 g',
          grasa: '16 g'
        },
        {
          id: 'c5',
          dia: 'Miércoles',
          toma: 'Almuerzo',
          plato: 'Pollo con patata y verdura a la plancha',
          ingredientes: [
            '160 g pechuga de pollo fileteada',
            '150 g patata mediana (con piel, lavada)',
            '150 g calabacín (la otra mitad) + 50 g cebolla',
            '5 ml aceite, sal y pimienta'
          ],
          preparacion: 'Pincha la patata con un tenedor y hazla 6 min al microondas a máxima potencia. Haz el pollo y la verdura a la plancha.',
          kcal: 430,
          proteina: '42 g',
          carbos: '36 g',
          grasa: '11 g'
        },
        {
          id: 'c6',
          dia: 'Miércoles',
          toma: 'Cena',
          plato: 'Revuelto de espinacas y atún',
          ingredientes: [
            '2 huevos talla M/L',
            '90 g atún al natural (1 lata y media escurrida)',
            '150 g espinacas ultracongeladas',
            '5 ml aceite y ajo en polvo'
          ],
          preparacion: 'Saltea las espinacas en la sartén hasta que pierdan el agua, añade el atún y cuaja los 2 huevos removiendo.',
          kcal: 350,
          proteina: '37 g',
          carbos: '5 g',
          grasa: '19 g'
        },
        {
          id: 'c7',
          dia: 'Jueves',
          toma: 'Almuerzo',
          plato: 'Arroz a la cubana fit',
          ingredientes: [
            '60 g arroz en crudo',
            '150 g salchichas frescas de pollo/pavo (3 uds)',
            '1 huevo talla M/L',
            '150 g tomate natural triturado',
            '5 ml aceite y orégano'
          ],
          preparacion: 'Cuece el arroz. Haz las salchichas y el huevo a la plancha con gotas de aceite. Calienta el tomate con orégano al microondas.',
          kcal: 540,
          proteina: '39 g',
          carbos: '54 g',
          grasa: '17 g'
        },
        {
          id: 'c8',
          dia: 'Jueves',
          toma: 'Cena',
          plato: 'Merluza al limón con verde',
          ingredientes: [
            '200 g filetes de merluza sin piel',
            '200 g brócoli o espinacas congeladas',
            '5 ml aceite, zumo de limón y perejil'
          ],
          preparacion: 'Cocina la merluza a la plancha 3 min por lado con limón y perejil. Acompaña con la verdura al vapor o salteada.',
          kcal: 270,
          proteina: '36 g',
          carbos: '8 g',
          grasa: '9 g'
        },
        {
          id: 'c9',
          dia: 'Viernes',
          toma: 'Almuerzo',
          plato: 'Salteado de legumbres y lomo',
          ingredientes: [
            '200 g lentejas/garbanzos (la otra mitad del bote)',
            '150 g cinta de lomo de cerdo en tiras',
            '50 g cebolla',
            '5 ml aceite, ajo y pimentón dulce'
          ],
          preparacion: 'Saltea las tiras de lomo con la cebolla a fuego fuerte, añade una cucharadita de pimentón y las legumbres escurridas.',
          kcal: 450,
          proteina: '44 g',
          carbos: '38 g',
          grasa: '12 g'
        },
        {
          id: 'c10',
          dia: 'Viernes',
          toma: 'Cena',
          plato: 'Hamburguesa casera con huevo y tomate',
          ingredientes: [
            '150 g carne picada de pollo/pavo',
            '1 huevo talla M/L',
            '150 g tomate de ensalada',
            '5 ml aceite, sal, pimienta y orégano'
          ],
          preparacion: 'Salpimienta la carne picada, aplástala en forma de hamburguesa y hazla a la plancha con el huevo encima. Sirve con tomate.',
          kcal: 380,
          proteina: '38 g',
          carbos: '7 g',
          grasa: '21 g'
        }
      ]
    }
  ],

  /* -----------------------------------------------------------
     LISTA DE LA COMPRA DE EJEMPLO
  ----------------------------------------------------------- */
  compra: [
    {
      id: 'ing_1',
      nombre: 'Pechuga de pollo',
      cantidad: '310 g / semana',
      categoria: 'Carnes y pescados',
      notas: 'Corta y congela en bolsas de 150 g (lunes) y 160 g (miércoles).',
      comprado: false
    },
    {
      id: 'ing_2',
      nombre: 'Cinta de lomo fresco',
      cantidad: '310 g / semana',
      categoria: 'Carnes y pescados',
      notas: 'Congela en paquetes de 160 g (martes) y 150 g (viernes).',
      comprado: false
    },
    {
      id: 'ing_3',
      nombre: 'Carne picada pollo/pavo',
      cantidad: '300 g / semana',
      categoria: 'Carnes y pescados',
      notas: 'Divide cada bandeja de 500 g en porciones de 150 g y congela.',
      comprado: false
    },
    {
      id: 'ing_4',
      nombre: 'Salchichas frescas pollo/pavo',
      cantidad: '150 g (3 uds) / semana',
      categoria: 'Carnes y pescados',
      notas: 'Congela de 3 en 3 unidades en film transparente.',
      comprado: false
    },
    {
      id: 'ing_5',
      nombre: 'Filetes de merluza congelada',
      cantidad: '200 g / semana',
      categoria: 'Carnes y pescados',
      notas: 'Saca 2 o 3 filetes (200 g) la noche del miércoles a la nevera.',
      comprado: false
    },
    {
      id: 'ing_6',
      nombre: 'Atún claro al natural',
      cantidad: '2 latas (120 g escurridos) / semana',
      categoria: 'Conservas',
      notas: 'Martes noche usas el resto de la lata abierta el lunes + 1 lata entera.',
      comprado: false
    },
    {
      id: 'ing_7',
      nombre: 'Huevos M/L',
      cantidad: '6 huevos / semana',
      categoria: 'Lácteos y huevos',
      notas: '2 lunes, 2 miércoles, 1 jueves y 1 viernes (te sobran 12 al mes para fines de semana/desayunos).',
      comprado: false
    },
    {
      id: 'ing_8',
      nombre: 'Legumbres cocidas (bote 400 g)',
      cantidad: '1 bote (400 g) / semana',
      categoria: 'Conservas',
      notas: 'Mitad el lunes (200 g) y guardas la otra mitad en la nevera en un tupper para el viernes.',
      comprado: false
    },
    {
      id: 'ing_9',
      nombre: 'Tomate natural triturado (bote 400 g)',
      cantidad: '300 g / semana',
      categoria: 'Conservas',
      notas: 'Usas 150 g el martes y 150 g el jueves (puedes echar los 100 g restantes si quieres más salsa).',
      comprado: false
    },
    {
      id: 'ing_10',
      nombre: 'Macarrones integrales',
      cantidad: '65 g en crudo / semana',
      categoria: 'Legumbres y cereales',
      notas: 'Pésalos siempre en crudo en una báscula de cocina antes de hervir.',
      comprado: false
    },
    {
      id: 'ing_11',
      nombre: 'Arroz',
      cantidad: '60 g en crudo / semana',
      categoria: 'Legumbres y cereales',
      notas: 'Pésalo siempre en crudo en una báscula de cocina antes de hervir.',
      comprado: false
    },
    {
      id: 'ing_12',
      nombre: 'Brócoli ultracongelado',
      cantidad: '400 g / semana',
      categoria: 'Congelados',
      notas: 'Se saca directamente de la bolsa al plato o sartén sin descongelar antes.',
      comprado: false
    },
    {
      id: 'ing_13',
      nombre: 'Espinacas ultracongeladas',
      cantidad: '150 g / semana',
      categoria: 'Congelados',
      notas: 'Se sacan directamente de la bolsa a la sartén sin descongelar antes.',
      comprado: false
    },
    {
      id: 'ing_14',
      nombre: 'Calabacín',
      cantidad: '1 calabacín grande / semana',
      categoria: 'Verduras y hortalizas',
      notas: 'Comprar semanalmente para que esté fresco. Mitad para el martes, mitad para el miércoles.',
      comprado: false
    },
    {
      id: 'ing_15',
      nombre: 'Tomate de ensalada',
      cantidad: '2 tomates / semana',
      categoria: 'Verduras y hortalizas',
      notas: 'Comprar semanalmente para que estén frescos.',
      comprado: false
    },
    {
      id: 'ing_16',
      nombre: 'Patata',
      cantidad: '1 patata mediana / semana',
      categoria: 'Verduras y hortalizas',
      notas: 'Para el miércoles al mediodía. Hazla al microondas 6 min con piel.',
      comprado: false
    },
    {
      id: 'ing_17',
      nombre: 'Cebolla',
      cantidad: '1 cebolla / semana',
      categoria: 'Verduras y hortalizas',
      notas: 'Se usa en varias preparaciones a lo largo de la semana.',
      comprado: false
    },
    {
      id: 'ing_18',
      nombre: 'Zanahoria',
      cantidad: '1 zanahoria / semana',
      categoria: 'Verduras y hortalizas',
      notas: 'Se usa rallada o picada el lunes en dos comidas.',
      comprado: false
    },
    {
      id: 'ing_19',
      nombre: 'Aceite de oliva virgen extra',
      cantidad: 'A consumo (5 ml/comida)',
      categoria: 'Condimentos y aceites',
      notas: 'Mide siempre 5 ml (una cucharadita) para controlar las calorías.',
      comprado: false
    },
    {
      id: 'ing_20',
      nombre: 'Especias (ajo en polvo, pimentón, orégano, perejil)',
      cantidad: 'A consumo',
      categoria: 'Condimentos y aceites',
      notas: 'Básicos del armario. Reponer cuando se acaben.',
      comprado: false
    }
  ]
};
