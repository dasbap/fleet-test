import { useMutation } from "@tanstack/react-query";
import { DemoRequestService } from "@/services/demo-request.service";
import { DemoRequestRepository } from "@/repositories/demo-request.repository";

const demoRequestRepository = new DemoRequestRepository();
const demoRequestService = new DemoRequestService(demoRequestRepository);

export type { SubmitDemoRequestInput } from "@/services/demo-request.service";

export function useSubmitDemoRequest() {
  return useMutation({
    mutationFn: (input: Parameters<DemoRequestService["submitRequest"]>[0]) =>
      demoRequestService.submitRequest(input),
  });
}
