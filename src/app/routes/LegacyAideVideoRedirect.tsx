import { Navigate, useParams } from "react-router-dom";

/** Ancien lien /aide/videos/:id vers le tutoriel dashboard. */
export function LegacyAideVideoRedirect() {
  const { tutorialId } = useParams<{ tutorialId: string }>();
  if (!tutorialId) {
    return <Navigate to="/dashboard/tutorials" replace />;
  }
  return <Navigate to={`/dashboard/tutorials/${encodeURIComponent(tutorialId)}`} replace />;
}
