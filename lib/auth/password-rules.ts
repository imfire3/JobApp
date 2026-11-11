export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHAR_RE = /[!@#$%^&*()\-_+=\[\]{};:'",.<>?/\\|`~]/;

export type PasswordRule = {
  id: "length" | "uppercase" | "lowercase" | "digit" | "special";
  test: (value: string) => boolean;
  help: string;
  error: string;
};

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
    help: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
    error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  },
  {
    id: "uppercase",
    test: (value) => /[A-Z]/.test(value),
    help: "Au moins une lettre majuscule",
    error: "Ajoutez au moins une lettre majuscule.",
  },
  {
    id: "lowercase",
    test: (value) => /[a-z]/.test(value),
    help: "Au moins une lettre minuscule",
    error: "Ajoutez au moins une lettre minuscule.",
  },
  {
    id: "digit",
    test: (value) => /[0-9]/.test(value),
    help: "Au moins un chiffre",
    error: "Ajoutez au moins un chiffre.",
  },
  {
    id: "special",
    test: (value) => SPECIAL_CHAR_RE.test(value),
    help: "Au moins un caractère spécial (!, @, #, $, etc.)",
    error: "Ajoutez au moins un caractère spécial.",
  },
];

export function passwordRuleFailures(value: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(value));
}

export function isPasswordValid(value: string): boolean {
  return passwordRuleFailures(value).length === 0;
}
