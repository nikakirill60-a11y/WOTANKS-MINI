// The plate belongs to the tank's catalogue nation, not the currently open research tree.
// Use a CSS background on the frame so the original cut-out, accessible name and hit target stay intact.
function setVehicleCardArt(image, tank) {
  image.parentElement.dataset.cardNation = tank.nat;
  const src = 'models/' + tank.thumbnail;
  if (image.getAttribute('src') !== src) image.src = src;
}

function vehicleThumbnail(tank) {
  const frame = document.createElement('span'), image = new Image();
  frame.className = 'vehicle-thumb';
  image.alt = '';
  image.draggable = false;
  frame.append(image);
  setVehicleCardArt(image, tank);
  return frame;
}
