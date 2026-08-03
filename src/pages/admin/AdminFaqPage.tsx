import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FilePenLine, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminFaqEntries, useSaveFaqArticle } from "@/hooks/useHelpArticles";
import type { HelpArticleRecord } from "@/types/help";

type FaqDraft = {
  id?: string;
  slug: string;
  title: string;
  content: string;
  sort_order: number;
  is_published: boolean;
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toDraft(article?: HelpArticleRecord): FaqDraft {
  return {
    id: article?.id,
    slug: article?.slug ?? "",
    title: article?.title ?? "",
    content: article?.content ?? "",
    sort_order: article?.sort_order ?? 0,
    is_published: article?.is_published ?? true,
  };
}

export default function AdminFaqPage() {
  const { data: articles = [], isLoading } = useAdminFaqEntries();
  const saveFaq = useSaveFaqArticle();
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const selectedArticle = articles.find((article) => article.id === selectedId);
  const [draft, setDraft] = useState<FaqDraft>(() => toDraft());

  const orderedArticles = useMemo(
    () => [...articles].sort((a, b) => a.sort_order - b.sort_order),
    [articles],
  );

  function selectArticle(article: HelpArticleRecord) {
    setSelectedId(article.id);
    setDraft(toDraft(article));
  }

  function startNewArticle() {
    setSelectedId("new");
    setDraft(toDraft());
  }

  function updateDraft<K extends keyof FaqDraft>(key: K, value: FaqDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !current.id) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    const content = draft.content.trim();
    const slug = (draft.slug.trim() || slugify(title)).slice(0, 80);

    if (!title || !content || !slug) return;

    const saved = await saveFaq.mutateAsync({
      id: draft.id,
      slug,
      title,
      content,
      sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 0,
      is_published: draft.is_published,
    });
    setSelectedId(saved.id);
    setDraft(toDraft(saved));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            FAQ publique
          </Badge>
          <h1 className="font-heading text-2xl font-semibold">
            Modifier la FAQ
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Les questions affichées sur le site public sont sauvegardées dans
            Supabase et restent disponibles après chaque build.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={startNewArticle}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Nouvelle question
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePenLine className="h-4 w-4" aria-hidden />
              Questions en base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : orderedArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune question FAQ en base pour le moment.
              </p>
            ) : (
              orderedArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="w-full rounded-md border px-3 py-3 text-left text-sm transition-colors hover:bg-muted/40 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                  data-active={article.id === selectedId}
                  onClick={() => selectArticle(article)}
                >
                  <span className="block font-medium">{article.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Ordre {article.sort_order} · {article.is_published ? "publiee" : "masquee"}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedArticle ? "Edition de la question" : "Nouvelle question"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="faq-title">Question</Label>
                <Input
                  id="faq-title"
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-content">Réponse</Label>
                <Textarea
                  id="faq-content"
                  value={draft.content}
                  onChange={(event) => updateDraft("content", event.target.value)}
                  rows={7}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="grid gap-2">
                  <Label htmlFor="faq-slug">Slug</Label>
                  <Input
                    id="faq-slug"
                    value={draft.slug}
                    onChange={(event) => updateDraft("slug", slugify(event.target.value))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="faq-order">Ordre</Label>
                  <Input
                    id="faq-order"
                    type="number"
                    value={draft.sort_order}
                    onChange={(event) =>
                      updateDraft("sort_order", Number(event.target.value))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-3">
                <Label htmlFor="faq-published" className="text-sm">
                  Visible sur le site public
                </Label>
                <Switch
                  id="faq-published"
                  checked={draft.is_published}
                  onCheckedChange={(checked) => updateDraft("is_published", checked)}
                />
              </div>
              <Button
                type="submit"
                disabled={saveFaq.isPending || !draft.title.trim() || !draft.content.trim()}
              >
                <Save className="mr-2 h-4 w-4" aria-hidden />
                {saveFaq.isPending ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
