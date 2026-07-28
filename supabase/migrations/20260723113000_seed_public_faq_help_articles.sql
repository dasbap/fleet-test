-- Public FAQ content lives in help_articles so admin edits survive rebuilds.

insert into public.help_articles (
  slug,
  title,
  category,
  role,
  locale,
  keywords,
  content,
  route_context,
  sort_order,
  is_published
)
values
  (
    'public-faq-a-qui-s-adresse-e-samba',
    'A qui s''adresse E-Samba ?',
    'faq',
    '{}',
    'fr',
    array['flotte', 'equipe', 'terrain'],
    'E-Samba s''adresse aux proprietaires, gestionnaires et equipes terrain qui veulent mieux suivre leurs vehicules, leurs conducteurs et leurs operations sans multiplier les fichiers, appels et messages disperses.',
    array['/faq'],
    1,
    true
  ),
  (
    'public-faq-suivi-e-samba',
    'Qu''est-ce que je peux suivre avec E-Samba ?',
    'faq',
    '{}',
    'fr',
    array['vehicules', 'alertes', 'carburant', 'entretien'],
    'Vous gardez une vue claire sur les vehicules, les equipes, les alertes, le carburant, l''entretien et les principaux mouvements financiers. Le site reste volontairement general : la demo permet de voir ce qui correspond a votre organisation.',
    array['/faq'],
    2,
    true
  ),
  (
    'public-faq-afrique-centrale',
    'Est-ce adapte aux flottes en Afrique centrale ?',
    'faq',
    '{}',
    'fr',
    array['afrique centrale', 'connectivite', 'terrain'],
    'Oui. E-Samba est pense pour les usages de terrain en Afrique centrale : plusieurs pays, plusieurs equipes, connectivite variable et besoin de decisions rapides au quotidien.',
    array['/faq'],
    3,
    true
  ),
  (
    'public-faq-temps-demarrage',
    'Combien de temps faut-il pour demarrer ?',
    'faq',
    '{}',
    'fr',
    array['demarrage', 'mise en route'],
    'Le demarrage peut etre rapide sur une petite flotte. Pour une organisation plus large, l''equipe vous accompagne afin de cadrer les vehicules, les roles et les priorites avant la mise en route.',
    array['/faq'],
    4,
    true
  ),
  (
    'public-faq-petite-flotte',
    'Puis-je commencer avec une petite flotte ?',
    'faq',
    '{}',
    'fr',
    array['petite flotte', 'progressif'],
    'Oui. Vous pouvez commencer avec quelques vehicules, valider l''interet pour votre equipe, puis elargir progressivement quand les usages sont clairs.',
    array['/faq'],
    5,
    true
  ),
  (
    'public-faq-mise-en-place',
    'Comment se deroule la mise en place ?',
    'faq',
    '{}',
    'fr',
    array['contact', 'demo', 'organisation'],
    'Apres votre demande, l''equipe prend contact pour comprendre votre flotte, votre zone d''activite, vos contraintes terrain et vos objectifs. La mise en place est adaptee a votre contexte plutot qu''a un parcours generique.',
    array['/faq'],
    6,
    true
  ),
  (
    'public-faq-donnees-protegees',
    'Mes donnees restent-elles protegees ?',
    'faq',
    '{}',
    'fr',
    array['donnees', 'securite', 'roles'],
    'Oui. L''acces aux informations est encadre par role et par organisation. Les donnees de votre flotte ne sont pas exposees aux autres clients, et les informations sensibles restent limitees aux personnes autorisees.',
    array['/faq'],
    7,
    true
  ),
  (
    'public-faq-demander-demo',
    'Comment demander une demo ?',
    'faq',
    '{}',
    'fr',
    array['demo', 'contact', '48h'],
    'Utilisez la page contact et renseignez les informations demandees. L''equipe commerciale revient vers vous pour qualifier votre besoin et vous accorder un compte sous 48h.',
    array['/faq'],
    8,
    true
  )
on conflict (slug, locale) do update
set
  title = excluded.title,
  category = excluded.category,
  role = excluded.role,
  keywords = excluded.keywords,
  content = excluded.content,
  route_context = excluded.route_context,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();
