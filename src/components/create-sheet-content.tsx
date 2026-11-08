"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, ClipboardPlus, Drill, FileText, Handshake, Home, MapPinned, PackagePlus, Repeat2, ShoppingCart, X } from "lucide-react";
import { RecordIcon } from "@/components/record-icon";
import { WorkflowProvider } from "@/components/workflow-form";
import { AreaForm, ConsumptionForm, FileForm, ItemForm, LoanForm, LocationForm, MaintenanceForm, PeopleForm, PutawayForm, RoomForm, TaskForm, TaskScheduleForm, TransferForm } from "@/components/forms";

type CreateData = Awaited<ReturnType<typeof import("@/features/inventory/queries").getShellCreateData>>;
type CreateAction = { id: string; label: string; group: "Transactions" | "Records"; description: string; icon?: string | null; form: React.ReactNode };

const iconById: Record<string, React.ComponentType<{ className?: string }>> = { putaway: PackagePlus, transfer: Repeat2, consumption: ShoppingCart, maintenance: Drill, loan: Handshake, item: Boxes, file: FileText, location: Home, room: MapPinned, area: ClipboardPlus };

function buildActions(data: CreateData): CreateAction[] {
  const areas = data.areas.map((area) => ({ id: area.id, name: `${area.location.name} / ${area.room.name} / ${area.name}` }));
  const rooms = data.rooms.map((room) => ({ id: room.id, name: `${room.location.name} / ${room.name}` }));
  const itemLocations = data.itemLocations.map((row) => ({ id: row.id, itemId: row.itemId, name: row.item.name, quantity: row.quantity, path: `${row.location.name} / ${row.room.name} / ${row.area.name}` }));
  const publicTypes = new Map(data.creatableRecordTypes.filter((type) => !type.editableRecords).map((type) => [type.key, type]));
  const fileType = publicTypes.get("file");
  const forms = new Map<string, React.ReactNode>([
    ["item", <ItemForm key="item" items={data.items} />], ["location", <LocationForm key="location" />], ["room", <RoomForm key="room" locations={data.locations} />], ["area", <AreaForm key="area" rooms={rooms} />],
    ...(fileType ? [["file", <FileForm key="file" recordTypeId={fileType.id} recordTypes={data.attachableRecordTypes} />] as const] : []),
    ...(publicTypes.get("people") ? [["people", <PeopleForm key="people" recordTypeId={publicTypes.get("people")!.id} />] as const] : []),
    ...(publicTypes.get("task_schedule") ? [["task_schedule", <TaskScheduleForm key="task_schedule" recordTypeId={publicTypes.get("task_schedule")!.id} people={data.taskAssignees} />] as const] : []),
    ...(publicTypes.get("task") ? [["task", <TaskForm key="task" recordTypeId={publicTypes.get("task")!.id} items={data.items} people={data.taskAssignees} schedules={data.taskSchedules} />] as const] : []),
  ]);
  const records = data.creatableRecordTypes.filter((type) => !type.editableRecords).map((type) => ({ id: type.key, label: type.name, group: "Records" as const, description: type.description ?? `Create ${type.name.toLowerCase()}.`, icon: type.icon, form: forms.get(type.key) })).filter((action): action is typeof action & { form: React.ReactNode } => Boolean(action.form));
  return [
    { id: "putaway", label: "Item putaway", group: "Transactions", description: "Add item quantity into an area.", form: <PutawayForm items={data.items} areas={areas} rooms={rooms} /> },
    { id: "transfer", label: "Item transfer", group: "Transactions", description: "Move item quantity between areas.", form: <TransferForm items={data.items} areas={areas} rooms={rooms} itemLocations={itemLocations} /> },
    { id: "consumption", label: "Item consumption", group: "Transactions", description: "Remove consumed item quantity from inventory.", form: <ConsumptionForm items={data.items} itemLocations={itemLocations} /> },
    { id: "maintenance", label: "Item maintenance", group: "Transactions", description: "Record service or maintenance against an item.", form: <MaintenanceForm items={data.items} /> },
    { id: "loan", label: "Item loan", group: "Transactions", description: "Lend an item to a person and track return status.", form: <LoanForm items={data.items} people={data.people} /> },
    ...records,
  ];
}

export function CreateSheetContent({ onClose, onComplete }: { onClose: () => void; onComplete: (message: string) => void }) {
  const [data, setData] = useState<CreateData | null>(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch("/api/create-sheet", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setData).catch((reason) => { if (reason?.name !== "AbortError") setError(true); }); return () => controller.abort(); }, []);
  const actions = useMemo(() => data ? buildActions(data) : [], [data]);
  const selected = actions.find((action) => action.id === selectedId);
  return <div className="fixed inset-0 z-50 bg-black/35"><div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-stone-50 p-4 shadow-2xl"><div className="mx-auto max-w-xl">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{selected ? <button type="button" onClick={() => setSelectedId(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white" aria-label="Back to actions"><ArrowLeft className="h-5 w-5" /></button> : null}<div><p className="text-sm text-neutral-500">{selected ? selected.group : "Create"}</p><h2 className="truncate text-xl font-semibold">{selected ? selected.label : "Choose an action"}</h2></div></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white" aria-label="Close"><X className="h-5 w-5" /></button></div>
    {!data && !error ? <div className="grid gap-3" aria-label="Loading create options"><div className="h-16 animate-pulse rounded-lg bg-neutral-200" /><div className="h-16 animate-pulse rounded-lg bg-neutral-200" /><div className="h-16 animate-pulse rounded-lg bg-neutral-200" /></div> : null}
    {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load Create options. Close this sheet and try again.</div> : null}
    {selected ? <WorkflowProvider onComplete={onComplete}>{selected.form}</WorkflowProvider> : data ? <div className="grid gap-5">{(["Transactions", "Records"] as const).map((group) => <section key={group}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{group}</h3><div className="grid gap-2">{actions.filter((action) => action.group === group).map((action) => { const Icon = iconById[action.id] ?? ClipboardPlus; return <button key={action.id} type="button" onClick={() => setSelectedId(action.id)} className="flex min-h-16 items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100">{action.icon ? <RecordIcon name={action.icon} /> : <Icon className="h-5 w-5" />}</span><span><span className="block font-medium">{action.label}</span><span className="block text-sm text-neutral-500">{action.description}</span></span></button>; })}</div></section>)}</div> : null}
  </div></div></div>;
}

