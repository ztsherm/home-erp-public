import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteConsumption, deleteItemLoan, deleteMaintenance, deletePutaway, deleteTransfer, returnItemLoan, updateConsumption, updateItemLoan, updateMaintenance, updatePutaway, updateTransfer } from "@/features/inventory/actions";
import { getEventRecord } from "@/features/inventory/queries";
import { FilesPanel } from "@/components/files-panel";
import { ActivityTable } from "@/components/activity-table";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";
import { shortDate, shortDateTime, transactionRecordName } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-neutral-100 py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-sm text-neutral-950">{value || "None"}</dd>
    </div>
  );
}

function recordLink(recordTypeId: string | null | undefined, recordId: string | null | undefined, label: React.ReactNode) {
  return recordTypeId && recordId ? <Link href={`/records/${recordTypeId}/${recordId}`} className="font-medium underline">{label}</Link> : label;
}

function placePath(
  place: PlacePath,
  recordTypes: { location?: { id: string } | null; room?: { id: string } | null; area?: { id: string } | null },
) {
  return (
    <span>
      {recordLink(recordTypes.location?.id, place.location.id, place.location.name)}
      {" / "}
      {recordLink(recordTypes.room?.id, place.room.id, place.room.name)}
      {" / "}
      {recordLink(recordTypes.area?.id, place.area.id, place.area.name)}
    </span>
  );
}

function DeleteButton({ id, action }: { id: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel="Deleting record...">Delete record</SubmitButton>
    </form>
  );
}

type NamedRecord = { id: string; name: string };
type PlacePath = { location: NamedRecord; room: NamedRecord; area: NamedRecord };
type PutawayRecord = { id: string; itemId: string; areaId: string; performedById: string; transactionNo: number; quantity: unknown; notes: string | null; active: boolean; createdAt: Date; item: { name: string }; itemLocation: PlacePath; performedBy: NamedRecord };
type TransferRecord = { id: string; itemId: string; fromItemLocationId: string; toItemLocation: { areaId: string } & PlacePath; performedById: string; transactionNo: number; quantity: unknown; notes: string | null; active: boolean; createdAt: Date; item: { name: string }; fromItemLocation: PlacePath; performedBy: NamedRecord };
type ConsumptionRecord = { id: string; itemId: string; itemLocationId: string; performedById: string; transactionNo: number; quantity: unknown; notes: string | null; active: boolean; createdAt: Date; item: { name: string }; itemLocation: PlacePath; performedBy: NamedRecord };
type MaintenanceRecord = { id: string; itemId: string; performedById: string; transactionNo: number; maintenanceType: string; vendor: string | null; cost: unknown; notes: string | null; nextDueDate: Date | null; active: boolean; createdAt: Date; item: { name: string }; performedBy: NamedRecord; completedTask?: { id: string; title: string } | null };
type LoanRecord = { id: string; itemId: string; borrowerId: string; transactionNo: number; loanDate: Date; expectedReturnDate: Date | null; actualReturnDate: Date | null; conditionNotes: string | null; notes: string | null; active: boolean; createdAt: Date; item: { name: string }; borrower: NamedRecord };
type ActivityRecord = { id: string; action: string; recordType: string; recordId: string; summary: string; details: string; createdAt: Date; people: { name: string } | null };

function RecordTabs({ baseHref, active }: { baseHref: string; active: "details" | "activity" | "files" }) {
  return (
    <div className="mb-4 grid grid-cols-3 rounded-lg border border-neutral-200 bg-white p-1">
      <Link href={baseHref} className={`rounded-md px-3 py-2 text-center text-sm font-medium ${active === "details" ? "bg-neutral-950 text-white" : "text-neutral-600"}`}>Details</Link>
      <Link href={`${baseHref}?tab=activity`} className={`rounded-md px-3 py-2 text-center text-sm font-medium ${active === "activity" ? "bg-neutral-950 text-white" : "text-neutral-600"}`}>Activity</Link>
      <Link href={`${baseHref}?tab=files`} className={`rounded-md px-3 py-2 text-center text-sm font-medium ${active === "files" ? "bg-neutral-950 text-white" : "text-neutral-600"}`}>Files</Link>
    </div>
  );
}

