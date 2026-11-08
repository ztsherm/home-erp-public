"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { addReportColumn, createReportFilter, removeReportColumn, removeReportFilter, reorderReportColumns, updateReport, updateReportFilter } from "@/features/reports/actions";
import { SubmitButton } from "@/components/submit-button";

type ReportColumn = {
  id: string;
  columnKey: string;
  label: string;
  active: boolean;
};

type ReportFilter = {
  id: string;
  columnKey: string;
  operator: string;
  value: string;
  role: "CRITERIA" | "FILTER";
  active: boolean;
};

type AvailableColumn = {
  key: string;
  label: string;
};

type ReportEditorProps = {
  report: {
    id: string;
    name: string;
    visibility: string;
    columns: ReportColumn[];
    filters: ReportFilter[];
  };
  availableColumns: AvailableColumn[];
};

const operators = [
  { value: "CONTAINS", label: "Contains" },
  { value: "STARTS_WITH", label: "Starts with" },
  { value: "ENDS_WITH", label: "Ends with" },
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Does not equal" },
  { value: "GREATER_THAN", label: "Greater than" },
  { value: "LESS_THAN", label: "Less than" },
  { value: "ON_OR_AFTER", label: "On or after" },
  { value: "ON_OR_BEFORE", label: "On or before" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "IS_EMPTY", label: "Is empty" },
  { value: "IS_NOT_EMPTY", label: "Is not empty" },
];

const tabs = [
  { id: "criteria", label: "Criteria" },
  { id: "columns", label: "Columns" },
  { id: "filters", label: "Filters" },
] as const;

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <label className="grid gap-1.5 text-sm font-medium text-neutral-800"><span>{label}</span>{children}</label>;
}

