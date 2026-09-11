import RolesHubScreen from "./RolesHubScreen";
import { RoleChangeRequestsPanel } from "../components/RoleChangeRequestsPanel";

export default function RolesHubWithRequests() {
  return (
    <div className="space-y-4">
      <RoleChangeRequestsPanel />
      <RolesHubScreen />
    </div>
  );
}
