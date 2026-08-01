import { describe, expect, it } from "vitest";
import { isQuizAnswerCorrect } from "../lib/quiz";

describe("calificación profesional de cuestionarios", () => {
  it("califica selección única y verdadero/falso", () => {
    expect(isQuizAnswerCorrect("SINGLE_CHOICE", "B", "B")).toBe(true);
    expect(isQuizAnswerCorrect("TRUE_FALSE", "Verdadero", "verdadero")).toBe(
      true,
    );
  });

  it("califica selección múltiple sin depender del orden", () => {
    expect(
      isQuizAnswerCorrect("MULTIPLE_CHOICE", ["C", "A"], '["A","C"]'),
    ).toBe(true);
    expect(isQuizAnswerCorrect("MULTIPLE_CHOICE", ["A"], '["A","C"]')).toBe(
      false,
    );
  });

  it("normaliza espacios y mayúsculas en respuestas cortas", () => {
    expect(isQuizAnswerCorrect("SHORT_TEXT", "  La Paz ", "la paz")).toBe(true);
  });
});
