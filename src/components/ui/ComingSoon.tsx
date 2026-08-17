import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

interface ComingSoonProps {
  title: string;
  icon: "spark" | "search" | "image" | "eye" | "mic" | "file" | "code" | "book" | "robot" | "bolt" | "layers" | "knowledge" | "settings";
  description: string;
}

/**
 * Placeholder for future modules. Honest about not being implemented yet —
 * keeps the shell navigable without faking functionality.
 */
export function ComingSoon({ title, icon, description }: ComingSoonProps) {
  return (
    <div className="pt-10">
      <EmptyState
        icon={icon}
        title={`${title} is on the roadmap`}
        message={description}
        action={
          <Link to="/">
            <Button variant="secondary" size="md">
              Back to Home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
