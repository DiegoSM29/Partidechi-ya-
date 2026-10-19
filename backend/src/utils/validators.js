const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isValidEmail = (correo) =>
  typeof correo === "string" && EMAIL_REGEX.test(correo.trim());

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : value;

module.exports = { EMAIL_REGEX, isNonEmptyString, isValidEmail, cleanString };
