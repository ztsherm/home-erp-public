"use client";

import { useState } from "react";

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function FileNameFields({ defaultName = "", requireFile = false }: Readonly<{ defaultName?: string; requireFile?: boolean }>) {
  const [name, setName] = useState(defaultName);
  const [userEditedName, setUserEditedName] = useState(Boolean(defaultName));

  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>Name</span>
        <input
          name="name"
          value={name}
          onChange={(event) => {
            setUserEditedName(true);
            setName(event.target.value);
          }}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>File</span>
        <input
          name="file"
          type="file"
          required={requireFile}
          className={inputClass}
          onChange={(event) => {
            const fileName = event.target.files?.[0]?.name;
            if (fileName && !userEditedName) setName(fileName);
          }}
        />
      </label>
    </>
  );
}
