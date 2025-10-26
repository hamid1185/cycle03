// Import Leaflet library
const L = window.L

document.addEventListener("DOMContentLoaded", async () => {
  const map = L.map("map").setView([-25.2744, 133.7751], 4)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map)

  try {
    const response = await fetch("api/artworks.php?action=list")
    const data = await response.json()
    const artworks = data.artworks || []

    artworks.forEach((art) => {
      if (art.location && !art.location_sensitive) {
        const [lat, lng] = art.location.split(",").map((coord) => Number.parseFloat(coord.trim()))

        if (!isNaN(lat) && !isNaN(lng)) {
          const popupContent = `
            <div style="text-align:center; width:180px;">
              <img src="${art.image_url}" alt="${art.title}" style="width:100%; border-radius:5px; margin-bottom:5px;" />
              <h4 style="margin:0; font-size:14px;">${art.title}</h4>
              <p style="margin:0; font-size:12px;">${art.type}</p>
              <a href="Art_Details.html?id=${art.id}" style="font-size:12px; color:#007BFF; text-decoration:none;">View Details</a>
            </div>
          `
          L.marker([lat, lng]).addTo(map).bindPopup(popupContent)
        }
      }
    })
  } catch (error) {
    console.error("Failed to load artworks for map:", error)
  }
})
