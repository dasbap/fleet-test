/**
 * Tests unitaires pour le composant EvidenceUpload.
 * Vérifient le rendu selon kind/disabled, la grille de preuves, l’aperçu et l’appel à l’upload.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EvidenceUpload from "./EvidenceUpload";

const mockHandleUpload = vi.fn();
const mockCancelPreview = vi.fn();
const mockHandleFileSelect = vi.fn();
const mockHandleUploadZoneKeyDown = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock("@/hooks/useEvidenceUpload", () => ({
  useEvidenceUpload: vi.fn(),
  EVIDENCE_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
}));

vi.mock("@/hooks/useMaintenanceEvidence", () => ({
  useDeleteEvidence: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useSignedStorageUrl", () => ({
  useSignedStorageUrl: (_bucket: string, pathOrUrl: string | null | undefined) => ({
    data:
      pathOrUrl && (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("blob:"))
        ? pathOrUrl
        : pathOrUrl
          ? `https://signed.test/${pathOrUrl}`
          : null,
    isLoading: false,
  }),
}));

const { useEvidenceUpload } = await import("@/hooks/useEvidenceUpload");

const defaultUploadReturn = {
  fileInputRef: { current: null },
  previewUrl: null as string | null,
  handleFileSelect: mockHandleFileSelect,
  handleUpload: mockHandleUpload,
  cancelPreview: mockCancelPreview,
  handleUploadZoneKeyDown: mockHandleUploadZoneKeyDown,
  isUploading: false,
  imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

function renderEvidenceUpload(props: {
  jobId?: string;
  kind?: "before" | "after";
  existingEvidence?: Array<{ id: string; file_path: string; created_at: string }>;
  userId?: string;
  disabled?: boolean;
} = {}) {
  const defaultProps = {
    jobId: "job-1",
    kind: "before" as const,
    existingEvidence: [] as Array<{ id: string; file_path: string; created_at: string }>,
    userId: "user-1",
    disabled: false,
  };
  return render(<EvidenceUpload {...defaultProps} {...props} />);
}

describe("EvidenceUpload", () => {
  beforeEach(() => {
    vi.mocked(useEvidenceUpload).mockReturnValue({ ...defaultUploadReturn });
    mockHandleUpload.mockClear();
    mockCancelPreview.mockClear();
    mockDeleteMutateAsync.mockClear();
  });

  it("affiche le badge et le compteur pour kind avant", () => {
    renderEvidenceUpload({ kind: "before" });
    expect(screen.getByText("Photos Avant")).toBeInTheDocument();
    expect(screen.getByText("0 photo(s)")).toBeInTheDocument();
  });

  it("affiche le badge et le compteur pour kind après", () => {
    renderEvidenceUpload({ kind: "after" });
    expect(screen.getByText("Photos Après")).toBeInTheDocument();
    expect(screen.getByText("0 photo(s)")).toBeInTheDocument();
  });

  it("affiche le nombre de preuves existantes", () => {
    renderEvidenceUpload({
      existingEvidence: [
        { id: "e1", file_path: "https://example.com/1.jpg", created_at: "2024-01-01T00:00:00Z" },
      ],
    });
    expect(screen.getByText("1 photo(s)")).toBeInTheDocument();
    expect(screen.getByAltText(/Preuve Avant,/)).toBeInTheDocument();
  });

  it("affiche le bouton de suppression quand non disabled", () => {
    renderEvidenceUpload({
      existingEvidence: [
        { id: "e1", file_path: "https://example.com/1.jpg", created_at: "2024-01-01T00:00:00Z" },
      ],
      disabled: false,
    });
    expect(screen.getByRole("button", { name: /Supprimer la preuve Avant/ })).toBeInTheDocument();
  });

  it("masque le bouton de suppression quand disabled", () => {
    renderEvidenceUpload({
      existingEvidence: [
        { id: "e1", file_path: "https://example.com/1.jpg", created_at: "2024-01-01T00:00:00Z" },
      ],
      disabled: true,
    });
    expect(screen.queryByRole("button", { name: /Supprimer/ })).not.toBeInTheDocument();
  });

  it("affiche la zone d’ajout avec le bon aria-label", () => {
    renderEvidenceUpload({ kind: "before" });
    const zone = screen.getByRole("button", {
      name: /Ajouter une photo avant\. Cliquez ou utilisez l'appareil photo/,
    });
    expect(zone).toBeInTheDocument();
  });

  it("affiche l’aperçu et le bouton Téléverser quand previewUrl est fourni par le hook", () => {
    vi.mocked(useEvidenceUpload).mockReturnValue({
      ...defaultUploadReturn,
      previewUrl: "blob:https://example.com/preview",
    });
    renderEvidenceUpload({ kind: "after" });
    expect(screen.getByAltText(/Aperçu de la photo Après à téléverser/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Téléverser la photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler et retirer l'aperçu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("appelle handleUpload au clic sur Téléverser", () => {
    vi.mocked(useEvidenceUpload).mockReturnValue({
      ...defaultUploadReturn,
      previewUrl: "blob:test",
    });
    renderEvidenceUpload();
    fireEvent.click(screen.getByRole("button", { name: /Téléverser la photo/ }));
    expect(mockHandleUpload).toHaveBeenCalledTimes(1);
  });

  it("appelle cancelPreview au clic sur Annuler", () => {
    vi.mocked(useEvidenceUpload).mockReturnValue({
      ...defaultUploadReturn,
      previewUrl: "blob:test",
    });
    renderEvidenceUpload();
    const annulerButtons = screen.getAllByRole("button", { name: /Annuler/ });
    fireEvent.click(annulerButtons[annulerButtons.length - 1]);
    expect(mockCancelPreview).toHaveBeenCalledTimes(1);
  });

  it("n’affiche pas la zone d’ajout quand disabled", () => {
    renderEvidenceUpload({ disabled: true });
    expect(
      screen.queryByRole("button", { name: /Ajouter une photo/ })
    ).not.toBeInTheDocument();
  });

  it("appelle onDelete du EvidenceGrid au clic sur supprimer", () => {
    renderEvidenceUpload({
      existingEvidence: [
        { id: "e1", file_path: "https://example.com/1.jpg", created_at: "2024-01-01T00:00:00Z" },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la preuve Avant/ }));
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
      id: "e1",
      file_path: "https://example.com/1.jpg",
      job_id: "job-1",
    });
  });
});
