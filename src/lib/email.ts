/**
 * Adresse d'expedition des e-mails transactionnels — un seul endroit.
 *
 * `spbarber.fr` porte de vraies boites mail chez OVH (MX mx1/mx2/mx3.mail.ovh.net).
 * Envoyer via Resend depuis ce domaine racine exigerait de modifier le SPF
 * existant (`v=spf1 include:mx.ovh.com -all`) : mal fait, un second enregistrement
 * SPF est invalide et peut degrader la delivrabilite de TOUTE la messagerie OVH,
 * pas seulement des envois transactionnels.
 *
 * Resend est donc verifie sur un sous-domaine dedie, send.spbarber.fr, qui porte
 * ses propres MX/SPF/DKIM sans toucher a un seul enregistrement existant.
 */
export const EXPEDITEUR_EMAIL = 'SP Barber <noreply@send.spbarber.fr>'
