/**
 * Centre d'aide E-Samba — Page complète.
 *
 * Architecture :
 *   - Barre de recherche locale (bag-of-words, 2G-friendly)
 *   - Tutoriels rapides (accordéons, top 6)
 *   - Guides par rôle (chauffeur / gestionnaire / mécanicien)
 *   - FAQ contextuelle (composants existants)
 *   - Contact WhatsApp support
 *
 * UX : mobile-first, chargement immédiat (tout statique), accessible hors ligne.
 */

import { useState } from 'react';
import { Truck, Wrench, Users, BookOpen, Search, Zap } from 'lucide-react';
import { HelpSearchBar }       from '@/components/help/HelpSearchBar';
import { QuickTutorialCard }   from '@/components/help/QuickTutorialCard';
import { RoleGuideSection }    from '@/component