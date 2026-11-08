import { createArea, createItem, createLocation, createRoom, itemConsumption, itemLoan, itemMaintenance, itemPutaway, itemTransfer, returnItemLoan, updateCurrentPerson } from "@/features/inventory/actions";
import { changeCurrentPassword, updateCurrentPin } from "@/features/auth/actions";
import { AreaSearchCreate } from "@/components/area-search-create";
import { ConsumptionWorkflow } from "@/components/consumption-workflow";
import { FileNameFields } from "@/components/file-name-fields";
import { ItemCreationFields } from "@/components/item-creation-fields";
import { ItemSearchCreate } from "@/components/item-search-create";
import { TransferWorkflow } from "@/components/transfer-workflow";
import { saveConcreteRecord } from "@/features/metadata/actions";
import { RelatedRecordSearch } from "@/components/related-record-search";
import { Field, inputClass, Panel } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { WorkflowForm } from "@/components/workflow-form";

type Option = { id: string; name: string; upc?: string | null };
type PeopleRecord = { name: string; email: string | null; phone: string | null; profilePhotoUrl: string | null };
type ItemLocationOption = { id: string; itemId: string; name: string; quantity: string; path: string };
type RecordTypeOption = { id: string; name: string };
type ItemOption = { id: string; name: string; brand?: string | null; model?: string | null };
type TaskScheduleOption = { id: string; title: string; intervalDays: number; assignedToId?: string | null };

