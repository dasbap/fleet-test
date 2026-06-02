// E-Samba — Centre d'aide contextuel complet
//
// Composants exportés :
//   <HelpBubble />        Bouton flottant (bottom-right)
//   <HelpPanel />         Sheet latéral complet (shadcn-ui Sheet)
//   <HelpFAQ />           Accordéon FAQ inline dans une page
//   <HelpSearch />        Barre de recherche standalone
//   <HelpVideoCard />     Carte vidéo courte avec aperçu thumbnail

import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { HelpArticle, HelpCategory } from "@/hooks/useHelp";
import { useHelpContext as useHelp } from "@/context/useHelpContext";

function IconHelp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M8 8a2 2 0 114 0c0 1.1-.9 1.7-1.6 2.2-.4.3-.4.8-.4.8" />
      <circle
        cx="10"
        cy="14.5"
        r=".5"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M17 17l-3.5-3.5" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 3.5l8 4.5-8 4.5V3.5z" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.846L0 24l6.335-1.508A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.492-5.18-1.352l-.37-.222-3.762.895.946-3.668-.243-.38A9.936 9.936 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  dashboard: "📊",
  fleet: "🚗",
  creneau: "🟢",
  maintenance: "🔧",
  alerts: "🔔",
  reports: "📄",
  account: "👥",
  offline: "📡",
};

interface HelpVideoCardProps {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  href: string;
  onPlay: () => void;
}

function HelpVideoCard({
  title,
  thumbnailUrl,
  duration,
  onPlay,
}: HelpVideoCardProps) {
  const { t } = useTranslation("help");
  const mins = Math.ceil(duration / 60);

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group w-full text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors duration-150"
      aria-label={`${t("video_watch")}: ${title}`}
    >
      <div
        className="relative w-full bg-muted"
        style={{ aspectRatio: "16/9" }}
      >
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(event) => {
            const target = event.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <IconPlay className="w-4 h-4 text-foreground ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {t("video_duration", { duration: mins })}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
          {title}
        </p>
      </div>
    </button>
  );
}

interface HelpArticleItemProps {
  article: HelpArticle;
  query?: string;
}

