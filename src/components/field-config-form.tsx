"use client";

import { useState } from "react";
import { createRecordField, updateRecordField } from "@/features/metadata/actions";
import { SubmitButton } from "@/components/submit-button";

type FieldKind = "FREE_TEXT" | "DATE" | "INTEGER" | "CHECKBOX" | "LIST" | "RECORD";
type ListOption = { id: string; name: string };
type RecordTypeOption = { id: string; name: string };
type FieldConfig = {
  id: string;
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  active: boolean;
  listId: string | null;
  relatedRecordTypeId: string | null;
};

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const fieldKinds: Array<{ value: FieldKind; label: string }> = [
  { value: "FREE_TEXT", label: "Free text" },
  { value: "DATE", label: "Date" },
  { value: "INTEGER", label: "Integer" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "LIST", label: "List" },
  { value: "RECORD", label: "Record" },
];

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <label className="grid gap-1.5 text-sm font-medium text-neutral-800"><span>{label}</span>{children}</label>;
}

function SourceSelector({ kind, lists, recordTypes, defaultListId, defaultRecordTypeId, disabled }: { kind: FieldKind; lists: ListOption[]; recordTypes: RecordTypeOption[]; defaultListId?: string | null; defaultRecordTypeId?: string | null; disabled?: boolean }) {
  if (kind === "LIST") {
    return (
      <Field label="List source">
        <select name="listId" defaultValue={defaultListId ?? ""} disabled={disabled} className={inputClass}>
          <option value="">Select list</option>
          {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
      </Field>
    );
  }

  if (kind === "RECORD") {
    return (
      <Field label="Record source">
        <select name="relatedRecordTypeId" defaultValue={defaultRecordTypeId ?? ""} disabled={disabled} className={inputClass}>
          <option value="">Select record type</option>
          {recordTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
      </Field>
    );
  }

  return null;
}

export function ExistingFieldForm({ field, lists, recordTypes, isAdmin }: { field: FieldConfig; lists: ListOption[]; recordTypes: RecordTypeOption[]; isAdmin: boolean }) {
  const [kind, setKind] = useState<FieldKind>(field.kind);
  const isNameField = field.key === "name";
  const disabled = !isAdmin || isNameField;

  return (
    <form action={updateRecordField} className="grid gap-3 p-4">
      <input type="hidden" name="id" value={field.id} />
      {isNameField ? (
        <>
          <input type="hidden" name="label" value="Name" />
          <input type="hidden" name="kind" value="FREE_TEXT" />
          <input type="hidden" name="required" value="on" />
          <input type="hidden" name="active" value="on" />
        </>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Label"><input name="label" required defaultValue={isNameField ? "Name" : field.label} disabled={disabled} className={inputClass} /></Field>
        <Field label="Type">
          <select name="kind" value={isNameField ? "FREE_TEXT" : kind} onChange={(event) => setKind(event.target.value as FieldKind)} disabled={disabled} className={inputClass}>
            {fieldKinds.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <SourceSelector kind={isNameField ? "FREE_TEXT" : kind} lists={lists} recordTypes={recordTypes} defaultListId={field.listId} defaultRecordTypeId={field.relatedRecordTypeId} disabled={disabled} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-medium text-neutral-800">
        <label className="flex items-center gap-2"><input type="checkbox" name="required" defaultChecked={isNameField ? true : field.required} disabled={disabled} />Required</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={isNameField ? true : field.active} disabled={disabled} />Active</label>
      </div>
      {isAdmin ? <SubmitButton variant="secondary" pendingLabel="Updating field..." className="w-fit">Update field</SubmitButton> : null}
    </form>
  );
}

export function NewFieldForm({ recordTypeId, lists, recordTypes }: { recordTypeId: string; lists: ListOption[]; recordTypes: RecordTypeOption[] }) {
  const [kind, setKind] = useState<FieldKind>("FREE_TEXT");

  return (
    <form action={createRecordField} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="recordTypeId" value={recordTypeId} />
      <Field label="Label"><input name="label" required className={inputClass} /></Field>
      <Field label="Type">
        <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as FieldKind)} className={inputClass}>
          {fieldKinds.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <SourceSelector kind={kind} lists={lists} recordTypes={recordTypes} />
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="required" />Required</label>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="Adding field...">Add field</SubmitButton>
      </div>
    </form>
  );
}
