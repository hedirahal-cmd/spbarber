#!/usr/bin/env bash
# Sonde RLS — que peut faire la cle ANON, table par table ?
#
# Rejouable a l identique AVANT et APRES l activation de RLS : c est la
# comparaison des deux sorties qui prouve le changement.
#
# NON DESTRUCTIVE : l ecriture testee est un POST d objet vide, qui ne peut rien
# inserer. On lit le CODE d erreur pour distinguer les deux refus possibles :
#   42501 = refuse par RLS          -> la table est protegee
#   23502 / 23505 / 23514 = refuse par une CONTRAINTE -> RLS a laisse passer
#
# Usage :  bash scripts/sonde-rls.sh [chemin/vers/.env.local]   (depuis la racine du depot)

set -u
ENVFILE="${1:-.env.local}"

URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENVFILE" | sed 's/^[^=]*=//' | tr -d '\r"'"'"' ')
ANON=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENVFILE" | sed 's/^[^=]*=//' | tr -d '\r"'"'"' ')

if [ -z "$URL" ] || [ -z "$ANON" ]; then
  echo "ERREUR : URL ou cle anon introuvable dans $ENVFILE" >&2
  exit 1
fi

TABLES="salon_config salons reviews legal_pages product_overrides temoignages_pros barbers orders founders blog_categories blog_posts"

compte_lignes() {
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);console.log(Array.isArray(j)?j.length:"err")}catch{console.log("err")}})'
}

printf "%-20s %-10s %-10s %s\n" "TABLE" "LECTURE" "ECRITURE" "VERDICT ECRITURE"
printf "%-20s %-10s %-10s %s\n" "--------------------" "----------" "----------" "-------------------------"

for t in $TABLES; do
  lignes=$(curl -s --max-time 30 "$URL/rest/v1/$t?select=*" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" | compte_lignes)

  corps=$(curl -s --max-time 30 -X POST "$URL/rest/v1/$t" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Content-Type: application/json" -d '{}')
  code=$(printf '%s' "$corps" | grep -oE '"code":"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')
  [ -z "$code" ] && code="(aucun)"

  case "$code" in
    42501)  verdict="BLOQUEE par RLS" ;;
    2*)     verdict="PASSE RLS — ecriture possible" ;;
    *)      verdict="a examiner ($code)" ;;
  esac

  printf "%-20s %-10s %-10s %s\n" "$t" "$lignes" "$code" "$verdict"
done
