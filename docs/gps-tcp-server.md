# Serveur TCP GPS E-Samba

## Role

Le site web reste deploye sur Vercel pour les pages et les routes HTTP.
Les boitiers GPS Teltonika FMB920 et Concox se connectent au serveur TCP E-Samba,
qui normalise les trames puis les relaie vers l'API Vercel.

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

Variables requises:

```bash
GPS_INGEST_URL=https://<domaine-esamba>/api/gps/ingest
GPS_INGEST_KEY=<secret partage avec Vercel et Supabase>
```

## Protocoles supportes

- Teltonika FMB920: handshake IMEI, Codec 8 et Codec 8 Extended, ACK TCP `000000NN`.
- Concox / GT06: login `0x01`, position GPS `0x12`, alarm GPS `0x16`, heartbeat `0x13`, ACK GT06 avec CRC-ITU.
- Formats texte historiques: TK103 et Concox simplifie.

Le serveur reassemble les trames fragmentees par TCP avant parsing.

## Configuration boitier

- Domaine/IP: hote public du serveur TCP E-Samba
- Port: `5027`
- Transport: TCP

Vercel ne recoit pas le TCP brut. Il recoit uniquement le payload HTTP normalise
envoye par ce serveur TCP first-party.
