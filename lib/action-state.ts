// Result shape returned by every form Server Action (used with useActionState).

export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const idle: ActionState = { ok: false };
