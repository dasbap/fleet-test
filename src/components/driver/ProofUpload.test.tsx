import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProofUpload from "./ProofUpload";

describe("ProofUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function () {
      Object.defineProperty(this, "result", {
        configurable: true,
        value: "data:image/jpeg;base64,captured-proof",
      });
      this.onload?.(new ProgressEvent("load"));
    });
  });

  it("enregistre une photo web capturee comme valeur de preuve", async () => {
    const onProofValueChange = vi.fn();
    const onProofFileChange = vi.fn();

    render(
      <ProofUpload
        proofType="photo"
        onProofTypeChange={vi.fn()}
        proofValue=""
        onProofValueChange={onProofValueChange}
        proofFile={null}
        onProofFileChange={onProofFileChange}
      />,
    );

    const file = new File(["photo"], "preuve.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/photo de preuve/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(onProofValueChange).toHaveBeenCalledWith("data:image/jpeg;base64,captured-proof");
    });
    expect(onProofFileChange).toHaveBeenCalledWith(file);
  });

  it("ne vide pas la preuve photo avant la fin de lecture du fichier", () => {
    vi.mocked(FileReader.prototype.readAsDataURL).mockImplementation(() => undefined);
    const onProofValueChange = vi.fn();

    render(
      <ProofUpload
        proofType="photo"
        onProofTypeChange={vi.fn()}
        proofValue="data:image/jpeg;base64,previous-proof"
        onProofValueChange={onProofValueChange}
        proofFile={null}
        onProofFileChange={vi.fn()}
      />,
    );

    const file = new File(["photo"], "preuve.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/photo de preuve/i), {
      target: { files: [file] },
    });

    expect(onProofValueChange).not.toHaveBeenCalledWith("");
  });
});
