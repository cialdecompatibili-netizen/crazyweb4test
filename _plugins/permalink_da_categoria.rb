# frozen_string_literal: true

# Il prefisso dell'URL di un post dipende dalla sua CATEGORIA.
# Mappa in _config.yml > permalink_categorie, ad esempio:
#   permalink_categorie:
#     servizi: /servizi/:title/
# => ogni post con "categories: servizi" esce su /servizi/<slug>/.
# Le altre categorie (o nessuna) usano il permalink globale (/blog/:year/:title/).
# Un "permalink:" scritto nel post vince sempre. La data NON cambia: l'ordine nel blog resta per data.
Jekyll::Hooks.register :site, :post_read do |site|
  mappa = site.config["permalink_categorie"]
  next unless mappa.is_a?(Hash)

  site.posts.docs.each do |doc|
    next if doc.data["permalink"]

    cats = Jekyll::Utils.pluralized_array_from_hash(doc.data, "category", "categories").map(&:to_s)
    cat = cats.find { |c| mappa.key?(c) }
    next unless cat

    doc.data["permalink"] = mappa[cat]
    doc.instance_variable_set(:@url, nil)
  end
end
