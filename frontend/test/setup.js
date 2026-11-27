import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Limpia el DOM entre pruebas (React Testing Library no lo hace solo si
// los globals de Vitest están desactivados).
afterEach(cleanup);
