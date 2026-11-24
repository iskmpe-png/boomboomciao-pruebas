// Boom Boom Ciao · configuración del ENTORNO DE PRUEBAS (ya rellena).
// Súbela al repositorio de PRUEBAS con el nombre config.js, sustituyendo a la que haya.
window.BBC_SUPABASE = {
  entorno: 'pruebas',               // muestra la franja «ENTORNO DE PRUEBAS»
  url: 'https://gzyyyldmoruttjuulqjf.supabase.co',
  key: 'sb_publishable_a76usm4JPI2oz4zbpwBPPA_ilph0cGt',
  // Datos de la empresa: salen en Privacidad, Términos y Aviso legal (también antes de entrar).
  // Mientras estén vacíos, esos textos los marcan en amarillo como pendientes.
  legal: {
    responsable: '',                // razón social exacta, por ejemplo: Restaurantes Ejemplo S.L.
    cif: '',                        // NIF/CIF de la empresa
    direccion: '',                  // domicilio social completo
    email: '',                      // correo para privacidad y reclamaciones (por ejemplo privacidad@…)
    telefono: '',                   // opcional
    registro: '',                   // opcional: «Registro Mercantil de Madrid, tomo…, folio…, hoja…»
    region: 'la Unión Europea (Irlanda)' // dónde está el proyecto de Supabase (eu-west-1 = Irlanda)
  },
  // Captcha contra robots al crear cuenta (Cloudflare Turnstile, gratis). Déjalo vacío para no usarlo.
  // Si lo pones, guarda también el secreto TURNSTILE_SECRET en la función «cuentas» de Supabase.
  turnstile: ''
};
