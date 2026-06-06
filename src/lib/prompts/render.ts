// Renders a stored prompt template by substituting {{placeholders}}.
// Student-supplied values are inserted verbatim inside delimiters defined in the
// template itself (e.g. <student_essay>...</student_essay>) — prompt-injection
// defense lives in the system instruction (section 22).

export interface PromptVariables {
  task_type: string;
  question_prompt: string;
  student_essay: string;
  word_count?: number;
  [key: string]: string | number | undefined;
}

export function renderTemplate(
  template: string,
  variables: PromptVariables,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
