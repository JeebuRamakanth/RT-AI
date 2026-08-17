import { RTEmptyState } from "@/components/ui/RTEmptyState";
import { RTButton } from "@/components/ui/RTButton";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="pt-10">
      <RTEmptyState
        icon="alert"
        title="Page not found"
        message="This path doesn’t exist in your RT AI workspace yet."
        action={
          <Link to="/">
            <RTButton variant="secondary" size="md">
              Back to Home
            </RTButton>
          </Link>
        }
      />
    </div>
  );
}