function ConditionForm({
  filter,
  reportId,
  role,
  availableColumns,
}: Readonly<{
  filter?: ReportFilter;
  reportId: string;
  role: "CRITERIA" | "FILTER";
  availableColumns: AvailableColumn[];
}>) {
  const action = filter ? updateReportFilter : createReportFilter;
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
      <form id={filter ? `report-filter-${filter.id}` : `report-filter-new-${role}`} action={action} className="contents">
      {filter ? <input type="hidden" name="id" value={filter.id} /> : null}
      {!filter ? <input type="hidden" name="reportId" value={reportId} /> : null}
      <input type="hidden" name="role" value={role} />
      <Field label="Field">
        <select name="columnKey" defaultValue={filter?.columnKey} className={inputClass}>
          {availableColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
        </select>
      </Field>
      <Field label="Operator">
        <select name="operator" defaultValue={filter?.operator ?? "CONTAINS"} className={inputClass}>
          {operators.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </Field>
      {role === "CRITERIA" ? <Field label="Value"><input name="value" defaultValue={filter?.value ?? ""} className={inputClass} /></Field> : <input type="hidden" name="value" value="" />}
      <div className="grid gap-2">
        {filter ? (
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
            <input name="active" type="checkbox" defaultChecked={filter.active} />
            Active
          </label>
        ) : null}
        <SubmitButton pendingLabel={filter ? "Saving..." : "Adding..."}>{filter ? "Save" : "Add"}</SubmitButton>
      </div>
      </form>
      {filter ? (
        <form action={removeReportFilter}>
          <input type="hidden" name="id" value={filter.id} />
          <SubmitButton variant="secondary" pendingLabel="..." className="h-10 min-h-10 w-10 p-0 text-neutral-600" ariaLabel={`Remove ${role.toLowerCase()} field`}>
            <Trash2 className="h-4 w-4" />
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export function ReportEditor({ report, availableColumns }: ReportEditorProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("criteria");
  const [columns, setColumns] = useState(report.columns.filter((column) => column.active));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const selectedColumnKeys = new Set(columns.map((column) => column.columnKey));
  const addableColumns = availableColumns.filter((column) => !selectedColumnKeys.has(column.key));
  const criteria = report.filters.filter((filter) => filter.role === "CRITERIA" && filter.active);
  const filters = report.filters.filter((filter) => filter.role === "FILTER" && filter.active);

  function persistColumnOrder(nextColumns: ReportColumn[]) {
    setColumns(nextColumns);
    startTransition(() => {
      reorderReportColumns(report.id, nextColumns.map((column) => column.id));
    });
  }

  function removeColumn(formData: FormData, columnId: string) {
    setColumns((current) => current.filter((column) => column.id !== columnId));
    startTransition(() => {
      removeReportColumn(formData);
    });
  }

  function addColumn(formData: FormData) {
    const columnKey = String(formData.get("columnKey") ?? "");
    const fallback = availableColumns.find((column) => column.key === columnKey);
    startTransition(() => {
      void (async () => {
        const column = await addReportColumn(formData);
        setColumns((current) => {
          if (current.some((existing) => existing.id === column.id)) return current;
          if (current.some((existing) => existing.columnKey === column.columnKey)) {
            return current.map((existing) => (existing.columnKey === column.columnKey ? column : existing));
          }
          return [...current, column];
        });
      })();
    });
    if (fallback) {
      setColumns((current) => {
        if (current.some((existing) => existing.columnKey === fallback.key)) return current;
        return [...current, { id: `pending-${fallback.key}`, columnKey: fallback.key, label: fallback.label, active: true }];
      });
    }
  }

  return (
    <div className="grid gap-4">
      <form id="report-settings-form" action={updateReport} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <input type="hidden" name="id" value={report.id} />
        <Field label="Title"><input name="name" required defaultValue={report.name} className={inputClass} /></Field>
        <Field label="Visibility">
          <select name="visibility" defaultValue={report.visibility} className={inputClass}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </Field>
      </form>

      <div className="grid grid-cols-3 rounded-lg border border-neutral-200 bg-white p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${tab === item.id ? "bg-stone-100 text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-950"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {tab === "criteria" ? (
          <div className="divide-y divide-neutral-100">
            {criteria.map((filter) => <ConditionForm key={filter.id} filter={filter} reportId={report.id} role="CRITERIA" availableColumns={availableColumns} />)}
            <ConditionForm reportId={report.id} role="CRITERIA" availableColumns={availableColumns} />
          </div>
        ) : null}

        {tab === "columns" ? (
          <div>
            <div className="divide-y divide-neutral-100">
              {columns.map((column) => (
                <div
                  key={column.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedId || draggedId === column.id) return;
                    const fromIndex = columnIds.indexOf(draggedId);
                    const toIndex = columnIds.indexOf(column.id);
                    if (fromIndex < 0 || toIndex < 0) return;
                    const nextColumns = [...columns];
                    const [moved] = nextColumns.splice(fromIndex, 1);
                    nextColumns.splice(toIndex, 0, moved);
                    persistColumnOrder(nextColumns);
                    setDraggedId(null);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`flex items-center gap-3 p-4 ${draggedId === column.id ? "bg-stone-50" : ""}`}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDraggedId(column.id)}
                    className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-md border border-neutral-200 bg-white text-neutral-500"
                    aria-label={`Reorder ${column.label}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <p className="min-w-0 flex-1 font-medium text-neutral-950">{column.label}</p>
                  <form
                    action={(formData) => {
                      removeColumn(formData, column.id);
                    }}
                  >
                    <input type="hidden" name="id" value={column.id} />
                    <SubmitButton variant="secondary" pendingLabel="..." className="h-9 min-h-9 w-9 p-0 text-neutral-600" ariaLabel={`Remove ${column.label}`}>
                      <Trash2 className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </div>
              ))}
              {isPending ? <p className="p-3 text-sm text-neutral-500">Saving column order...</p> : null}
              {!columns.length ? <p className="p-4 text-sm text-neutral-500">No columns selected.</p> : null}
            </div>
            {addableColumns.length ? (
              <form action={addColumn} className="grid gap-3 border-t border-neutral-100 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="reportId" value={report.id} />
                <Field label="Add column">
                  <select name="columnKey" className={inputClass}>
                    {addableColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                  </select>
                </Field>
                <SubmitButton pendingLabel="Adding...">Add</SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}

        {tab === "filters" ? (
          <div className="divide-y divide-neutral-100">
            {filters.map((filter) => <ConditionForm key={filter.id} filter={filter} reportId={report.id} role="FILTER" availableColumns={availableColumns} />)}
            <ConditionForm reportId={report.id} role="FILTER" availableColumns={availableColumns} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
