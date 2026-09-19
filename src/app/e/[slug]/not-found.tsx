import { Panel } from "@/components/shell";

export default function ExamNotFound() {
  return (
    <Panel>
      <h1 className="text-3xl font-semibold tracking-tight">Exam not available</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        This exam is unpublished, outside its availability window, or the link
        is incorrect.
      </p>
    </Panel>
  );
}
