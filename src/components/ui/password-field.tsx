import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordField({
  name,
  label,
  autoComplete,
  errorId,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  errorId?: string;
  minLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={errorId}
        />
        <button
          type="button"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