export default async function EventRecordPage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ mode?: string; tab?: string }> }) {
  const { kind, id } = await params;
  const { mode, tab } = await searchParams;
  const editing = mode === "edit";
  const data = await getEventRecord(kind, id, editing);

  if (data.kind === "activity") {
    const activity = data.record as ActivityRecord;
    return (
      <>
        <PageHeader title={`${activity.action.toLowerCase()} activity`} eyebrow="Activity log" action={<Link href="/events?type=ITEM_PUTAWAY%2CITEM_TRANSFER%2CITEM_CONSUMPTION%2CITEM_MAINTENANCE%2CACTIVITY" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Events</Link>} />
        <Panel className="p-4">
          <dl>
            <Row label="Action" value={activity.action.toLowerCase()} />
            <Row label="Record type" value={activity.recordType} />
            <Row label="Record id" value={activity.recordId} />
            <Row label="User" value={activity.people?.name ?? "System"} />
            <Row label="Timestamp" value={shortDateTime(activity.createdAt)} />
            <Row label="Details" value={activity.details} />
          </dl>
        </Panel>
        <Panel className="mt-4 divide-y divide-neutral-100">
          <div className="p-4"><h2 className="text-sm font-semibold">Related activity</h2></div>
          {data.relatedActivity.map((event) => (
            <div key={event.id} className="p-4">
              <p className="text-sm font-medium">{event.action.toLowerCase()}</p>
              <p className="text-sm text-neutral-500">{event.summary} - {event.people?.name ?? "System"} - {shortDateTime(event.createdAt)}</p>
            </div>
          ))}
        </Panel>
      </>
    );
  }

  const canDelete = data.user.role === "ADMINISTRATOR";

  if (data.kind === "putaway") {
    const tx = data.record as PutawayRecord;
    const recordName = transactionRecordName(data.kind, tx.transactionNo);
    const areaOptions = data.options.areas.map((area) => ({ id: area.id, label: `${area.location.name} / ${area.room.name} / ${area.name}` }));
    const activeTab = tab === "activity" ? "activity" : tab === "files" ? "files" : "details";
    const baseHref = `/events/putaway/${tx.id}`;
    const recordTypes = data.linkedRecordTypes;
    return (
      <>
        <PageHeader title={recordName} eyebrow="Item putaway" action={!editing && activeTab === "details" ? <Link href={`${baseHref}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link> : editing ? <Link href={baseHref} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link> : null} />
        <RecordTabs baseHref={baseHref} active={activeTab} />
        {activeTab === "activity" ? <ActivityTable activity={data.activity} /> : activeTab === "files" && data.metadataRecordType ? (
          <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.metadataRecordType.id} targetRecordId={tx.id} />
        ) : editing ? (
          <Panel className="p-4">
            <form action={updatePutaway} className="grid gap-3">
              <input type="hidden" name="id" value={tx.id} />
              <Field label="Item"><select name="itemId" defaultValue={tx.itemId} className={inputClass}>{data.options.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Area"><select name="areaId" defaultValue={tx.areaId} className={inputClass}>{areaOptions.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></Field>
              <Field label="Quantity"><input name="quantity" type="number" min="1" step="1" defaultValue={String(tx.quantity)} className={inputClass} /></Field>
              <Field label="Performed by"><select name="performedById" defaultValue={tx.performedById} className={inputClass}>{data.options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={tx.notes ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={tx.active !== false} />Active</label>
              <SubmitButton pendingLabel="Saving changes...">Save changes</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel className="p-4">
            <dl>
              <Row label="Item" value={recordLink(recordTypes.item?.id, tx.itemId, tx.item.name)} />
              <Row label="Quantity" value={String(tx.quantity)} />
              <Row label="Area" value={placePath(tx.itemLocation, recordTypes)} />
              <Row label="Performed by" value={recordLink(recordTypes.people?.id, tx.performedById, tx.performedBy.name)} />
              <Row label="Date" value={shortDateTime(tx.createdAt)} />
              <Row label="Notes" value={tx.notes} />
            </dl>
          </Panel>
        )}
        {canDelete ? <div className="mt-4"><DeleteButton id={tx.id} action={deletePutaway} /></div> : null}
      </>
    );
  }

  if (data.kind === "transfer") {
    const tx = data.record as TransferRecord;
    const recordName = transactionRecordName(data.kind, tx.transactionNo);
    const areaOptions = data.options.areas.map((area) => ({ id: area.id, label: `${area.location.name} / ${area.room.name} / ${area.name}` }));
    const itemLocationOptions = data.options.itemLocations.some((row) => row.id === tx.fromItemLocationId)
      ? data.options.itemLocations
      : [{ id: tx.fromItemLocationId, item: tx.item, location: tx.fromItemLocation.location, room: tx.fromItemLocation.room, area: tx.fromItemLocation.area, quantity: tx.quantity }, ...data.options.itemLocations];
    const activeTab = tab === "activity" ? "activity" : tab === "files" ? "files" : "details";
    const baseHref = `/events/transfer/${tx.id}`;
    const recordTypes = data.linkedRecordTypes;
    return (
      <>
        <PageHeader title={recordName} eyebrow="Item transfer" action={!editing && activeTab === "details" ? <Link href={`${baseHref}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link> : editing ? <Link href={baseHref} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link> : null} />
        <RecordTabs baseHref={baseHref} active={activeTab} />
        {activeTab === "activity" ? <ActivityTable activity={data.activity} /> : activeTab === "files" && data.metadataRecordType ? (
          <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.metadataRecordType.id} targetRecordId={tx.id} />
        ) : editing ? (
          <Panel className="p-4">
            <form action={updateTransfer} className="grid gap-3">
              <input type="hidden" name="id" value={tx.id} />
              <Field label="From item location"><select name="fromItemLocationId" defaultValue={tx.fromItemLocationId} className={inputClass}>{itemLocationOptions.map((row) => <option key={row.id} value={row.id}>{row.item.name} - {String(row.quantity)} - {row.location.name} / {row.room.name} / {row.area.name}</option>)}</select></Field>
              <Field label="To area"><select name="toAreaId" defaultValue={tx.toItemLocation.areaId} className={inputClass}>{areaOptions.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></Field>
              <Field label="Quantity"><input name="quantity" type="number" min="1" step="1" defaultValue={String(tx.quantity)} className={inputClass} /></Field>
              <Field label="Performed by"><select name="performedById" defaultValue={tx.performedById} className={inputClass}>{data.options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={tx.notes ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={tx.active !== false} />Active</label>
              <SubmitButton pendingLabel="Saving changes...">Save changes</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel className="p-4">
            <dl>
              <Row label="Item" value={recordLink(recordTypes.item?.id, tx.itemId, tx.item.name)} />
              <Row label="Quantity" value={String(tx.quantity)} />
              <Row label="From" value={placePath(tx.fromItemLocation, recordTypes)} />
              <Row label="To" value={placePath(tx.toItemLocation, recordTypes)} />
              <Row label="Performed by" value={recordLink(recordTypes.people?.id, tx.performedById, tx.performedBy.name)} />
              <Row label="Date" value={shortDateTime(tx.createdAt)} />
              <Row label="Notes" value={tx.notes} />
            </dl>
          </Panel>
        )}
        {canDelete ? <div className="mt-4"><DeleteButton id={tx.id} action={deleteTransfer} /></div> : null}
      </>
    );
  }

  if (data.kind === "consumption") {
    const tx = data.record as ConsumptionRecord;
    const recordName = transactionRecordName(data.kind, tx.transactionNo);
    const itemLocationOptions = data.options.itemLocations.some((row) => row.id === tx.itemLocationId)
      ? data.options.itemLocations
      : [{ id: tx.itemLocationId, item: tx.item, location: tx.itemLocation.location, room: tx.itemLocation.room, area: tx.itemLocation.area, quantity: tx.quantity }, ...data.options.itemLocations];
    const activeTab = tab === "activity" ? "activity" : tab === "files" ? "files" : "details";
    const baseHref = `/events/consumption/${tx.id}`;
    const recordTypes = data.linkedRecordTypes;
    return (
      <>
        <PageHeader title={recordName} eyebrow="Item consumption" action={!editing && activeTab === "details" ? <Link href={`${baseHref}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link> : editing ? <Link href={baseHref} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link> : null} />
        <RecordTabs baseHref={baseHref} active={activeTab} />
        {activeTab === "activity" ? <ActivityTable activity={data.activity} /> : activeTab === "files" && data.metadataRecordType ? (
          <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.metadataRecordType.id} targetRecordId={tx.id} />
        ) : editing ? (
          <Panel className="p-4">
            <form action={updateConsumption} className="grid gap-3">
              <input type="hidden" name="id" value={tx.id} />
              <Field label="Item location"><select name="itemLocationId" defaultValue={tx.itemLocationId} className={inputClass}>{itemLocationOptions.map((row) => <option key={row.id} value={row.id}>{row.item.name} - {String(row.quantity)} - {row.location.name} / {row.room.name} / {row.area.name}</option>)}</select></Field>
              <Field label="Quantity"><input name="quantity" type="number" min="1" step="1" defaultValue={String(tx.quantity)} className={inputClass} /></Field>
              <Field label="Performed by"><select name="performedById" defaultValue={tx.performedById} className={inputClass}>{data.options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={tx.notes ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={tx.active !== false} />Active</label>
              <SubmitButton pendingLabel="Saving changes...">Save changes</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel className="p-4">
            <dl>
              <Row label="Item" value={recordLink(recordTypes.item?.id, tx.itemId, tx.item.name)} />
              <Row label="Quantity" value={String(tx.quantity)} />
              <Row label="From" value={placePath(tx.itemLocation, recordTypes)} />
              <Row label="Performed by" value={recordLink(recordTypes.people?.id, tx.performedById, tx.performedBy.name)} />
              <Row label="Date" value={shortDateTime(tx.createdAt)} />
              <Row label="Notes" value={tx.notes} />
            </dl>
          </Panel>
        )}
        {canDelete ? <div className="mt-4"><DeleteButton id={tx.id} action={deleteConsumption} /></div> : null}
      </>
    );
  }

  if (data.kind === "maintenance") {
    const tx = data.record as MaintenanceRecord;
    const recordName = transactionRecordName(data.kind, tx.transactionNo);
    const dueDate = tx.nextDueDate ? tx.nextDueDate.toISOString().slice(0, 10) : "";
    const baseHref = `/events/maintenance/${tx.id}`;
    const recordTypes = data.linkedRecordTypes;
    return (
      <>
        <PageHeader title={recordName} eyebrow="Item maintenance" action={!editing ? <Link href={`${baseHref}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link> : <Link href={baseHref} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link>} />
        {editing ? (
          <Panel className="p-4">
            <form action={updateMaintenance} className="grid gap-3">
              <input type="hidden" name="id" value={tx.id} />
              <Field label="Item"><select name="itemId" defaultValue={tx.itemId} className={inputClass}>{data.options.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Maintenance type"><input name="maintenanceType" required defaultValue={tx.maintenanceType} className={inputClass} /></Field>
              <Field label="Performed by"><select name="performedById" defaultValue={tx.performedById} className={inputClass}>{data.options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
              <Field label="Vendor"><input name="vendor" defaultValue={tx.vendor ?? ""} className={inputClass} /></Field>
              <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={tx.cost ? String(tx.cost) : ""} className={inputClass} /></Field>
              <Field label="Next due date"><input name="nextDueDate" type="date" defaultValue={dueDate} className={inputClass} /></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={tx.notes ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={tx.active !== false} />Active</label>
              <SubmitButton pendingLabel="Saving changes...">Save changes</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel className="p-4">
            <dl>
              <Row label="Item" value={recordLink(recordTypes.item?.id, tx.itemId, tx.item.name)} />
              <Row label="Task" value={tx.completedTask ? recordLink(recordTypes.task?.id ?? data.taskRecordType?.id, tx.completedTask.id, tx.completedTask.title) : null} />
              <Row label="Type" value={tx.maintenanceType} />
              <Row label="Vendor" value={tx.vendor} />
              <Row label="Cost" value={tx.cost ? `$${String(tx.cost)}` : null} />
              <Row label="Next due date" value={tx.nextDueDate ? shortDate(tx.nextDueDate) : null} />
              <Row label="Performed by" value={recordLink(recordTypes.people?.id, tx.performedById, tx.performedBy.name)} />
              <Row label="Date" value={shortDateTime(tx.createdAt)} />
              <Row label="Notes" value={tx.notes} />
            </dl>
          </Panel>
        )}
        <div className="mt-4 grid gap-4">
          <ActivityTable activity={data.activity} />
          {data.metadataRecordType ? <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.metadataRecordType.id} targetRecordId={tx.id} /> : null}
        </div>
        {canDelete ? <div className="mt-4"><DeleteButton id={tx.id} action={deleteMaintenance} /></div> : null}
      </>
    );
  }

  if (data.kind === "loan") {
    const tx = data.record as LoanRecord;
    const recordName = transactionRecordName(data.kind, tx.transactionNo);
    const loanDateStr = tx.loanDate ? tx.loanDate.toISOString().slice(0, 10) : "";
    const expectedReturnDateStr = tx.expectedReturnDate ? tx.expectedReturnDate.toISOString().slice(0, 10) : "";
    const actualReturnDateStr = tx.actualReturnDate ? tx.actualReturnDate.toISOString().slice(0, 10) : "";
    const isReturned = Boolean(tx.actualReturnDate);
    const activeTab = tab === "activity" ? "activity" : tab === "files" ? "files" : "details";
    const baseHref = `/events/loan/${tx.id}`;
    const recordTypes = data.linkedRecordTypes;
    return (
      <>
        <PageHeader
          title={recordName}
          eyebrow="Item loan"
          action={
            <div className="flex items-center gap-2">
              {!isReturned && !editing ? (
                <form action={returnItemLoan}>
                  <input type="hidden" name="id" value={tx.id} />
                  <input type="hidden" name="actualReturnDate" value={new Date().toISOString().slice(0, 10)} />
                  <SubmitButton pendingLabel="Returning..." className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-md font-semibold">
                    Mark returned
                  </SubmitButton>
                </form>
              ) : null}
              {!editing && activeTab === "details" ? (
                <Link href={`${baseHref}?mode=edit`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Edit</Link>
              ) : editing ? (
                <Link href={baseHref} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View</Link>
              ) : null}
            </div>
          }
        />
        <RecordTabs baseHref={baseHref} active={activeTab} />
        {activeTab === "activity" ? <ActivityTable activity={data.activity} /> : activeTab === "files" && data.metadataRecordType ? (
          <FilesPanel files={data.attachedFiles} fileRecordTypeId={data.fileRecordType?.id} targetRecordTypeId={data.metadataRecordType.id} targetRecordId={tx.id} />
        ) : editing ? (
          <Panel className="p-4">
            <form action={updateItemLoan} className="grid gap-3">
              <input type="hidden" name="id" value={tx.id} />
              <Field label="Item"><select name="itemId" defaultValue={tx.itemId} className={inputClass}>{data.options.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Borrower (Person)"><select name="borrowerId" defaultValue={tx.borrowerId} className={inputClass}>{data.options.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
              <Field label="Loan date"><input name="loanDate" type="date" defaultValue={loanDateStr} className={inputClass} /></Field>
              <Field label="Expected return date"><input name="expectedReturnDate" type="date" defaultValue={expectedReturnDateStr} className={inputClass} /></Field>
              <Field label="Actual return date"><input name="actualReturnDate" type="date" defaultValue={actualReturnDateStr} className={inputClass} /></Field>
              <Field label="Condition notes"><input name="conditionNotes" defaultValue={tx.conditionNotes ?? ""} className={inputClass} /></Field>
              <Field label="Notes"><textarea name="notes" defaultValue={tx.notes ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={tx.active !== false} />Active</label>
              <SubmitButton pendingLabel="Saving changes...">Save changes</SubmitButton>
            </form>
          </Panel>
        ) : (
          <Panel className="p-4">
            <dl>
              <Row label="Item" value={recordLink(recordTypes.item?.id, tx.itemId, tx.item.name)} />
              <Row label="Borrower" value={recordLink(recordTypes.people?.id, tx.borrowerId, tx.borrower.name)} />
              <Row label="Status" value={
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isReturned ? "bg-neutral-100 text-neutral-700" : "bg-amber-100 text-amber-800"}`}>
                  {isReturned ? "Returned" : "Active loan"}
                </span>
              } />
              <Row label="Loan date" value={shortDate(tx.loanDate)} />
              <Row label="Expected return" value={tx.expectedReturnDate ? shortDate(tx.expectedReturnDate) : "None specified"} />
              <Row label="Actual return" value={tx.actualReturnDate ? shortDate(tx.actualReturnDate) : "Not yet returned"} />
              <Row label="Condition notes" value={tx.conditionNotes} />
              <Row label="Notes" value={tx.notes} />
              <Row label="Created" value={shortDateTime(tx.createdAt)} />
            </dl>
          </Panel>
        )}
        {canDelete ? <div className="mt-4"><DeleteButton id={tx.id} action={deleteItemLoan} /></div> : null}
      </>
    );
  }
  notFound();
}
