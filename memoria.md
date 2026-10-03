# MEMORIA DEL PROGETTO: idee future (NIENTE DA FARE ORA)

Qui stanno le idee che Mirco vuole riprendere in futuro. Non iniziarle senza che lo chieda. Aggiornato il 04/10/2026.
Per le regole del sito e dell'admin vedi CLAUDE.md (punti numerati).

## 1. E-commerce gratis e stabile (da provare in futuro)

Obiettivo di Mirco: gestire un e-commerce gratis, stabile, sfruttando piu' risorse gratuite possibile.

Perche' non GitHub Pages: la documentazione di GitHub dice che Pages non e' permesso come hosting gratuito per attivita' online ed e' commerciali/e-commerce. Perche' non Vercel: il piano gratuito vieta l'uso commerciale. Netlify gratuito: 300 crediti al mese, limite rigido, banda e deploy consumano crediti. Node come server sempre acceso gratis (es. Render): si spegne dopo 15 minuti, disco effimero, non adatto alla produzione.

Stack scelto (tutto su un account Cloudflare, piu' Stripe):
- Sito e catalogo statico: Cloudflare Pages (richieste statiche illimitate, 500 build al mese, 1 build alla volta, timeout 20 min).
- Logica (checkout, webhook, ordini): Workers (100.000 richieste al giorno che eseguono codice, poca CPU per richiesta).
- Prodotti e ordini: D1 (SQLite; free: 5 milioni di letture e 100.000 scritture di righe al giorno, 5 GB). Niente transazioni classiche: usare batch().
- Foto e file: R2 (10 GB, 1 milione di operazioni di scrittura e 10 milioni di lettura al mese, nessun costo di uscita).
- KV solo per leggere configurazioni: 1.000 scritture al giorno gratis. Il carrello sta nel browser.
- Pagamenti: Stripe Checkout (niente canone, commissione per vendita: DA VERIFICARE). Email ordini: servizio con piano gratuito (Brevo o Resend: DA VERIFICARE). Il dominio ha un costo.
- Linguaggio: TypeScript/JavaScript. Pagine con Astro o Jekyll, API con Hono.

Rischi da ricordare:
- Oltre i limiti gratuiti le richieste falliscono (non addebita). Uscita di sicurezza: Workers Paid a 5 $/mese.
- Nessuna garanzia di uptime sul piano gratuito.
- 500 build al mese: se l'admin committa a ogni salvataggio, raggruppare le modifiche del catalogo.
- Backup periodico di D1 su R2 o GitHub (Action schedulata).
- Limiti e prezzi cambiano: ricontrollare i piani prima di iniziare (verificati ottobre 2026).

Prossimo passo, quando Mirco lo chiede: scheletro minimo (catalogo statico, checkout Stripe, Worker per gli ordini, tabelle D1). Serve un account Cloudflare e uno Stripe: chiedere prima.

## 2. Hosting e clone Node

Decisione: si resta con Jekyll + admin su GitHub. Quando il sito va su PROD con dominio vero, valutare Cloudflare Pages o Netlify (301 veri dagli slug_precedenti, anteprime su branch, login vero). Il clone Node con le stesse funzioni e' un desiderio per il futuro: dettaglio in CLAUDE.md punto 29.