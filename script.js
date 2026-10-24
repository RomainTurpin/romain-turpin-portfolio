document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-toggle");
    const navigation = document.querySelector("#site-nav");
    const closeMenu = () => {
        if (!menuButton || !navigation) return;
        menuButton.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
        document.body.classList.remove("menu-open");
    };

    if (menuButton && navigation) {
        menuButton.addEventListener("click", () => {
            const isOpen = menuButton.getAttribute("aria-expanded") === "true";
            menuButton.setAttribute("aria-expanded", String(!isOpen));
            navigation.classList.toggle("is-open", !isOpen);
            document.body.classList.toggle("menu-open", !isOpen);
        });

        navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 620) closeMenu();
        });
    }

    const mapElement = document.querySelector("#map");
    if (!mapElement) return;

    if (typeof L === "undefined") {
        mapElement.innerHTML = '<p class="map-fallback">La carte n’a pas pu se charger. Vérifiez votre connexion puis actualisez la page.</p>';
        return;
    }

    mapElement.replaceChildren();

    const locations = [
        { id: "dreal-nantes", name: "DREAL Pays de la Loire", coords: [47.2184, -1.5536], detail: "Géomaticien · 5 mois en 2026" },
        { id: "master-rennes", name: "Université Rennes 2", coords: [48.1173, -1.6778], detail: "Master en Géographie · 2026–2028" },
        { id: "scic-mayenne", name: "SCIC Mayenne Bois Énergie", coords: [48.30783846664582, -0.6537079450781702], detail: "Technicien bocager · 6 semaines en 2024" },
        { id: "cpie-mayenne", name: "CPIE Mayenne", coords: [48.30210790182947, -0.6154011999955645], detail: "Technicien biodiversité · 2 semaines en 2024" },
        { id: "universite-mans", name: "Université du Mans", coords: [48.01649903581589, 0.15257529683495566], detail: "Licence professionnelle SIG · 2025–2026" },
        { id: "agrocampus", name: "AgroCampus La Germinière", coords: [48.012989411548716, 0.12549919381252786], detail: "BTSA Gestion forestière · 2023–2025" },
        { id: "domaine-lorgerie", name: "Domaine de Lorgerie", coords: [48.378425016953784, -0.2591887696130755], detail: "Ouvrier forestier · 2 semaines en 2024" },
        { id: "velo-rail", name: "Le Vélo-rail", coords: [48.386288336830916, -0.5845719253291157], detail: "Agent d’animation · 3 mois en 2023" },
        { id: "jardins-bedardiere", name: "Jardins de la Bédardière", coords: [48.190829838059564, -0.3370658511857672], detail: "Ouvrier en pépinière · 2 semaines en 2024" }
    ];

    const map = L.map(mapElement, { scrollWheelZoom: false });
    const basemap = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri, HERE, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors, and the GIS User Community",
        maxZoom: 20
    });

    const markers = new Map();
    locations.forEach((location, index) => {
        const marker = L.marker(location.coords, {
            title: location.name,
            alt: `Afficher ${location.name}`,
            icon: L.divIcon({
                html: `<span class="custom-marker">${String(index + 1).padStart(2, "0")}</span>`,
                className: "",
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            })
        }).addTo(map);

        marker.bindPopup(`<strong>${location.name}</strong><br>${location.detail}`);
        markers.set(location.id, marker);
    });

    const closeLocationGroups = [
        {
            ids: ["scic-mayenne", "cpie-mayenne"],
            label: "03·04",
            coords: [48.304973, -0.634555],
            title: "Mayenne",
            detail: "SCIC Mayenne Bois Énergie<br>CPIE Mayenne"
        },
        {
            ids: ["universite-mans", "agrocampus"],
            label: "08·09",
            coords: [48.014744, 0.138037],
            title: "Le Mans",
            detail: "Université du Mans<br>AgroCampus La Germinière"
        }
    ];
    const closeLocationIds = new Set(closeLocationGroups.flatMap((group) => group.ids));
    const closeLocationMarkers = closeLocationGroups.map((group) => {
        const marker = L.marker(group.coords, {
            title: `${group.title} : ${group.ids.length} lieux`,
            icon: L.divIcon({
                html: `<span class="custom-marker cluster-marker">${group.label}</span>`,
                className: "",
                iconSize: [54, 34],
                iconAnchor: [27, 17]
            })
        }).bindPopup(`<strong>${group.title}</strong><br>${group.detail}`);
        return marker;
    });
    const updateLocationClusters = () => {
        const useClusters = map.getZoom() <= 10;
        markers.forEach((marker, id) => {
            const visible = !useClusters || !closeLocationIds.has(id);
            marker.setOpacity(visible ? 1 : 0);
            const element = marker.getElement();
            if (element) element.style.pointerEvents = visible ? "" : "none";
        });
        closeLocationMarkers.forEach((marker) => {
            if (useClusters) marker.addTo(map);
            else if (map.hasLayer(marker)) map.removeLayer(marker);
        });
    };
    map.on("zoomend", updateLocationClusters);

    const allLocationsBounds = L.latLngBounds(locations.map((location) => location.coords));
    const offlineMap = L.layerGroup();
    const offlineBounds = allLocationsBounds.pad(0.14);
    const offlineColor = "#aab7a8";
    const addOfflineFallback = () => {
        if (map.hasLayer(offlineMap)) return;
        if (map.hasLayer(basemap)) map.removeLayer(basemap);

        const southWest = offlineBounds.getSouthWest();
        const northEast = offlineBounds.getNorthEast();
        const latitudeStep = 0.25;
        const longitudeStep = 0.25;

        for (let latitude = Math.ceil(southWest.lat / latitudeStep) * latitudeStep; latitude <= northEast.lat; latitude += latitudeStep) {
            L.polyline([[latitude, southWest.lng], [latitude, northEast.lng]], {
                color: offlineColor,
                weight: 1,
                opacity: 0.7,
                dashArray: "3 7",
                interactive: false
            }).addTo(offlineMap);
        }
        for (let longitude = Math.ceil(southWest.lng / longitudeStep) * longitudeStep; longitude <= northEast.lng; longitude += longitudeStep) {
            L.polyline([[southWest.lat, longitude], [northEast.lat, longitude]], {
                color: offlineColor,
                weight: 1,
                opacity: 0.7,
                dashArray: "3 7",
                interactive: false
            }).addTo(offlineMap);
        }

        [
            { name: "Nantes", coords: locations[0].coords },
            { name: "Rennes", coords: locations[1].coords },
            { name: "Le Mans", coords: locations[4].coords }
        ].forEach((place) => {
            L.marker(place.coords, {
                interactive: false,
                keyboard: false,
                icon: L.divIcon({
                    className: "offline-place-label",
                    html: `<span>${place.name}</span>`,
                    iconSize: [86, 20],
                    iconAnchor: [-12, 10]
                })
            }).addTo(offlineMap);
        });

        offlineMap.addTo(map);
        mapElement.classList.add("has-offline-basemap");
        map.fitBounds(allLocationsBounds, { padding: [28, 28], maxZoom: 9, animate: false });
        const notice = document.createElement("p");
        notice.className = "map-fallback-banner";
        notice.setAttribute("role", "status");
        notice.textContent = "Fond de tuiles indisponible · schéma de repérage hors ligne";
        mapElement.append(notice);
        const mapCredit = document.querySelector(".map-credit");
        if (mapCredit) mapCredit.textContent = "Schéma indicatif : grille de coordonnées et lieux repérés";
    };

    basemap.on("tileerror", addOfflineFallback);
    basemap.addTo(map);

    const fitAllLocations = () => {
        map.invalidateSize({ pan: false });
        map.fitBounds(allLocationsBounds, { padding: [28, 28], maxZoom: 9, animate: false });
    };

    document.querySelectorAll(".map-link[data-location]").forEach((button) => {
        button.addEventListener("click", () => {
            const marker = markers.get(button.dataset.location);
            if (!marker) return;

            document.querySelectorAll(".map-link[aria-current]").forEach((activeButton) => {
                activeButton.removeAttribute("aria-current");
            });
            button.setAttribute("aria-current", "true");
            map.flyTo(marker.getLatLng(), 13, { duration: 0.7 });
            marker.openPopup();
            mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    });

    requestAnimationFrame(fitAllLocations);
    window.addEventListener("resize", fitAllLocations);
});