export function PeopleForm({ recordTypeId }: { recordTypeId: string }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create person</h2>
      <WorkflowForm action={saveConcreteRecord} className="mt-3 grid gap-3">
        <input type="hidden" name="recordTypeId" value={recordTypeId} />
        <Field label="Name"><input name="name" required className={inputClass} /></Field>
        <Field label="Email"><input name="email" type="email" className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" className={inputClass} /></Field>
        <Field label="Employer"><input name="employer" className={inputClass} /></Field>
        <Field label="Job title"><input name="jobTitle" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating person...">Create person</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function TaskScheduleForm({ recordTypeId, people }: { recordTypeId: string; people: Array<{ id: string; name: string }> }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create task schedule</h2>
      <WorkflowForm action={saveConcreteRecord} className="mt-3 grid gap-3">
        <input type="hidden" name="recordTypeId" value={recordTypeId} />
        <Field label="Task title"><input name="title" required placeholder="Dust fan" className={inputClass} /></Field>
        <Field label="Interval days"><input name="intervalDays" type="number" required min="1" className={inputClass} /></Field>
        <Field label="Assigned to">
          <select name="assignedToId" defaultValue="" className={inputClass}>
            <option value="">Unassigned</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <SubmitButton pendingLabel="Creating schedule...">Create schedule</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function TaskForm({ recordTypeId, items, people, schedules }: { recordTypeId: string; items: ItemOption[]; people: Array<{ id: string; name: string }>; schedules: TaskScheduleOption[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create task</h2>
      <WorkflowForm action={saveConcreteRecord} className="mt-3 grid gap-3">
        <input type="hidden" name="recordTypeId" value={recordTypeId} />
        <Field label="Title"><input name="title" required className={inputClass} /></Field>
        <Field label="Item">
          <select name="itemId" required defaultValue="" className={inputClass}>
            <option value="">Select item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{[item.name, item.brand, item.model].filter(Boolean).join(" - ")}</option>)}
          </select>
        </Field>
        <Field label="Generation schedule">
          <select name="taskScheduleId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.title} - every {schedule.intervalDays} days</option>)}
          </select>
        </Field>
        <Field label="Assigned to">
          <select name="assignedToId" defaultValue="" className={inputClass}>
            <option value="">Unassigned</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input name="dueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating task...">Create task</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function ItemForm({ items }: { items: Option[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create item</h2>
      <WorkflowForm action={createItem} className="mt-3 grid gap-3">
        <ItemCreationFields items={items} />
        <Field label="Brand"><input name="brand" className={inputClass} /></Field>
        <Field label="Model"><input name="model" className={inputClass} /></Field>
        <Field label="Serial number"><input name="serialNumber" className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reorder threshold (min)"><input name="minQuantity" type="number" min="0" step="1" placeholder="e.g. 2" className={inputClass} /></Field>
          <Field label="Target quantity (max)"><input name="targetQuantity" type="number" min="0" step="1" placeholder="e.g. 10" className={inputClass} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase price ($)"><input name="purchasePrice" type="number" min="0" step="0.01" placeholder="0.00" className={inputClass} /></Field>
          <Field label="Purchase date"><input name="purchaseDate" type="date" className={inputClass} /></Field>
        </div>
        <Field label="Photo"><input name="photo" type="file" accept="image/*" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating item...">Create item</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function FileForm({ recordTypeId, recordTypes }: { recordTypeId: string; recordTypes: RecordTypeOption[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create file</h2>
      <WorkflowForm action={saveConcreteRecord} className="mt-3 grid gap-3">
        <input type="hidden" name="recordTypeId" value={recordTypeId} />
        <FileNameFields requireFile />
        <Field label="Related record"><RelatedRecordSearch recordTypes={recordTypes} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Uploading file...">Create file</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function CurrentPeopleForm({ person }: { person: PeopleRecord }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">People profile</h2>
      <WorkflowForm action={updateCurrentPerson} className="mt-3 grid gap-3">
        <Field label="Name"><input name="name" required defaultValue={person.name} className={inputClass} /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={person.email ?? ""} className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" defaultValue={person.phone ?? ""} className={inputClass} /></Field>
        {person.profilePhotoUrl ? <img src={person.profilePhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : null}
        <Field label="Profile photo"><input name="profilePhoto" type="file" accept="image/*" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Updating profile...">Update profile</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function PasswordForm({ updated = false }: { updated?: boolean }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Password</h2>
      {updated ? <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p> : null}
      <form action={changeCurrentPassword} className="mt-3 grid gap-3">
        <Field label="Current password"><input name="currentPassword" type="password" required minLength={8} className={inputClass} /></Field>
        <Field label="New password"><input name="password" type="password" required minLength={8} className={inputClass} /></Field>
        <Field label="Confirm new password"><input name="confirmPassword" type="password" required minLength={8} className={inputClass} /></Field>
        <SubmitButton pendingLabel="Updating password...">Update password</SubmitButton>
      </form>
    </Panel>
  );
}

export function PinForm({ hasPin = false, updated = false, removed = false }: { hasPin?: boolean; updated?: boolean; removed?: boolean }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">4-Digit PIN</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${hasPin ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>
          {hasPin ? "PIN configured" : "No PIN set"}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Use a 4-digit numeric PIN for quick sign-in to Home ERP.
      </p>
      {updated ? <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">PIN updated successfully.</p> : null}
      {removed ? <p className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">PIN removed.</p> : null}
      <form action={updateCurrentPin} className="mt-3 grid gap-3">
        <Field label="4-digit PIN">
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            required
            placeholder="••••"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm 4-digit PIN">
          <input
            name="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            required
            placeholder="••••"
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-2 mt-1">
          <SubmitButton pendingLabel="Updating PIN...">
            {hasPin ? "Update PIN" : "Set PIN"}
          </SubmitButton>
          {hasPin ? (
            <button
              type="submit"
              name="action"
              value="remove"
              formNoValidate
              className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-2"
            >
              Remove PIN
            </button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

export function LocationForm() {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create location</h2>
      <WorkflowForm action={createLocation} className="mt-3 grid gap-3">
        <Field label="Location name"><input name="name" required className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating location...">Create location</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function RoomForm({ locations }: { locations: Option[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create room</h2>
      <WorkflowForm action={createRoom} className="mt-3 grid gap-3">
        <Field label="Location"><select name="locationId" required className={inputClass}>{locations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Room name"><input name="name" required className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating room...">Create room</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function AreaForm({ rooms }: { rooms: Option[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Create area</h2>
      <WorkflowForm action={createArea} className="mt-3 grid gap-3">
        <Field label="Room"><select name="roomId" required className={inputClass}>{rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Area name"><input name="name" required className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating area...">Create area</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function PutawayForm({ items, areas, rooms }: { items: Option[]; areas: Option[]; rooms: Option[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Item putaway</h2>
      <WorkflowForm action={itemPutaway} className="mt-3 grid gap-3">
        <Field label="Item"><ItemSearchCreate items={items} /></Field>
        <Field label="Area"><AreaSearchCreate areas={areas} rooms={rooms} idName="areaId" newName="newAreaName" roomIdName="newAreaRoomId" /></Field>
        <Field label="Quantity"><input name="quantity" type="number" min="1" defaultValue="1" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating putaway...">Create putaway</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function TransferForm({ items, areas, rooms, itemLocations }: { items: Option[]; areas: Option[]; rooms: Option[]; itemLocations: ItemLocationOption[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Item transfer</h2>
      <WorkflowForm action={itemTransfer} className="mt-3 grid gap-3">
        <TransferWorkflow items={items} areas={areas} rooms={rooms} itemLocations={itemLocations} />
        <Field label="Quantity"><input name="quantity" type="number" min="1" defaultValue="1" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating transfer...">Create transfer</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function ConsumptionForm({ items, itemLocations }: { items: Option[]; itemLocations: ItemLocationOption[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Item consumption</h2>
      <WorkflowForm action={itemConsumption} className="mt-3 grid gap-3">
        <ConsumptionWorkflow items={items} itemLocations={itemLocations} />
        <Field label="Quantity"><input name="quantity" type="number" min="1" defaultValue="1" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating consumption...">Create consumption</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function MaintenanceForm({ items }: { items: Option[] }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Item maintenance</h2>
      <WorkflowForm action={itemMaintenance} className="mt-3 grid gap-3">
        <Field label="Item"><select name="itemId" required className={inputClass}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Maintenance type"><input name="maintenanceType" required className={inputClass} /></Field>
        <Field label="Vendor"><input name="vendor" className={inputClass} /></Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" className={inputClass} /></Field>
        <Field label="Next due date"><input name="nextDueDate" type="date" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating maintenance log...">Create maintenance log</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function LoanForm({ items, people }: { items: Option[]; people: Array<{ id: string; name: string }> }) {
  return (
    <Panel className="p-4">
      <h2 className="font-semibold">Item loan</h2>
      <WorkflowForm action={itemLoan} className="mt-3 grid gap-3">
        <Field label="Item">
          <select name="itemId" required defaultValue="" className={inputClass}>
            <option value="">Select item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Borrower (Person)">
          <select name="borrowerId" required defaultValue="" className={inputClass}>
            <option value="">Select borrower</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <Field label="Loan date"><input name="loanDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></Field>
        <Field label="Expected return date"><input name="expectedReturnDate" type="date" className={inputClass} /></Field>
        <Field label="Condition notes"><input name="conditionNotes" placeholder="e.g. Good condition, 2 batteries included" className={inputClass} /></Field>
        <Field label="Notes"><input name="notes" className={inputClass} /></Field>
        <SubmitButton pendingLabel="Creating loan...">Create loan</SubmitButton>
      </WorkflowForm>
    </Panel>
  );
}

export function ReturnLoanForm({ loanId }: { loanId: string }) {
  return (
    <WorkflowForm action={returnItemLoan} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={loanId} />
      <input type="hidden" name="actualReturnDate" value={new Date().toISOString().slice(0, 10)} />
      <SubmitButton pendingLabel="Returning..." className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-md font-medium">
        Mark returned
      </SubmitButton>
    </WorkflowForm>
  );
}
