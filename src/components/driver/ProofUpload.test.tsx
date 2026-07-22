import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProofUpload from "./ProofUpload";

function mockFileReader(result = "data:image/jpeg;base64,captured-proof") {
  return vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function () {
    Object.defineProperty(this, "result", {
      configurable: true,
      value: result,
    });
    this.onload?.(new ProgressEvent("load"));
  });
}

describe("ProofUpload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enregistre une photo web capturee comme valeur de preuve", async () => {
    mockFileReader();
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
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(() => undefined);
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

  it("affiche un apercu quand la preuve photo vient d'un fichier image sans type MIME", async () => {
    mockFileReader("data:application/octet-stream;base64,captured-proof");
    const onProofFileChange = vi.fn();
    const { rerender } = render(
      <ProofUpload
        proofType="photo"
        onProofTypeChange={vi.fn()}
        proofValue=""
        onProofValueChange={vi.fn()}
        proofFile={null}
        onProofFileChange={onProofFileChange}
      />,
    );
    const file = new File(["preuve"], "preuve-recette.jpg", { type: "" });

    fireEvent.change(screen.getByLabelText(/photo de preuve/i), {
      target: { files: [file] },
    });

    expect(onProofFileChange).toHaveBeenCalledWith(file);

    rerender(
      <ProofUpload
        proofType="photo"
        onProofTypeChange={vi.fn()}
        proofValue=""
        onProofValueChange={vi.fn()}
        proofFile={file}
        onProofFileChange={onProofFileChange}
      />,
    );

    const preview = await screen.findByAltText("Apercu de la preuve photo");
    await waitFor(() => {
      expect(preview).toHaveAttribute("src", "data:image/jpeg;base64,captured-proof");
    });
  });
});
