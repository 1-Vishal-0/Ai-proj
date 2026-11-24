import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import './workspace.css';

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="workspace-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{id?: string}>;
}) {
  const id = useId();
  return (
    <div className="workspace-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children,{ id })}
    </div>
  );
}
