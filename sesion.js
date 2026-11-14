/* ---- Nube propia: usuarios con contraseña, restaurantes y sincronización ---- */
const CFG = window.BBC_SUPABASE || null;
let sb = null,
  uidAct,
  yo = null,
  mios = [],
  rid = null,
  esPlat = false,
  miembros = [];
const ROLES = { dueno: 'Dueño', encargado: 'Encargado', cocina: 'Cocina', consulta: 'Solo consulta' },
  ROLNIV = { dueno: 'admin', encargado: 'admin', cocina: 'interact', consulta: 'view' };
const errTxt = (e) => {
  const m = String((e && e.message) || e || '');
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/not confirmed/i.test(m)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a entrar.';
  if (/already (been )?registered/i.test(m)) return 'Ya hay una cuenta con ese correo. Entra con tu contraseña.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.';
  if (/password/i.test(m) && /(least|short|weak)/i.test(m)) return 'La contraseña es demasiado corta o débil.';
  if (/fetch|network|load failed/i.test(m))
    return navigator.onLine === false
      ? 'Sin conexión. Revisa internet y vuelve a intentarlo.'
      : 'No se llega al servidor. Tienes internet, así que revisa la dirección y la clave del archivo config.js, o inténtalo dentro de un minuto.';
  return m || 'No se pudo completar. Inténtalo de nuevo.';
};
const canon = (o) =>
  JSON.stringify(o, (k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v)
          .sort()
          .reduce((a, x) => {
            a[x] = v[x];
            return a;
          }, {})
      : v,
  );
