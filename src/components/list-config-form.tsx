import { createList, createListOption, updateList, updateListOption } from "@/features/metadata/actions";
import { Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type ListConfig = {
  id: string;
  name: string;
  selectionMode: string;
  allowAddOnRecord: boolean;
  active: boolean;
};

type ListOptionConfig = {
  id: string;
  listId: string;
  label: string;
  active: boolean;
};

export function NewListForm() {
  return (
    <form action={createList} className="grid gap-3">
      <Field label="Title"><input name="name" required className={inputClass} /></Field>
      <Field label="Selection mode">
        <select name="selectionMode" className={inputClass}>
          <option value="SINGLE">Single select</option>
          <option value="MULTI">Multi select</option>
        </select>
      </Field>
      <SubmitButton pendingLabel="Creating list...">Create list</SubmitButton>
    </form>
  );
}

export function ExistingListForm({ list, isAdmin }: { list: ListConfig; isAdmin: boolean }) {
  return (
    <form action={updateList} className="grid gap-3">
      <input type="hidden" name="id" value={list.id} />
      <Field label="Title"><input name="name" required defaultValue={list.name} disabled={!isAdmin} className={inputClass} /></Field>
      <Field label="Selection mode">
        <select name="selectionMode" defaultValue={list.selectionMode} disabled={!isAdmin} className={inputClass}>
          <option value="SINGLE">Single select</option>
          <option value="MULTI">Multi select</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input name="allowAddOnRecord" type="checkbox" value="off" defaultChecked={!list.allowAddOnRecord} disabled={!isAdmin} />
        Do not allow adding on record
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input name="active" type="checkbox" defaultChecked={list.active} disabled={!isAdmin} />
        Active
      </label>
      {isAdmin ? <SubmitButton pendingLabel="Saving list...">Save list</SubmitButton> : null}
    </form>
  );
}

export function NewListOptionForm({ listId }: { listId: string }) {
  return (
    <form action={createListOption} className="grid gap-3">
      <input type="hidden" name="listId" value={listId} />
      <Field label="Label"><input name="label" required className={inputClass} /></Field>
      <SubmitButton pendingLabel="Adding option...">Add option</SubmitButton>
    </form>
  );
}

export function ExistingListOptionForm({ option, isAdmin }: { option: ListOptionConfig; isAdmin: boolean }) {
  return (
    <form action={updateListOption} className="grid gap-3">
      <input type="hidden" name="id" value={option.id} />
      <Field label="Label"><input name="label" required defaultValue={option.label} disabled={!isAdmin} className={inputClass} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input name="active" type="checkbox" defaultChecked={option.active} disabled={!isAdmin} />
        Active
      </label>
      {isAdmin ? <SubmitButton pendingLabel="Saving option...">Save option</SubmitButton> : null}
    </form>
  );
}
