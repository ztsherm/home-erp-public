"use client";

import { createContext, useContext, useState } from "react";

type WorkflowContextValue = {
  complete: (message?: string) => void;
};

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children, onComplete }: Readonly<{ children: React.ReactNode; onComplete: (message: string) => void }>) {
  return <WorkflowContext.Provider value={{ complete: (message = "Transaction completed") => onComplete(message) }}>{children}</WorkflowContext.Provider>;
}

export function WorkflowForm({
  action,
  children,
  className,
  successMessage = "Transaction completed",
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}>) {
  const workflow = useContext(WorkflowContext);
  const [formKey, setFormKey] = useState(0);

  async function submit(formData: FormData) {
    await action(formData);
    setFormKey((value) => value + 1);
    workflow?.complete(successMessage);
  }

  return (
    <form key={formKey} action={submit} className={className}>
      {children}
    </form>
  );
}
