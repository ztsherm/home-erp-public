import Link from "next/link";
import { adminSetPeoplePassword, adminSetPeoplePin } from "@/features/auth/actions";
import { assignItemTaskSchedule, deleteConcreteRecord, saveConcreteRecord } from "@/features/metadata/actions";
import { getConcreteRecordPageData } from "@/features/metadata/queries";
import { RecordIcon } from "@/components/record-icon";
import { FilesPanel } from "@/components/files-panel";
import { FileNameFields } from "@/components/file-name-fields";
import { ActivityTable } from "@/components/activity-table";
import { InlineListField } from "@/components/inline-list-field";
import { RelatedRecordSearch } from "@/components/related-record-search";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";
import { RemoveItemTaskScheduleForm } from "@/components/remove-item-task-schedule-form";
import { ReturnLoanForm } from "@/components/forms";
import { shortDate, shortDateTime } from "@/lib/format";
import { calculateTco, formatCurrency } from "@/features/inventory/tco";
import { FavoriteToggle } from "@/components/personalization";
import { RecentRecordTracker } from "@/components/recent-record-tracker";
import { getFavorites } from "@/features/personalization/queries";

type AnyRecord = Record<string, unknown>;
type ItemLocationRow = {
  id: string;
  quantity: unknown;
  location: { id: string; name: string };
  room: { id: string; name: string };
  area: { id: string; name: string };
};
type RecordTarget = { recordTypeId?: string; recordId?: string };
type TaskStatusValue = "OPEN" | "COMPLETED" | "SKIPPED";

function value(record: unknown, key: string) {
  return record && typeof record === "object" ? (record as AnyRecord)[key] : "";
}

function displayValue(record: unknown, key: string) {
  const next = value(record, key);
  if (next === null || next === undefined || next === "") return "None";
  return String(next);
}

function DisplayRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-neutral-100 py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-sm text-neutral-950">{value || "None"}</dd>
    </div>
  );
}
function recordLink(recordTypeId: string | null | undefined, recordId: unknown, label: React.ReactNode) {
  return recordTypeId && recordId ? <Link href={`/records/${recordTypeId}/${String(recordId)}`} className="font-medium underline">{label}</Link> : label;
}

function linkedOption(options: Array<{ id: string; name: string }>, recordTypeId: string | null | undefined, id: unknown) {
  const option = options.find((next) => next.id === String(id));
  return option ? recordLink(recordTypeId, option.id, option.name) : "None";
}

function targetLabel(data: Awaited<ReturnType<typeof getConcreteRecordPageData>>, recordTypeId: unknown, recordId: unknown) {
  if (data.relatedRecordLabel) return data.relatedRecordLabel;
  const recordType = data.attachableRecordTypes.find((next) => next.id === String(recordTypeId));
  return recordType && recordId ? `${recordType.name} ${String(recordId)}` : "None";
}

