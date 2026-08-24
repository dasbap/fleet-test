# Serveur TCP GPS E-Samba

## Role

Le site web reste deploye sur Vercel pour les pages et les routes HTTP.
Les boitiers GPS Teltonika FMB920 et Concox se connectent au serveur TCP E-Samba,
qui valide et normalise les trames puis les relaie vers l'API Vercel.

Flux production:

```text
Boitier GPS TCP -> serveur TCP E-Samba:5027 -> POST /api/gps/ingest -> Supabase gps-ingest
```

## Port

- Port TCP officiel: `5027`
- Override possible: `GPS_TCP_PORT`

## Demarrage

```bash
npm run gps:tcp-server
```

Variables requises sur le serveur TCP:

```bash
GPS_INGEST_URL=https://<domaine-esamba>/api/gps/ingest
GPS_GATEWAY_ID=gateway-prod-01
GPS_GATEWAY_KEY=<secret aleatoire d'au moins 32 caracteres>
```

Variables requises sur le BFF Vercel:

```bash
GPS_GATEWAY_SECRETS={"gateway-prod-01":"<meme-secret>"}
GPS_INGEST_KEY=<secret interne Vercel vers Supabase>
```

Chaque gateway doit avoir son propre identifiant et son propre secret. La requete HTTP du gateway est authentifiee par HMAC-SHA256 avec timestamp et nonce. Le secret du gateway n'est pas transmis dans les headers.

## Protocoles supportes

- Teltonika FMB920: handshake IMEI, Codec 8 et Codec 8 Extended, validation CRC-16/IBM, ACK TCP `000000NN`.
- Concox / GT06: login `0x01`, position GPS `0x12`, alarm GPS `0x16`, heartbeat `0x13`, validation CRC-ITU, ACK GT06.
- Formats texte historiques TK103 et Concox simplifie: desactives par defaut. Pour une migration temporaire uniquement, definir `GPS_ALLOW_LEGACY_TEXT_PROTOCOLS=true`.

Le serveur reassemble les trames fragmentees par TCP avant parsing. Les tailles de frame et de buffer sont bornees, les connexions inactives expirent et une connexion ne peut pas changer d'IMEI. Une seule session active est acceptee par IMEI sur une instance du gateway.

## Configuration boitier

- Domaine/IP: hote public du serveur TCP E-Samba
- Port: `5027`
- Transport: TCP

Le protocole natif des boitiers GPS ne fournit pas toujours une authentification cryptographique du boitier. Le port TCP doit donc aussi etre protege au niveau reseau lorsque l'operateur le permet: APN prive, VPN, allowlist d'adresses source ou filtrage equivalent.

Vercel ne recoit pas le TCP brut. Il recoit uniquement le payload HTTP normalise et signe envoye par le serveur TCP first-party.