function HelpArticleItem({ article, query }: HelpArticleItemProps) {
  const { t } = useTranslation("help");
  const navigate = useNavigate();
  const question = article.questionText ?? t(article.questionKey);
  const answer = article.answerText ?? t(article.answerKey);
  const emoji = CATEGORY_EMOJI[article.category];

  function highlight(text: string) {
    if (!query?.trim()) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeQuery})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-brand/20 text-brand rounded-[2px] px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  return (
    <AccordionItem
      value={article.id}
      className="border-b border-border last:border-0"
    >
      <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline hover:text-primary transition-colors py-3 gap-2 [&>svg]:text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="text-base flex-shrink-0" aria-hidden="true">
            {emoji}
          </span>
          <span>{highlight(String(question))}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {answer}
        </p>

        {article.videoId && article.videoDuration && (
          <button
            type="button"
            onClick={() => navigate(`/aide/videos/${article.videoId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <IconPlay className="w-3 h-3" />
            <span>
              {t("video_watch")} (
              {t("video_duration", {
                duration: Math.ceil(article.videoDuration / 60),
              })}
              )
            </span>
          </button>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function HelpPanelInternal() {
  const { t } = useTranslation("help");
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    isOpen,
    closeHelp,
    contextualArticles,
    featuredVideos,
    searchQuery,
    setSearchQuery,
    searchResults,
    expandedId,
    toggleArticle,
    currentPage,
  } = useHelp();

  useEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const showSearch = searchQuery.trim().length >= 2;
  const displayedArticles = showSearch ? searchResults : contextualArticles;

  return (
    <Sheet open={isOpen} onOpenChange={(value) => !value && closeHelp()}>
      <SheetContent
        side="right"
        data-testid="help-center-panel"
        className="w-[380px] sm:w-[420px] p-0 flex flex-col bg-background border-border text-foreground"
      >
        <SheetHeader className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <IconHelp className="w-4 h-4 text-primary" />
              {t("title")}
            </SheetTitle>
            <button
              type="button"
              onClick={closeHelp}
              aria-label={t("bubble_close")}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mt-2">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 bg-muted border-input focus-visible:ring-primary/30 text-sm h-9"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label="Effacer la recherche"
              >
                <IconClose className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-6">
            {showSearch && (
              <section>
                {searchResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {searchResults.length} résultat
                      {searchResults.length > 1 ? "s" : ""}
                    </p>
                    <Accordion type="single" collapsible>
                      {searchResults.map((article) => (
                        <HelpArticleItem
                          key={article.id}
                          article={article}
                          query={searchQuery}
                        />
                      ))}
                    </Accordion>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("search_empty", { query: searchQuery })}
                    </p>
                  </div>
                )}
              </section>
            )}

            {!showSearch && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("faq_title")}
                      {currentPage && (
                        <span className="ml-2">
                          {CATEGORY_EMOJI[currentPage]}
                        </span>
                      )}
                    </h3>
                  </div>

                  {displayedArticles.length > 0 ? (
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedId ?? undefined}
                      onValueChange={(value) =>
                        toggleArticle(value || null)
                      }
                    >
                      {displayedArticles.map((article) => (
                        <HelpArticleItem
                          key={article.id}
                          article={article}
                        />
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t("faq_empty")}
                    </p>
                  )}
                </section>

                <Separator />

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("video_watch")}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {featuredVideos.map((video) => (
                      <HelpVideoCard
                        key={video.id}
                        videoId={video.id}
                        title={t(video.titleKey)}
                        thumbnailUrl={video.thumbnailUrl}
                        duration={video.duration}
                        href={video.href}
                        onPlay={() => navigate(video.href)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/aide/videos");
                      closeHelp();
                    }}
                    className="mt-3 text-xs text-primary hover:underline w-full text-center"
                  >
                    {t("view_all")} →
                  </button>
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => {
              window.open(
                "https://wa.me/237641341857?text=Bonjour E-Samba, j'ai besoin d'aide",
                "_blank",
              );
            }}
          >
            <IconWhatsApp className="w-4 h-4" />
            {t("contact_whatsapp")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground text-xs"
            onClick={() => {
              window.location.href = "mailto:support@e-samba.com";
            }}
          >
            {t("contact_support")} — support@e-samba.com
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface HelpBubbleProps {
  /** Si false (ex. plan gratuit), masque l’assistant contextuel. */
  disabled?: boolean;
}

export function HelpBubble({ disabled = false }: HelpBubbleProps) {
  const { t } = useTranslation("help");
  const { isOpen, toggleHelp } = useHelp();

  if (disabled) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {!isOpen && (
          <span className="hidden group-hover:block text-xs font-medium bg-popover text-popover-foreground px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none border border-border">
            {t("bubble_tooltip")}
          </span>
        )}

        <button
          type="button"
          onClick={toggleHelp}
          data-testid="help-bubble-button"
          aria-label={isOpen ? t("bubble_close") : t("bubble_tooltip")}
          aria-expanded={isOpen}
          className={cn(
            "group w-12 h-12 rounded-full flex items-center justify-center",
            "shadow-lg shadow-brand/25 hover:shadow-brand/40",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            isOpen
              ? "bg-muted"
              : "bg-primary hover:bg-primary/90",
          )}
        >
          {isOpen ? (
            <IconClose className="w-5 h-5 text-foreground" />
          ) : (
            <IconHelp className="w-5 h-5 text-primary-foreground" />
          )}
        </button>
      </div>

      <HelpPanelInternal />
    </>
  );
}

interface HelpFAQProps {
  maxItems?: number;
  className?: string;
  /** Masque le titre interne lorsque la page parente affiche déjà un en-tête de section. */
  hideTitle?: boolean;
}

export function HelpFAQ({ maxItems = 4, className, hideTitle = false }: HelpFAQProps) {
  const { t } = useTranslation("help");
  const { contextualArticles, expandedId, toggleArticle, currentPage } =
    useHelp();

  const articles = contextualArticles.slice(0, maxItems);

  if (articles.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        className,
      )}
      aria-label="Questions fréquentes"
    >
      {!hideTitle && (
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <IconHelp className="w-4 h-4 text-primary" />
          {t("faq_title")}
          {currentPage && (
            <Badge variant="secondary" className="ml-auto text-[10px] font-medium">
              {CATEGORY_EMOJI[currentPage]} {t(`category_${currentPage}`)}
            </Badge>
          )}
        </h2>
      )}

      <Accordion
        type="single"
        collapsible
        value={expandedId ?? undefined}
        onValueChange={(value) => toggleArticle(value || null)}
      >
        {articles.map((article) => (
          <HelpArticleItem key={article.id} article={article} />
        ))}
      </Accordion>
    </aside>
  );
}

interface HelpSearchProps {
  className?: string;
  autoFocus?: boolean;
}

export function HelpSearch({ className, autoFocus }: HelpSearchProps) {
  const { t } = useTranslation("help");
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    expandedId,
    toggleArticle,
  } = useHelp();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("search_placeholder")}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10 h-11 text-sm"
          autoComplete="off"
        />
      </div>

      {searchQuery.trim().length >= 2 && (
        <div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("search_empty", { query: searchQuery })}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {searchResults.length} résultat
                {searchResults.length > 1 ? "s" : ""}
              </p>
              <Accordion
                type="single"
                collapsible
                value={expandedId ?? undefined}
                onValueChange={(value) => toggleArticle(value || null)}
              >
                {searchResults.map((article) => (
                  <HelpArticleItem
                    key={article.id}
                    article={article}
                    query={searchQuery}
                  />
                ))}
              </Accordion>
            </>
          )}
        </div>
      )}
    </div>
  );
}

