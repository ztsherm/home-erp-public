import { updateWorkflow, runWorkflowNow } from "@/features/workflows/actions";
import { getWorkflowsPageData } from "@/features/workflows/queries";
import { workflowCadenceLabel, workflowScriptLabel } from "@/features/workflows/runtime";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";
import { shortDateTime } from "@/lib/format";

export default async function WorkflowsPage() {
  const { workflows, user } = await getWorkflowsPageData();
  const isAdmin = user.role === "ADMINISTRATOR";
  return (
    <>
      <PageHeader title="Workflows" />
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Panel key={workflow.id} className="overflow-hidden">
            <div className="border-b border-neutral-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{workflow.name}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{workflowScriptLabel(workflow.script)} - {workflowCadenceLabel(workflow.cadence)} - {workflow.active ? "Active" : "Inactive"}</p>
                  <p className="mt-1 text-sm text-neutral-500">Next run: {workflow.nextRunAt ? shortDateTime(workflow.nextRunAt) : "Manual only"}</p>
                  <p className="mt-1 text-sm text-neutral-500">Last run: {workflow.lastRunAt ? `${shortDateTime(workflow.lastRunAt)} - ${workflow.lastStatus?.toLowerCase()}` : "Never"}</p>
                  {workflow.lastSummary ? <p className="mt-2 text-sm text-neutral-700">{workflow.lastSummary}</p> : null}
                </div>
                {isAdmin ? (
                  <form action={runWorkflowNow}>
                    <input type="hidden" name="id" value={workflow.id} />
                    <SubmitButton pendingLabel="Running...">Run now</SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
            {isAdmin ? (
              <form action={updateWorkflow} className="grid gap-3 border-b border-neutral-100 p-4 sm:grid-cols-[1fr_12rem_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={workflow.id} />
                <Field label="Name"><input name="name" defaultValue={workflow.name} className={inputClass} /></Field>
                <Field label="Cadence">
                  <select name="cadence" defaultValue={workflow.cadence} className={inputClass}>
                    <option value="MANUAL">Manual</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </Field>
                <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" name="active" defaultChecked={workflow.active} />Active</label>
                <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
              </form>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-stone-50 text-neutral-500">
                  <tr><th className="px-4 py-3 font-semibold">Started</th><th className="px-4 py-3 font-semibold">Finished</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Summary</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {workflow.runs.map((run) => (
                    <tr key={run.id}>
                      <td className="whitespace-nowrap px-4 py-3">{shortDateTime(run.startedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{run.finishedAt ? shortDateTime(run.finishedAt) : "Running"}</td>
                      <td className="px-4 py-3">{run.status.toLowerCase()}</td>
                      <td className="px-4 py-3">{run.summary ?? run.error ?? "None"}</td>
                    </tr>
                  ))}
                  {!workflow.runs.length ? <tr><td colSpan={4} className="px-4 py-4 text-sm text-neutral-500">No runs yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
