import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Spinner from "../src/components/Spinner";

describe("Spinner", () => {
  it("es decorativo y usa el tamaño por defecto", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("animate-spin", "h-5", "w-5");
  });

  it("permite cambiar el tamaño con className", () => {
    const { container } = render(<Spinner className="h-8 w-8" />);

    expect(container.querySelector("svg")).toHaveClass("h-8", "w-8");
  });
});
