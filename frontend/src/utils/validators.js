export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Validacion del formulario de inicio de sesion
export const validarLogin = ({ correo, password }) => {
  const errores = {};
  if (!correo?.trim()) {
    errores.correo = "El correo es obligatorio";
  } else if (!EMAIL_REGEX.test(correo.trim())) {
    errores.correo = "Ingresa un correo electronico valido";
  }
  if (!password) {
    errores.password = "La contraseña es obligatoria";
  }
  return errores;
};

// Validacion del formulario de registro
export const validarRegistro = ({
  nombre,
  apellido,
  correo,
  password,
  passwordConfirmacion,
}) => {
  const errores = {};
  if (!nombre?.trim()) errores.nombre = "El nombre es obligatorio";
  if (!apellido?.trim()) errores.apellido = "El apellido es obligatorio";

  if (!correo?.trim()) {
    errores.correo = "El correo es obligatorio";
  } else if (!EMAIL_REGEX.test(correo.trim())) {
    errores.correo = "Ingresa un correo electronico valido";
  }

  if (!password) {
    errores.password = "La contraseña es obligatoria";
  } else if (password.length < 8) {
    errores.password = "La contraseña debe tener al menos 8 caracteres";
  }

  if (passwordConfirmacion !== undefined) {
    if (!passwordConfirmacion) {
      errores.passwordConfirmacion = "Confirma tu contraseña";
    } else if (passwordConfirmacion !== password) {
      errores.passwordConfirmacion = "Las contraseñas no coinciden";
    }
  }

  return errores;
};
