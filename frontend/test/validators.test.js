import { describe, expect, it } from "vitest";
import { validarLogin, validarRegistro } from "../src/utils/validators";

describe("validarLogin", () => {
  it("acepta un correo y una contraseña válidos", () => {
    expect(
      validarLogin({ correo: "jugador@example.com", password: "secreto123" })
    ).toEqual({});
  });

  it("exige correo y contraseña", () => {
    expect(validarLogin({})).toEqual({
      correo: "El correo es obligatorio",
      password: "La contraseña es obligatoria",
    });
  });

  it("rechaza un correo con formato inválido", () => {
    expect(validarLogin({ correo: "no-es-correo", password: "x" })).toEqual({
      correo: "Ingresa un correo electronico valido",
    });
  });

  it("ignora los espacios alrededor del correo", () => {
    expect(validarLogin({ correo: "  a@b.co  ", password: "x" })).toEqual({});
  });
});

describe("validarRegistro", () => {
  const registroValido = {
    nombre: "Ana",
    apellido: "Pérez",
    correo: "ana@example.com",
    password: "secreto123",
    passwordConfirmacion: "secreto123",
  };

  it("acepta un registro completo", () => {
    expect(validarRegistro(registroValido)).toEqual({});
  });

  it("exige nombre, apellido y correo", () => {
    expect(validarRegistro({ password: "secreto123" })).toMatchObject({
      nombre: "El nombre es obligatorio",
      apellido: "El apellido es obligatorio",
      correo: "El correo es obligatorio",
    });
  });

  it("exige una contraseña de al menos 8 caracteres", () => {
    expect(
      validarRegistro({ ...registroValido, password: "corta", passwordConfirmacion: "corta" })
    ).toMatchObject({
      password: "La contraseña debe tener al menos 8 caracteres",
    });
  });

  it("detecta cuando las contraseñas no coinciden", () => {
    expect(
      validarRegistro({ ...registroValido, passwordConfirmacion: "otra-clave" })
    ).toMatchObject({
      passwordConfirmacion: "Las contraseñas no coinciden",
    });
  });

  it("exige confirmar la contraseña si el campo está presente", () => {
    expect(
      validarRegistro({ ...registroValido, passwordConfirmacion: "" })
    ).toMatchObject({
      passwordConfirmacion: "Confirma tu contraseña",
    });
  });
});
