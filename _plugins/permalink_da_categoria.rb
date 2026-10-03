# frozen_string_literal: true

# URL dei post presi dalla CATEGORIA: /blog/<categoria>/<articolo>/ (la data NON e' nell'URL).
# Template in _config.yml > permalink_da_categoria (segnaposto :categoria = prima categoria del post,
# slugificata come nei link agli archivi; :title = nome file senza data).
# Post senza categoria: permalink globale di _config.yml (/blog/:title/).
# Un "permalink:" scritto nel post vince sempre. La data resta in front matter: ordine per data e
# link cliccabili anno/categoria invariati.
Jekyll::Hooks.register :site, :post_read do |site|
  modello = site.config["permalink_da_categoria"]
  next unless modello.is_a?(String) && modello.include?(":categoria")

  site.posts.docs.each do |doc|
    next if doc.data["permalink"]

    cats = Jekyll::Utils.pluralized_array_from_hash(doc.data, "category", "categories").map(&:to_s)
    cat = cats.first
    next if cat.nil? || cat.strip.empty?

    doc.data["permalink"] = modello.sub(":categoria", Jekyll::Utils.slugify(cat))
    doc.instance_variable_set(:@url, nil)
  end
end
