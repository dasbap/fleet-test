import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProofUpload from "./ProofUpload";

function renderProofUpload() {
  const onProofFileChange = vi.fn();

  const view = render(
    <ProofUpload
      proofType="photo"
      onProofTypeChange={vi.fn()}
      proofValue=""
      onProofValueChange={vi.fn()}
      proofFile={null}
      onProofFileChange={onProofFileChange}
    />,
  );

  return { ...view, onProofFileChange };
}

describe("ProofUpload", () => {
  it("affiche un apercu quand la preuve photo vient d'un fichier image sans type MIME", async () => {
    const { container, onProofFileChange, rerender } = renderProofUpload();
    const input = container.querySelector('input[type="file"]');
    const file = new File(["preuve"], "preuve-recette.jpg", { type: "" });

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

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
    await waitFor(() => expect(preview).toHaveAttribute("src", expect.stringMatching(/^data:image\/jpeg/)));
  });
});
