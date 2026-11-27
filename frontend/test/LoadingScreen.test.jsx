import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingScreen from "../src/components/LoadingScreen";

describe("LoadingScreen", () => {
  it("muestra el mensaje por defecto", () => {
    render(<LoadingScreen />);

    expect(screen.getByText("Verificando sesion...")).toBeInTheDocument();
  });

  it("permite personalizar el mensaje", () => {
    render(<LoadingScreen mensaje="Cargando canchas..." />);

    expect(screen.getByText("Cargando canchas...")).toBeInTheDocument();
  });
});
