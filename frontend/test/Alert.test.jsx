import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Alert from "../src/components/Alert";

describe("Alert", () => {
  it("no renderiza nada si no hay mensaje", () => {
    const { container } = render(<Alert />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra un mensaje de error con role alert", () => {
    render(<Alert>No se pudo guardar la reserva</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo guardar la reserva"
    );
  });

  it("muestra un mensaje de éxito", () => {
    render(<Alert tipo="exito">Reserva creada</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Reserva creada");
  });
});
