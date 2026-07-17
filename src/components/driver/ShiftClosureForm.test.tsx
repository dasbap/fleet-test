import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ShiftClosureForm from "./ShiftClosureForm";

const closeShiftMock = vi.hoisted(() => vi.fn());
const completeStepMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useDriverShifts", () => ({
  useCloseShift: () => ({
    mutateAsync: closeShiftMock,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => ({
    completeStep: completeStepMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("./ProofUpload", () => ({
  default: ({
    proofValue,
    onProofValueChange,
    onProofFileChange,
  }: {
    proofValue: string;
    onProofValueChange: (value: string) => void;
    onProofFileChange: (file: File | null) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          onProofFileChange(null);
          onProofValueChange("data:image/jpeg;base64,captured-proof");
        }}
      >
        Capturer preuve
      </button>
      {proofValue ? <span data-testid="proof-value">{proofValue}</span> : null}
    </div>
  ),
}));

describe("ShiftClosureForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    closeShiftMock.mockResolvedValue(undefined);
    completeStepMock.mockResolvedValue(undefined);
  });

  it("soumet une preuve photo capturee en data URL sans fichier temporaire", async () => {
    render(<ShiftClosureForm shiftId="shift-1" kmStart={1000} successRedirect="/terrain" />);

    fireEvent.change(screen.getByLabelText(/KM/i), { target: { value: "1120" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "15000" } });
    fireEvent.click(screen.getByRole("button", { name: /Capturer preuve/i }));
    fireEvent.click(screen.getByRole("button", { name: /Soumettre/i }));

    await waitFor(() => {
      expect(closeShiftMock).toHaveBeenCalledWith({
        shift_id: "shift-1",
        km_end: 1120,
        revenue_declared: 15000,
        collection_mode: "cash",
        proof_type: "photo",
        proof_value: "data:image/jpeg;base64,captured-proof",
      });
    });
    expect(navigateMock).toHaveBeenCalledWith("/terrain");
  });

  it("restaure le brouillon apres un retour camera mobile", async () => {
    const firstRender = render(<ShiftClosureForm shiftId="shift-1" kmStart={1000} successRedirect="/terrain" />);

    fireEvent.change(screen.getByLabelText(/KM/i), { target: { value: "1120" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "15000" } });
    fireEvent.click(screen.getByRole("button", { name: /Capturer preuve/i }));

    await screen.findByTestId("proof-value");
    firstRender.unmount();

    render(<ShiftClosureForm shiftId="shift-1" kmStart={1000} successRedirect="/terrain" />);

    expect(screen.getByLabelText(/KM/i)).toHaveValue(1120);
    expect(screen.getByPlaceholderText("0")).toHaveValue(15000);
    expect(screen.getByTestId("proof-value")).toHaveTextContent("captured-proof");

    fireEvent.click(screen.getByRole("button", { name: /Soumettre/i }));

    await waitFor(() => {
      expect(closeShiftMock).toHaveBeenCalledWith({
        shift_id: "shift-1",
        km_end: 1120,
        revenue_declared: 15000,
        collection_mode: "cash",
        proof_type: "photo",
        proof_value: "data:image/jpeg;base64,captured-proof",
      });
    });
  });
});
