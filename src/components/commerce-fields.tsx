import type { ReactNode } from "react";
import { errorMessage } from "../lib/api";
export function ErrorNotice({ error, id }: { error: unknown; id?: string }) {
  return error ? (
    <p className="form-error" role="alert" id={id}>
      {errorMessage(error)}
    </p>
  ) : null;
}
export function Loading({ label = "Carregando" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="skeleton summary-skeleton"
    />
  );
}
export function Field({
  name,
  label,
  type = "text",
  defaultValue,
  minLength,
  errorId,
  children,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  minLength?: number;
  errorId?: string;
  children?: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={label}
          required
          minLength={minLength}
          aria-describedby={errorId}
        />
      )}
    </label>
  );
}
