// Offline catalogue art is shared by the hangar and the portable model shelf.
function crateArt(id, name){
  return `<button type="button" class="crate-art" aria-label="Осмотреть модель: ${name}" onclick="CrateView.show('${id}')">
    <img alt="" src="${CrateView.poster(id,false)}"><span>3D · Осмотреть</span></button>`;
}

// Only the game supplies a live reward manifest. Neither gallery starts a transaction.
function renderNationalShowcase(manifest=null) {
  const grid=document.getElementById('national-grid');
  grid.replaceChildren();
  for(const [id,model] of Object.entries(NationalCrates.catalog)) {
    const card=document.createElement('article'); card.className='national-card';
    card.style.setProperty('--stripe',model.accent);
    card.innerHTML=`${crateArt(id,model.name)}<div class="crate-copy"><small class="national-id"><img src="assets/flags/${id.slice('national-'.length)}.webp" alt="">${model.country} <b>№ ${model.series}</b></small>
      <h4>${model.kind}</h4><p class="c-desc">${model.detail}</p>${manifest ? manifest(id) : ''}</div>`;
    grid.append(card);
  }
}
