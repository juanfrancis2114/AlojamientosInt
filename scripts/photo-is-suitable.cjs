// Excluir dibujos, planos, fotografías históricas y espacios inadecuados para el catálogo.
module.exports=photo=>!/(clutter|hoard|floor.?plan|drawing|diagram|map|screenshot|advert|postcard|brochure|historic|\b(?:19|18|17)\d{2}\b|painting|illustration|logo|sketch|render|lithograph|rubbish|trash|dump|demolition|abandon|ruin|\.png|\.gif|\.svg|\.tif)/i.test(photo.title);
