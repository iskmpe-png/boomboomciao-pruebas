// Boom Boom Ciao · configuración de este entorno.
// Este es el único archivo que cambia entre la app real y la de pruebas.
window.BBC_SUPABASE = {
  entorno: 'produccion',            // 'produccion' o 'pruebas'
  url: 'https://qgjsqwkkrgtrfpxschmn.supabase.co',
  key: 'sb_publishable_VYGjBgN7J3fJVMSq1Mp1ZA_93REskD6',
  // Datos para el aviso legal. Rellénalos con los de la empresa.
  legal: {
    responsable: '',                // razón social, por ejemplo: Restaurantes Ejemplo S.L.
    cif: '',
    direccion: '',
    email: '',                      // correo de contacto para privacidad
    region: 'la Unión Europea'      // dónde está el proyecto de Supabase
  }
};