function targetLink(data: Awaited<ReturnType<typeof getConcreteRecordPageData>>, recordTypeId: unknown, recordId: unknown) {
  const label = targetLabel(data, recordTypeId, recordId);
  return label === "None" || !recordTypeId || !recordId ? label : recordLink(String(recordTypeId), recordId, label);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function optionLabels(options: Array<{ id: string; label: string }>, ids: string[]) {
  return ids.map((id) => options.find((option) => option.id === id)?.label).filter(Boolean).join(", ") || "None";
}

function peopleLinks(options: Array<{ id: string; name: string }>, peopleRecordTypeId: string | null | undefined, ids: string[]) {
  const links = ids.flatMap((id) => {
    const person = options.find((option) => option.id === id);
    return person ? [{ id: person.id, link: recordLink(peopleRecordTypeId, person.id, person.name) }] : [];
  });
  return links.length ? <span className="flex flex-wrap gap-x-2 gap-y-1">{links.map((person) => <span key={person.id}>{person.link}</span>)}</span> : "None";
}

function dateInputValue(next: unknown) {
  if (!next) return "";
  const date = next instanceof Date ? next : new Date(String(next));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function loginRole(record: unknown) {
  const user = value(record, "user");
  if (!user || typeof user !== "object") return "user";
  return value(user, "role") === "ADMINISTRATOR" ? "admin" : "user";
}

function loginRoleLabel(record: unknown) {
  return loginRole(record) === "admin" ? "admin" : "user";
}
function taskStatusLabel(status: unknown) {
  if (status === "COMPLETED") return "Completed";
  if (status === "SKIPPED") return "Skipped";
  return "Open";
}

function ConcreteRecordView({ data }: { data: Awaited<ReturnType<typeof getConcreteRecordPageData>> }) {
  const record = data.record;
  const key = data.recordType.key;
  return (
    <dl>
      {key === "location" ? (
        <>
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "room" ? (
        <>
          <DisplayRow label="Location" value={linkedOption(data.locations, data.locationRecordType?.id, value(record, "locationId"))} />
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "area" ? (
        <>
          <DisplayRow label="Location" value={linkedOption(data.locations, data.locationRecordType?.id, value(record, "locationId"))} />
          <DisplayRow label="Room" value={linkedOption(data.rooms, data.roomRecordType?.id, value(record, "roomId"))} />
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "item" ? (
        <>
          {data.itemActiveLoan ? (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-900">
                  Currently loaned to {recordLink(data.peopleRecordType?.id, data.itemActiveLoan.borrowerId, data.itemActiveLoan.borrower.name)}
                  {data.itemActiveLoan.expectedReturnDate ? ` (Expected return: ${shortDate(data.itemActiveLoan.expectedReturnDate)})` : ""}
                </span>
              </div>
              <ReturnLoanForm loanId={data.itemActiveLoan.id} />
            </div>
          ) : null}
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="Brand" value={displayValue(record, "brand")} />
          <DisplayRow label="Model" value={displayValue(record, "model")} />
          <DisplayRow label="Serial number" value={displayValue(record, "serialNumber")} />
          <DisplayRow label="UPC" value={displayValue(record, "upc")} />
          <DisplayRow label="Current stock" value={`${data.itemTotalQuantity} unit${data.itemTotalQuantity === 1 ? "" : "s"}`} />
          <DisplayRow label="Reorder threshold (min)" value={displayValue(record, "minQuantity") || "Not set"} />
          <DisplayRow label="Target quantity (max)" value={displayValue(record, "targetQuantity") || "Not set"} />
          {displayValue(record, "minQuantity") && Number(displayValue(record, "minQuantity")) > 0 ? (
            <DisplayRow label="Replenishment status" value={
              data.itemTotalQuantity <= Number(displayValue(record, "minQuantity")) ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                  Replenishment Needed ({data.itemTotalQuantity} &le; {String(displayValue(record, "minQuantity"))})
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  In Stock (Above minimum)
                </span>
              )
            } />
          ) : null}
          <DisplayRow label="Purchase price" value={displayValue(record, "purchasePrice") ? formatCurrency(Number(displayValue(record, "purchasePrice"))) : "Not set"} />
          <DisplayRow label="Purchase date" value={dateInputValue(value(record, "purchaseDate")) || "Not set"} />
          {data.itemTco ? (
            <>
              <DisplayRow label="Life-to-date maintenance" value={formatCurrency(data.itemTco.totalMaintenanceCost)} />
              <DisplayRow label="Total ownership cost" value={
                <span className="font-semibold text-neutral-950">
                  {formatCurrency(data.itemTco.totalOwnershipCost)}
                </span>
              } />
              <DisplayRow label="Ownership rate" value={`${formatCurrency(data.itemTco.costPerMonth)}/mo (${formatCurrency(data.itemTco.costPerYear)}/yr)`} />
            </>
          ) : null}
          <DisplayRow label="Photo" value={typeof value(record, "photoUrl") === "string" && value(record, "photoUrl") ? <img src={String(value(record, "photoUrl"))} alt="" className="h-24 w-24 rounded-md object-cover" /> : "None"} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "task_schedule" ? (
        <>
          <DisplayRow label="Task title" value={displayValue(record, "title")} />
          <DisplayRow label="Interval days" value={displayValue(record, "intervalDays")} />
          <DisplayRow label="Assigned to" value={value(record, "assignedToId") ? recordLink(data.peopleRecordType?.id, value(record, "assignedToId"), displayValue(value(record, "assignedTo"), "name")) : "None"} />
        </>
      ) : null}
      {key === "file" ? (
        <>
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="File" value={typeof value(record, "fileUrl") === "string" && value(record, "fileUrl") ? <a href={String(value(record, "fileUrl"))} download={displayValue(record, "fileName")} className="font-medium underline">{displayValue(record, "fileName")}</a> : "None"} />
          <DisplayRow label="Type" value={displayValue(record, "mimeType")} />
          <DisplayRow label="Related record" value={targetLink(data, value(record, "relatedRecordTypeId"), value(record, "relatedRecordId"))} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "people" ? (
        <>
          {data.peopleActiveLoans?.length ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Active Borrowed Items ({data.peopleActiveLoans.length})</p>
              <ul className="mt-2 space-y-2">
                {data.peopleActiveLoans.map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between text-sm text-amber-950">
                    <div>
                      {recordLink(data.itemRecordType?.id, loan.itemId, loan.item.name)}
                      {loan.expectedReturnDate ? <span className="ml-1.5 text-xs text-neutral-500">(Due: {shortDate(loan.expectedReturnDate)})</span> : null}
                    </div>
                    <ReturnLoanForm loanId={loan.id} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <DisplayRow label="Name" value={displayValue(record, "name")} />
          <DisplayRow label="Relationship" value={optionLabels(data.peopleLists.relationship?.options ?? [], [String(value(record, "relationshipTypeOptionId") ?? "")])} />
          <DisplayRow label="Login role" value={loginRoleLabel(record)} />
          <DisplayRow label="Friend of" value={peopleLinks(data.peopleLists.people, data.peopleRecordType?.id, stringArray(value(record, "friendOfPeopleIds")))} />
          <DisplayRow label="Email" value={displayValue(record, "email")} />
          <DisplayRow label="Phone" value={displayValue(record, "phone")} />
          <DisplayRow label="Birthday" value={dateInputValue(value(record, "birthday")) || "None"} />
          <DisplayRow label="Anniversary" value={dateInputValue(value(record, "anniversary")) || "None"} />
          <DisplayRow label="Employer" value={displayValue(record, "employer")} />
          <DisplayRow label="Job title" value={displayValue(record, "jobTitle")} />
          <DisplayRow label="Interests" value={optionLabels(data.peopleLists.interests?.options ?? [], stringArray(value(record, "interestOptionIds")))} />
          {data.user.role === "ADMINISTRATOR" && isImmediateFamily(data) ? (
            <DisplayRow label="PIN" value={value(record, "pin") ? `${String(value(record, "pin"))} (Admin only)` : "None set"} />
          ) : null}
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
      {key === "item_multi_upc" ? (
        <>
          <DisplayRow label="UPC" value={displayValue(record, "upc") || displayValue(record, "name")} />
          <DisplayRow label="Item" value={recordLink(data.itemRecordType?.id, value(record, "itemId"), displayValue(value(record, "item"), "name"))} />
        </>
      ) : null}
      {key === "task" ? (
        <>
          <DisplayRow label="Title" value={displayValue(record, "title")} />
          <DisplayRow label="Item" value={recordLink(data.itemRecordType?.id, value(record, "itemId"), displayValue(value(record, "item"), "name"))} />
          <DisplayRow label="Generation schedule" value={data.taskScheduleRecordType && value(record, "taskScheduleId") ? <Link href={`/records/${data.taskScheduleRecordType.id}/${String(value(record, "taskScheduleId"))}`} className="font-medium underline">{displayValue(value(record, "taskSchedule"), "title")}</Link> : displayValue(value(record, "taskSchedule"), "title")} />
          <DisplayRow label="Assigned to" value={value(record, "assignedToId") ? recordLink(data.peopleRecordType?.id, value(record, "assignedToId"), displayValue(value(record, "assignedTo"), "name")) : "None"} />
          <DisplayRow label="Due date" value={dateInputValue(value(record, "dueDate")) || "None"} />
          <DisplayRow label="Status" value={taskStatusLabel(value(record, "status"))} />
          <DisplayRow label="Completed by" value={value(record, "completedById") ? recordLink(data.peopleRecordType?.id, value(record, "completedById"), displayValue(value(record, "completedBy"), "name")) : "None"} />
          <DisplayRow label="Completed date" value={dateInputValue(value(record, "completedDate")) || "None"} />
          <DisplayRow label="Next task date" value={dateInputValue(value(record, "nextTaskDate")) || "None"} />
          <DisplayRow label="Completed at" value={value(record, "completedAt") ? shortDateTime(new Date(String(value(record, "completedAt")))) : "None"} />
          <DisplayRow label="Skipped at" value={value(record, "skippedAt") ? shortDateTime(new Date(String(value(record, "skippedAt")))) : "None"} />
          <DisplayRow label="Maintenance" value={value(record, "maintenanceRecordId") ? <Link href={`/events/maintenance/${String(value(record, "maintenanceRecordId"))}`} className="font-medium underline">Item maintenance record</Link> : "None"} />
          <DisplayRow label="Notes" value={displayValue(record, "notes")} />
        </>
      ) : null}
    </dl>
  );
}
function ConcreteRecordForm({ data, mode, target }: { data: Awaited<ReturnType<typeof getConcreteRecordPageData>>; mode: "new" | "edit"; target: RecordTarget }) {
  const record = data.record;
  const key = data.recordType.key;
  const defaultTaskItemId = String(value(record, "itemId") || (data.taskItemOptions.some((item) => item.id === target.recordId) ? target.recordId : "") || "");
  return (
    <form action={saveConcreteRecord} className="grid gap-3">
      <input type="hidden" name="recordTypeId" value={data.recordType.id} />
      {mode !== "new" ? <input type="hidden" name="id" value={String(value(record, "id"))} /> : null}
      {key === "location" ? (
        <>
          <Field label="Name"><input name="name" required defaultValue={String(value(record, "name") ?? "")} className={inputClass} /></Field>
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "room" ? (
        <>
          <Field label="Location"><select name="locationId" defaultValue={String(value(record, "locationId") ?? "")} className={inputClass}>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
          <Field label="Name"><input name="name" required defaultValue={String(value(record, "name") ?? "")} className={inputClass} /></Field>
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "area" ? (
        <>
          <Field label="Location"><select name="locationId" defaultValue={String(value(record, "locationId") ?? "")} className={inputClass}>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
          <Field label="Room"><select name="roomId" defaultValue={String(value(record, "roomId") ?? "")} className={inputClass}>{data.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></Field>
          <Field label="Name"><input name="name" required defaultValue={String(value(record, "name") ?? "")} className={inputClass} /></Field>
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "item" ? (
        <>
          <Field label="Name"><input name="name" required defaultValue={String(value(record, "name") ?? "")} className={inputClass} /></Field>
          <Field label="Brand"><input name="brand" defaultValue={String(value(record, "brand") ?? "")} className={inputClass} /></Field>
          <Field label="Model"><input name="model" defaultValue={String(value(record, "model") ?? "")} className={inputClass} /></Field>
          <Field label="Serial number"><input name="serialNumber" defaultValue={String(value(record, "serialNumber") ?? "")} className={inputClass} /></Field>
          <Field label="UPC"><input name="upc" defaultValue={String(value(record, "upc") ?? "")} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reorder threshold (min)"><input name="minQuantity" type="number" min="0" step="1" defaultValue={String(value(record, "minQuantity") ?? "")} placeholder="e.g. 2" className={inputClass} /></Field>
            <Field label="Target quantity (max)"><input name="targetQuantity" type="number" min="0" step="1" defaultValue={String(value(record, "targetQuantity") ?? "")} placeholder="e.g. 10" className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase price ($)"><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={String(value(record, "purchasePrice") ?? "")} placeholder="0.00" className={inputClass} /></Field>
            <Field label="Purchase date"><input name="purchaseDate" type="date" defaultValue={dateInputValue(value(record, "purchaseDate"))} className={inputClass} /></Field>
          </div>
          {typeof value(record, "photoUrl") === "string" && value(record, "photoUrl") ? <img src={String(value(record, "photoUrl"))} alt="" className="h-24 w-24 rounded-md object-cover" /> : null}
          <Field label="Photo"><input name="photo" type="file" accept="image/*" className={inputClass} /></Field>
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "task_schedule" ? (
        <>
          <Field label="Task title"><input name="title" required defaultValue={String(value(record, "title") ?? "")} placeholder="Dust fan" className={inputClass} /></Field>
          <Field label="Interval days"><input name="intervalDays" type="number" required min="1" defaultValue={String(value(record, "intervalDays") ?? "")} className={inputClass} /></Field>
          <Field label="Assigned to">
            <select name="assignedToId" defaultValue={String(value(record, "assignedToId") ?? "")} className={inputClass}>
              <option value="">Unassigned</option>
              {data.taskPeopleOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </Field>
        </>
      ) : null}
      {key === "file" ? (
        <>
          <FileNameFields defaultName={String(value(record, "name") ?? "")} requireFile={mode === "new"} />
          {target.recordTypeId && target.recordId ? (
            <>
              <input type="hidden" name="relatedRecordTypeId" value={target.recordTypeId} />
              <input type="hidden" name="relatedRecordId" value={target.recordId} />
              <DisplayRow label="Related record" value={targetLabel(data, target.recordTypeId, target.recordId)} />
            </>
          ) : (
            <Field label="Related record">
              <RelatedRecordSearch recordTypes={data.attachableRecordTypes} defaultRecordTypeId={String(value(record, "relatedRecordTypeId") ?? "")} defaultRecordId={String(value(record, "relatedRecordId") ?? "")} defaultLabel={targetLabel(data, value(record, "relatedRecordTypeId"), value(record, "relatedRecordId"))} />
            </Field>
          )}
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "people" ? (
        <>
          <Field label="Name"><input name="name" required defaultValue={String(value(record, "name") ?? "")} className={inputClass} /></Field>
          {data.peopleLists.relationship ? <Field label="Relationship type"><InlineListField list={data.peopleLists.relationship} name="relationshipTypeOptionId" defaultValue={String(value(record, "relationshipTypeOptionId") ?? "")} /></Field> : null}
          <Field label="Login role">
            <select name="loginRole" defaultValue={loginRole(record)} className={inputClass}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </Field>
          <Field label="Friend Of">
            <select name="friendOfPeopleIds" multiple defaultValue={stringArray(value(record, "friendOfPeopleIds"))} className={inputClass}>
              {data.peopleLists.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </Field>
          <Field label="Email"><input name="email" type="email" defaultValue={String(value(record, "email") ?? "")} className={inputClass} /></Field>
          <Field label="Phone"><input name="phone" defaultValue={String(value(record, "phone") ?? "")} className={inputClass} /></Field>
          <Field label="Birthday"><input name="birthday" type="date" defaultValue={dateInputValue(value(record, "birthday"))} className={inputClass} /></Field>
          <Field label="Anniversary"><input name="anniversary" type="date" defaultValue={dateInputValue(value(record, "anniversary"))} className={inputClass} /></Field>
          <Field label="Employer"><input name="employer" defaultValue={String(value(record, "employer") ?? "")} className={inputClass} /></Field>
          <Field label="Job title"><input name="jobTitle" defaultValue={String(value(record, "jobTitle") ?? "")} className={inputClass} /></Field>
          {data.peopleLists.interests ? <Field label="Interests"><InlineListField list={data.peopleLists.interests} name="interestOptionIds" multiple defaultValue={stringArray(value(record, "interestOptionIds"))} /></Field> : null}
          {data.user.role === "ADMINISTRATOR" && isImmediateFamily(data) ? (
            <Field label="PIN (4 digits - Admin only)">
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                defaultValue={String(value(record, "pin") ?? "")}
                placeholder="4 digits (e.g. 1234)"
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {key === "item_multi_upc" ? (
        <>
          <Field label="UPC"><input name="upc" required defaultValue={String(value(record, "upc") ?? value(record, "name") ?? "")} className={inputClass} placeholder="UPC / Barcode" /></Field>
          <Field label="Item">
            <select name="itemId" required defaultValue={defaultTaskItemId} className={inputClass}>
              <option value="">Select item</option>
              {data.taskItemOptions.map((item) => <option key={item.id} value={item.id}>{[item.name, item.brand, item.model].filter(Boolean).join(" - ")}</option>)}
            </select>
          </Field>
        </>
      ) : null}
      {key === "task" ? (
        <>
          <Field label="Title"><input name="title" required defaultValue={String(value(record, "title") ?? "")} className={inputClass} /></Field>
          <Field label="Item">
            <select name="itemId" required defaultValue={defaultTaskItemId} className={inputClass}>
              <option value="">Select item</option>
              {data.taskItemOptions.map((item) => <option key={item.id} value={item.id}>{[item.name, item.brand, item.model].filter(Boolean).join(" - ")}</option>)}
            </select>
          </Field>
          <Field label="Generation schedule">
            <select name="taskScheduleId" defaultValue={String(value(record, "taskScheduleId") ?? "")} className={inputClass}>
              <option value="">None</option>
              {data.taskScheduleOptions.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.title} - every {schedule.intervalDays} days</option>)}
            </select>
          </Field>
          <Field label="Assigned to">
            <select name="assignedToId" defaultValue={String(value(record, "assignedToId") ?? "")} className={inputClass}>
              <option value="">Unassigned</option>
              {data.taskPeopleOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input name="dueDate" type="date" required defaultValue={dateInputValue(value(record, "dueDate")) || new Date().toISOString().slice(0, 10)} className={inputClass} /></Field>
          <Field label="Status">
            <select name="status" defaultValue={String(value(record, "status") || "OPEN") as TaskStatusValue} className={inputClass}>
              <option value="OPEN">Open</option>
              <option value="COMPLETED">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </Field>
          <Field label="Completed date"><input name="completedDate" type="date" defaultValue={dateInputValue(value(record, "completedDate"))} className={inputClass} /></Field>
          <Field label="Next task date"><input name="nextTaskDate" type="date" defaultValue={dateInputValue(value(record, "nextTaskDate"))} className={inputClass} /></Field>
          <Field label="Notes"><textarea name="notes" defaultValue={String(value(record, "notes") ?? "")} className={inputClass} /></Field>
        </>
      ) : null}
      {mode !== "new" && key !== "task" ? <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={Boolean(value(record, "active") ?? true)} />Active</label> : null}
      <SubmitButton pendingLabel="Saving record...">Save record</SubmitButton>
    </form>
  );
}

function isImmediateFamily(data: Awaited<ReturnType<typeof getConcreteRecordPageData>>) {
  if (data.recordType.key !== "people") return false;
  const immediateFamily = data.peopleLists.relationship?.options.find((option) => option.value === "immediate_family");
  return Boolean(immediateFamily && value(data.record, "relationshipTypeOptionId") === immediateFamily.id);
}

function AdminPeopleCredentialsPanel({ data, recordId, baseHref, updatedPassword, updatedPin, removedPin }: { data: Awaited<ReturnType<typeof getConcreteRecordPageData>>; recordId: string; baseHref: string; updatedPassword: boolean; updatedPin: boolean; removedPin: boolean }) {
  if (data.user.role !== "ADMINISTRATOR" || !isImmediateFamily(data)) return null;
  const email = value(data.record, "email");
  const pin = value(data.record, "pin");
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">4-Digit PIN (Admin)</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${pin ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>
            {pin ? `PIN: ${String(pin)}` : "No PIN set"}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Only administrators can view or set this PIN for Immediate Family members.
        </p>
        {updatedPin ? <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">PIN updated.</p> : null}
        {removedPin ? <p className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">PIN removed.</p> : null}
        <form action={adminSetPeoplePin} className="mt-3 grid gap-3">
          <input type="hidden" name="peopleId" value={recordId} />
          <input type="hidden" name="returnTo" value={baseHref} />
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
          <div className="flex items-center gap-2">
            <SubmitButton pendingLabel="Setting PIN...">Set PIN</SubmitButton>
            {pin ? (
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

      <Panel className="p-4">
        <h2 className="font-semibold">Password</h2>
        {updatedPassword ? <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p> : null}
        {typeof email === "string" && email ? (
          <form action={adminSetPeoplePassword} className="mt-3 grid gap-3">
            <input type="hidden" name="peopleId" value={recordId} />
            <input type="hidden" name="returnTo" value={baseHref} />
            <Field label="New password"><input name="password" type="password" required minLength={8} className={inputClass} /></Field>
            <Field label="Confirm new password"><input name="confirmPassword" type="password" required minLength={8} className={inputClass} /></Field>
            <SubmitButton pendingLabel="Setting password...">Set password</SubmitButton>
          </form>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">Add an email address to this person before setting a password.</p>
        )}
      </Panel>
    </div>
  );
}

function itemLocations(record: unknown) {
  if (!record || typeof record !== "object") return [];
  const rows = (record as { itemLocations?: unknown }).itemLocations;
  return Array.isArray(rows) ? rows as ItemLocationRow[] : [];
}

function RecordSubtabs({ data, activeTab, taskTab, baseHref, recordId }: { data: Awaited<ReturnType<typeof getConcreteRecordPageData>>; activeTab: string; taskTab: string; baseHref: string; recordId: string }) {
  if (!data.record) return null;
  const tabs = [
    ...(data.recordType.key === "people" ? [{ id: "loans", label: `Loans (${data.peopleLoans?.length ?? 0})` }] : []),
    ...(data.recordType.key === "task_schedule" ? [{ id: "items", label: "Items" }] : []),
    ...(data.recordType.key === "task" ? [{ id: "transactions", label: "Transactions" }] : []),
    { id: "activity", label: "Activity" },
    ...(data.recordType.key === "item" ? [{ id: "item-location", label: "Item Location" }] : []),
    ...(data.recordType.key === "item" ? [{ id: "tasks", label: "Tasks" }] : []),
    ...(data.recordType.key === "item" ? [{ id: "transactions", label: "Transactions" }] : []),
    ...(data.recordType.key === "file" ? [] : [{ id: "files", label: "Files" }]),
  ];
  const rows = itemLocations(data.record);
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id;
  const selectedTaskTab = taskTab === "schedules" ? "schedules" : "tasks";
  const taskBaseHref = `${baseHref}?tab=tasks`;
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid rounded-lg border border-neutral-200 bg-white p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => (
          <Link key={tab.id} href={`${baseHref}?tab=${tab.id}`} className={`rounded-md px-4 py-2 text-center text-sm font-medium ${selectedTab === tab.id ? "bg-stone-100 text-neutral-950 shadow-sm" : "text-neutral-600"}`}>
            {tab.label}
          </Link>
        ))}
      </div>
      {selectedTab === "activity" ? <ActivityTable activity={data.activity} /> : null}
      {selectedTab === "item-location" ? <Panel className="overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-stone-50 text-neutral-500">
                <tr><th className="px-4 py-3 font-semibold">Location</th><th className="px-4 py-3 font-semibold">Room</th><th className="px-4 py-3 font-semibold">Area</th><th className="px-4 py-3 font-semibold">Quantity</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{recordLink(data.locationRecordType?.id, row.location?.id, row.location?.name ?? "—")}</td>
                    <td className="px-4 py-3">{recordLink(data.roomRecordType?.id, row.room?.id, row.room?.name ?? "—")}</td>
                    <td className="px-4 py-3">{recordLink(data.areaRecordType?.id, row.area?.id, row.area?.name ?? "—")}</td>
                    <td className="px-4 py-3">{String(row.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-4 text-sm text-neutral-500">No item locations.</p>}
      </Panel> : null}
      {selectedTab === "tasks" ? (
        <Panel className="overflow-hidden">
          <div className="border-b border-neutral-100 p-4">
            <div className="grid rounded-lg border border-neutral-200 bg-white p-1 sm:w-fit sm:grid-cols-2">
              <Link href={`${taskBaseHref}&taskTab=tasks`} className={`rounded-md px-4 py-2 text-center text-sm font-medium ${selectedTaskTab === "tasks" ? "bg-stone-100 text-neutral-950 shadow-sm" : "text-neutral-600"}`}>Tasks</Link>
              <Link href={`${taskBaseHref}&taskTab=schedules`} className={`rounded-md px-4 py-2 text-center text-sm font-medium ${selectedTaskTab === "schedules" ? "bg-stone-100 text-neutral-950 shadow-sm" : "text-neutral-600"}`}>Task Schedule</Link>
            </div>
          </div>
          {selectedTaskTab === "schedules" ? (
            <>
              {data.itemTaskSchedules.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-stone-50 text-neutral-500">
                      <tr><th className="px-4 py-3 font-semibold">Schedule</th><th className="px-4 py-3 font-semibold">Interval</th><th className="px-4 py-3 font-semibold">Assigned To</th><th className="px-4 py-3 font-semibold">Remove</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.itemTaskSchedules.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3">{data.taskScheduleRecordType ? <Link href={`/records/${data.taskScheduleRecordType.id}/${row.taskScheduleId}`} className="font-medium underline">{row.taskSchedule.title}</Link> : <span className="font-medium">{row.taskSchedule.title}</span>}</td>
                          <td className="px-4 py-3">Every {row.taskSchedule.intervalDays} days</td>
                          <td className="px-4 py-3">{row.taskSchedule.assignedTo ? recordLink(data.peopleRecordType?.id, row.taskSchedule.assignedTo.id, row.taskSchedule.assignedTo.name) : "Unassigned"}</td>
                          <td className="px-4 py-3"><RemoveItemTaskScheduleForm itemId={recordId} taskScheduleId={row.taskScheduleId} returnTo={`${taskBaseHref}&taskTab=schedules`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="p-4 text-sm text-neutral-500">No task schedules are assigned to this item.</p>}
              <form action={assignItemTaskSchedule} className="grid gap-3 border-t border-neutral-100 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="itemId" value={recordId} />
                <input type="hidden" name="returnTo" value={`${taskBaseHref}&taskTab=schedules`} />
                <Field label="Assign schedule">
                  <select name="taskScheduleId" required defaultValue="" className={inputClass}>
                    <option value="">Select schedule</option>
                    {data.itemScheduleOptions.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.title} - every {schedule.intervalDays} days</option>)}
                  </select>
                </Field>
                <SubmitButton pendingLabel="Assigning...">Assign schedule</SubmitButton>
              </form>
            </>
          ) : null}
          {selectedTaskTab === "tasks" && data.itemTasks.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Task</th><th className="px-4 py-3 font-semibold">Due</th><th className="px-4 py-3 font-semibold">Completed</th><th className="px-4 py-3 font-semibold">Assigned To</th><th className="px-4 py-3 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.itemTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3">{data.taskRecordType ? <Link href={`/records/${data.taskRecordType.id}/${task.id}`} className="font-medium underline">{task.title}</Link> : task.title}</td>
                      <td className="px-4 py-3">{task.dueDate.toLocaleDateString()}</td>
                      <td className="px-4 py-3">{task.completedDate ? task.completedDate.toLocaleDateString() : "None"}</td>
                      <td className="px-4 py-3">{task.assignedTo ? recordLink(data.peopleRecordType?.id, task.assignedTo.id, task.assignedTo.name) : "Unassigned"}</td>
                      <td className="px-4 py-3">{taskStatusLabel(task.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {selectedTaskTab === "tasks" && !data.itemTasks.length ? <p className="p-4 text-sm text-neutral-500">No tasks have been created for this item.</p> : null}
          {selectedTaskTab === "tasks" && data.taskRecordType ? (
            <div className="border-t border-neutral-100 p-4">
              <Link href={`/records/${data.taskRecordType.id}/new?targetRecordTypeId=${data.recordType.id}&targetRecordId=${recordId}`} className="inline-flex min-h-10 items-center rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">New task</Link>
            </div>
          ) : null}
        </Panel>
      ) : null}
      {selectedTab === "items" ? (
        <Panel className="overflow-hidden">
          {data.scheduleItemAssignments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Brand</th><th className="px-4 py-3 font-semibold">Model</th><th className="px-4 py-3 font-semibold">Assigned</th><th className="px-4 py-3 font-semibold">Remove</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.scheduleItemAssignments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{data.itemRecordType ? <Link href={`/records/${data.itemRecordType.id}/${row.itemId}`} className="font-medium underline">{row.item.name}</Link> : <span className="font-medium">{row.item.name}</span>}</td>
                      <td className="px-4 py-3">{row.item.brand ?? "None"}</td>
                      <td className="px-4 py-3">{row.item.model ?? "None"}</td>
                      <td className="px-4 py-3">{row.createdAt.toLocaleDateString()}</td>
                      <td className="px-4 py-3"><RemoveItemTaskScheduleForm itemId={row.itemId} taskScheduleId={recordId} returnTo={`${baseHref}?tab=items`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-4 text-sm text-neutral-500">No items are assigned to this schedule.</p>}
          <form action={assignItemTaskSchedule} className="grid gap-3 border-t border-neutral-100 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="taskScheduleId" value={recordId} />
            <input type="hidden" name="returnTo" value={`${baseHref}?tab=items`} />
            <Field label="Add item">
              <select name="itemId" required defaultValue="" className={inputClass}>
                <option value="">Select item</option>
                {data.scheduleItemOptions.map((item) => <option key={item.id} value={item.id}>{[item.name, item.brand, item.model].filter(Boolean).join(" - ")}</option>)}
              </select>
            </Field>
            <SubmitButton pendingLabel="Adding...">Add item</SubmitButton>
          </form>
        </Panel>
      ) : null}
      {selectedTab === "transactions" && data.recordType.key === "task" ? (
        <Panel className="overflow-hidden">
          {data.taskTransactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Timestamp</th><th className="px-4 py-3 font-semibold">Transaction</th><th className="px-4 py-3 font-semibold">Performed By</th><th className="px-4 py-3 font-semibold">Summary</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.taskTransactions.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-4 py-3">{shortDateTime(row.timestamp)}</td>
                      <td className="px-4 py-3"><Link href={row.href} className="font-medium underline">{row.transaction}</Link></td>
                      <td className="px-4 py-3">{recordLink(data.peopleRecordType?.id, row.performedById, row.performedBy)}</td>
                      <td className="px-4 py-3">{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-4 text-sm text-neutral-500">No transactions have been recorded for this task.</p>}
        </Panel>
      ) : null}
      {selectedTab === "transactions" && data.recordType.key === "item" ? (
        <Panel className="overflow-hidden">
          {data.itemTransactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Timestamp</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Transaction</th><th className="px-4 py-3 font-semibold">Summary</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.itemTransactions.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-4 py-3">{shortDateTime(row.timestamp)}</td>
                      <td className="px-4 py-3">{row.type}</td>
                      <td className="px-4 py-3"><Link href={row.href} className="font-medium underline">{row.transaction}</Link></td>
                      <td className="px-4 py-3">{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-4 text-sm text-neutral-500">No transactions have been recorded for this item.</p>}
        </Panel>
      ) : null}
      {selectedTab === "loans" && data.recordType.key === "people" ? (
        <Panel className="overflow-hidden">
          {data.peopleLoans?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Loan Date</th><th className="px-4 py-3 font-semibold">Expected Return</th><th className="px-4 py-3 font-semibold">Actual Return</th><th className="px-4 py-3 font-semibold">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.peopleLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="px-4 py-3 font-medium">{recordLink(data.itemRecordType?.id, loan.itemId, loan.item.name)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${loan.actualReturnDate ? "bg-neutral-100 text-neutral-700" : "bg-amber-100 text-amber-800"}`}>
                          {loan.actualReturnDate ? "Returned" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{shortDate(loan.loanDate)}</td>
                      <td className="px-4 py-3">{loan.expectedReturnDate ? shortDate(loan.expectedReturnDate) : "None"}</td>
                      <td className="px-4 py-3">{loan.actualReturnDate ? shortDate(loan.actualReturnDate) : "Not returned"}</td>
                      <td className="px-4 py-3">
                        {!loan.actualReturnDate ? (
                          <ReturnLoanForm loanId={loan.id} />
                        ) : (
                          <Link href={`/events/loan/${loan.id}`} className="text-xs text-neutral-600 hover:underline">View details</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-4 text-sm text-neutral-500">No loan records for this person.</p>}
        </Panel>
      ) : null}
      {selectedTab === "files" ? (
        <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.recordType.id} targetRecordId={recordId} />
      ) : null}
    </div>
  );
}

export default async function ConcreteRecordPage({ params, searchParams }: { params: Promise<{ id: string; recordId: string }>; searchParams: Promise<{ mode?: string; tab?: string; taskTab?: string; targetRecordTypeId?: string; targetRecordId?: string; password?: string; pin?: string }> }) {
  const { id, recordId } = await params;
  const { mode, tab, taskTab, targetRecordTypeId, targetRecordId, password, pin } = await searchParams;
  const isNew = recordId === "new";
  const pageMode = isNew ? "new" : mode === "edit" ? "edit" : "view";
  const data = await getConcreteRecordPageData(id, isNew ? undefined : recordId, { mode: pageMode, tab, taskTab });
  const title = isNew ? `New ${data.recordType.name}` : data.recordType.name;
  const isAdmin = data.user.role === "ADMINISTRATOR";
  const canWriteRecords = !data.recordType.editableRecords || isAdmin;
  const href = `/records/${id}/${recordId}`;
  const recordLabel = isNew ? title : String(value(data.record, "name") || value(data.record, "title") || title);
  const favorites = isNew ? [] : await getFavorites(data.user.householdId, data.user.id);
  const favorite = favorites.some((item) => item.href === href);
  const editAction = !isNew && pageMode === "view" && canWriteRecords ? <Link href={`${href}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link> : !isNew && pageMode !== "view" ? <Link href={href} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link> : null;
  return (
    <>
      <PageHeader
        title={title}
        eyebrow="Record"
        icon={data.recordType.icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-stone-100"><RecordIcon name={data.recordType.icon} /></span> : null}
        action={!isNew ? <div className="flex gap-2"><FavoriteToggle href={href} label={recordLabel} active={favorite} />{editAction}</div> : editAction}
      />
      {!isNew && pageMode === "view" ? <RecentRecordTracker href={href} label={recordLabel} /> : null}
      <Panel className="p-4">
        {pageMode === "view" || !canWriteRecords ? <ConcreteRecordView data={data} /> : <ConcreteRecordForm data={data} mode={pageMode} target={{ recordTypeId: targetRecordTypeId, recordId: targetRecordId }} />}
      </Panel>
      {!isNew && pageMode === "view" ? (
        <AdminPeopleCredentialsPanel
          data={data}
          recordId={recordId}
          baseHref={`/records/${id}/${recordId}`}
          updatedPassword={password === "updated"}
          updatedPin={pin === "updated"}
          removedPin={pin === "removed"}
        />
      ) : null}
      {!isNew && pageMode === "view" ? <RecordSubtabs data={data} activeTab={tab ?? ""} taskTab={taskTab ?? "tasks"} baseHref={`/records/${id}/${recordId}`} recordId={recordId} /> : null}
      {!isNew && canWriteRecords ? (
        <form action={deleteConcreteRecord} className="mt-4">
          <input type="hidden" name="recordTypeId" value={id} />
          <input type="hidden" name="id" value={recordId} />
          <SubmitButton variant="danger" pendingLabel="Deleting record...">Delete record</SubmitButton>
        </form>
      ) : null}
    </>
  );
}
