import { TaskList } from "@/components/task-list";

type PersonOption = { id: string; name: string };
type HomeTask = {
  id: string;
  title: string;
  dueDate: Date;
  assignedToId: string | null;
  item: { name: string };
  assignedTo: { name: string } | null;
};

export function HomeTaskCard({ tasks, people, taskRecordTypeId }: { tasks: HomeTask[]; people: PersonOption[]; taskRecordTypeId?: string }) {
  return (
    <section className="mt-5 rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 p-4">
        <h2 className="font-semibold">Tasks</h2>
      </div>
      <TaskList tasks={tasks} people={people} taskRecordTypeId={taskRecordTypeId} />
    </section>
  );
}
