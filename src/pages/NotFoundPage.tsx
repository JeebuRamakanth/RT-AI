import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="pt-10">
      <EmptyState
        icon="alert"
        title="Page not found"
        message="This path doesn’t exist in your RT AI workspace yet."
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
