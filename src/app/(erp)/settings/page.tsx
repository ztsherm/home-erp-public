import { CurrentPeopleForm, PasswordForm, PinForm } from "@/components/forms";
import { PageHeader, Panel } from "@/components/shell";
import { getSettingsPageData } from "@/features/inventory/queries";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ password?: string; pin?: string }> }) {
  const params = await searchParams;
  const { person, household, user } = await getSettingsPageData();
  return (
    <>
      <PageHeader title="Settings" eyebrow="Account and household" />
      <div className="grid gap-4">
        <Panel className="p-4">
          <h2 className="font-semibold">Household</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Name</dt><dd className="font-medium">{household.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Timezone</dt><dd className="font-medium">{household.timezone}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Signed in as</dt><dd className="font-medium">{user.email}</dd></div>
          </dl>
        </Panel>
        <CurrentPeopleForm person={person} />
        <PinForm hasPin={Boolean(person.pin)} updated={params.pin === "updated"} removed={params.pin === "removed"} />
        <PasswordForm updated={params.password === "updated"} />
      </div>
    </>
  );
}
