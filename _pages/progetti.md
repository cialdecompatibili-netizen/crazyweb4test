---
layout: page
title: Progetti
nav: true
permalink: /progetti/
nav_order: 4
---

<style>
  .progetto { display: flex; gap: 1.5rem; align-items: center; margin: 1.5rem 0; }
  .progetto img { width: 40%; max-width: 340px; border-radius: 0.5rem; object-fit: cover; }
  .progetto .testo { flex: 1; }
  .progetto .testo h3 { margin-top: 0; }
  @media (max-width: 640px) {
    .progetto { flex-direction: column; align-items: flex-start; }
    .progetto img { width: 100%; max-width: none; }
  }
</style>

<div class="progetto">
  <img src="{{ '/assets/img/1.jpg' | relative_url }}" alt="Negozio online demo">
  <div class="testo">
    <h3>Negozio online demo</h3>
    <p>Progetto dimostrativo di e-commerce: catalogo prodotti, carrello e checkout semplificato. Testo di esempio da sostituire con la descrizione reale.</p>
  </div>
</div>

<hr>

<div class="progetto">
  <img src="{{ '/assets/img/2.jpg' | relative_url }}" alt="Portale editoriale demo">
  <div class="testo">
    <h3>Portale editoriale demo</h3>
    <p>Sito di contenuti con blog, categorie e ricerca. Testo di esempio da sostituire con la descrizione reale.</p>
  </div>
</div>

<hr>

<div class="progetto">
  <img src="{{ '/assets/img/3.jpg' | relative_url }}" alt="Applicazione di prenotazioni demo">
  <div class="testo">
    <h3>Applicazione di prenotazioni demo</h3>
    <p>Web app per gestire appuntamenti e disponibilità, con pannello di amministrazione. Testo di esempio da sostituire con la descrizione reale.</p>
  </div>
</div>
