// Boom Boom Ciao · configuración de este entorno.
// Este es el único archivo que cambia entre la app real y la de pruebas.
window.BBC_SUPABASE = {
  entorno: 'produccion',            // 'produccion' o 'pruebas'
  url: 'https://supabase.com/dashboard/project/gzyyyldmoruttjuulqjf/settings/api-keys',
  key: 'sb_publishable_a76usm4JPI2oz4zbpwBPPA_ilph0cGt',
  // Datos para el aviso legal. Rellénalos con los de la empresa.
  legal: {
    responsable: 'Kevin Molina Esclavo Part Time',                // razón social, por ejemplo: Restaurantes Ejemplo S.L.
    cif: '',
    direccion: '',
    email: 'iskmpe@gmail.com',                      // correo de contacto para privacidad
    region: 'la Unión Europea'      // dónde está el proyecto de Supabase
  }
};
