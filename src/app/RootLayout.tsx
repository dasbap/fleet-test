import { Outlet } from "react-router-dom";
import { AuthFlowProvider } from "@/hooks/AuthFlowProvider";

export function RootLayout() {
  return (
    <AuthFlowProvider>
      <Outlet />
    </AuthFlowProvider>
  );
}
