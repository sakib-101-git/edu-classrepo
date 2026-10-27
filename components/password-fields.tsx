"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { describedBy, Field, Input } from "./ui/field";

export function PasswordFields({ errors = {} }: { errors?: Record<string, string> }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-5">
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            className="pr-11"
            invalid={Boolean(errors.password)}
            aria-describedby={describedBy("password", errors.password, true)}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-subtle hover:text-ink"
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          maxLength={72}
          invalid={Boolean(errors.confirmPassword)}
          aria-describedby={describedBy("confirmPassword", errors.confirmPassword)}
        />
      </Field>
    </div>
  );
}
