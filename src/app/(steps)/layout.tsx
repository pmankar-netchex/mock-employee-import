import { Stepper } from "@/components/Stepper";
import { WorkflowProvider } from "@/context/WorkflowContext";

export default function StepsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkflowProvider>
      <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
        <Stepper />
        <main className="flex-1 min-w-0 overflow-x-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </WorkflowProvider>
  );
}
