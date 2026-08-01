export type QuizQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_TEXT";

const normalized = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase();

export function isQuizAnswerCorrect(
  type: QuizQuestionType | string,
  answer: unknown,
  storedCorrectAnswer: string,
) {
  if (type === "MULTIPLE_CHOICE") {
    let correct: unknown = [];
    try {
      correct = JSON.parse(storedCorrectAnswer);
    } catch {
      correct = [storedCorrectAnswer];
    }
    const actual = Array.isArray(answer) ? answer : [answer];
    const expected = Array.isArray(correct) ? correct : [correct];
    return (
      actual.map(normalized).sort().join("|") ===
      expected.map(normalized).sort().join("|")
    );
  }
  return normalized(answer) === normalized(storedCorrectAnswer);
}
