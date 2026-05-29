/**
 * Backoffice admin CRUD articles d'aide (v2).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import type { HelpArticleCategory } from '@/types/help';

interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  is_published: boolean;
}

export default function HelpAdminPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<AdminArticle> | null>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-admin-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, slug, title, category, content, is_published')
        .eq('locale', 'fr')
        .order('sort_order');
      if (error) throw new Error(error.message);
      return data as AdminArticle[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (article: Partial<AdminArticle> & { slug: string; title: string; content: string }) => {
      if (article.id) {
        const { error } = await supabase
          .from('help_articles')
          .update({
            title: article.title,
            content: article.content,
            category: article.category,
            is_published: article.is_published ?? true,
          })
          .eq('id', article.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('help_articles').insert({
          slug: article.slug,
          title: article.title,
          content: article.content,
          category: (article.category ?? 'general') as HelpArticleCategory,
          locale: 'fr',
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast({ title: 'Article enregistré' });
      setEditing(null);
    },
    onError: (e: Error) => {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Administration — Centre d&apos;aide</h1>
        <Button size="sm" onClick={() => setEditing({ slug: '', title: '', content: '', category: 'general', is_published: true })}>
          Nouvel article
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{editing.id ? 'Modifier' : 'Créer'} un article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!editing.id && (
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug ?? ''}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Titre</Label>
              <Input
                value={editing.title ?? ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input
                value={editing.category ?? 'general'}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea
                value={editing.content ?? ''}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.is_published ?? true}
                onCheckedChange={(v) => setEditing({ ...editing, is_published: v })}
              />
              <Label>Publié</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              <Button
                onClick={() =>
                  saveMutation.mutate(editing as Parameters<typeof saveMutation.mutate>[0])
                }
                disabled={saveMutation.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Articles FR ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <ul className="space-y-2">
              {articles.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.slug} · {a.category}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    Éditer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
