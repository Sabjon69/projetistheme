let scenesData = {};
let currentSceneId = null;

const sidebar = document.getElementById('sidebar');
const statusBar = document.getElementById('statusBar');
const addArrowBtn = document.getElementById('addArrowBtn');
const viewerWrapper = document.getElementById('viewerWrapper');
const photoViewer = document.getElementById('photoViewer');
const hotspotsContainer = document.getElementById('hotspotsContainer');
const emptyStateText = document.getElementById('emptyStateText');
const arrowRotationRange = document.getElementById('arrowRotationRange');

function setStatus(msg) {
    if (statusBar) statusBar.textContent = msg;
}

document.getElementById('imageInput').addEventListener('change', (e) => processFiles(e.target.files));

if (sidebar) {
    sidebar.addEventListener('dragover', (e) => { e.preventDefault(); sidebar.classList.add('dragover'); });
    sidebar.addEventListener('dragleave', () => sidebar.classList.remove('dragover'));
    sidebar.addEventListener('drop', (e) => { e.preventDefault(); sidebar.classList.remove('dragover'); processFiles(e.dataTransfer.files); });
}

function processFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.match('image.*'));
    if (files.length === 0) return;

    files.forEach(file => {
        const sceneId = 'scene_' + Math.random().toString(36).substr(2, 9);
        const objectUrl = URL.createObjectURL(file);

        scenesData[sceneId] = {
            id: sceneId,
            name: file.name,
            url: objectUrl,
            file: file,
            hotspots: []
        };

        if (!currentSceneId) {
            currentSceneId = sceneId;
        }
    });

    updateSceneListUI();
    updateTargetSelect();
    if (currentSceneId) {
        loadViewer(currentSceneId);
    }
    setStatus(Object.keys(scenesData).length + " photo(s) chargée(s)");
}

function updateSceneListUI() {
    const list = document.getElementById('sceneList');
    if (!list) return;
    list.innerHTML = '';
    
    for (let id in scenesData) {
        const scene = scenesData[id];
        const li = document.createElement('li');
        if (id === currentSceneId) li.classList.add('active');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'scene-info';
        infoDiv.onclick = () => { loadViewer(id); };

        const nameSpan = document.createElement('span');
        nameSpan.className = 'scene-name';
        nameSpan.textContent = scene.name;
        infoDiv.appendChild(nameSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteScene(id); };

        li.appendChild(infoDiv);
        li.appendChild(deleteBtn);
        list.appendChild(li);
    }
}

function updateTargetSelect() {
    const select = document.getElementById('targetSceneSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Sélectionnez une pièce --</option>';
    
    for (let id in scenesData) {
        if (id !== currentSceneId) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = scenesData[id].name;
            select.appendChild(opt);
        }
    }
}

function loadViewer(sceneId) {
    currentSceneId = sceneId;
    updateSceneListUI();
    updateTargetSelect();

    emptyStateText.style.display = 'none';
    photoViewer.style.display = 'block';
    
    let currentScene = scenesData[sceneId];
    photoViewer.src = currentScene.url;
    
    renderHotspots();
    setStatus("Affichage : " + currentScene.name);
}

function deleteScene(sceneId) {
    URL.revokeObjectURL(scenesData[sceneId].url);
    delete scenesData[sceneId];

    for (let id in scenesData) {
        scenesData[id].hotspots = scenesData[id].hotspots.filter(hs => hs.targetId !== sceneId);
    }

    const remainingIds = Object.keys(scenesData);
    if (remainingIds.length === 0) {
        photoViewer.style.display = 'none';
        emptyStateText.style.display = 'block';
        hotspotsContainer.innerHTML = '';
        currentSceneId = null;
        setStatus("Aucune image");
    } else {
        currentSceneId = remainingIds[0];
        loadViewer(currentSceneId);
    }
    updateSceneListUI();
    updateTargetSelect();
}

addArrowBtn.addEventListener('click', () => {
    if (!currentSceneId) {
        setStatus("Importez d'abord une photo !");
        return;
    }
    const targetId = document.getElementById('targetSceneSelect').value;
    if (!targetId) {
        setStatus("Erreur : Choisissez d'abord la pièce cible !");
        return;
    }

    const targetName = scenesData[targetId].name;
    const currentRotation = parseInt(arrowRotationRange.value) || 0;

    // Crée la flèche au centre de l'image par défaut, prête à être glissée-déposée
    const newHotspot = {
        targetId: targetId,
        targetName: targetName,
        x: 50,
        y: 50,
        rotation: currentRotation
    };

    scenesData[currentSceneId].hotspots.push(newHotspot);
    renderHotspots();
    setStatus("Flèche ajoutée ! Glissez-la avec la souris/doigt où vous voulez.");
});

function renderHotspots() {
    hotspotsContainer.innerHTML = '';
    if (!currentSceneId || !scenesData[currentSceneId]) return;

    scenesData[currentSceneId].hotspots.forEach((hs, index) => {
        const arrow = document.createElement('div');
        arrow.className = 'nav-arrow';
        arrow.style.left = hs.x + '%';
        arrow.style.top = hs.y + '%';
        arrow.style.transform = `translate(-50%, -50%) rotate(${hs.rotation || 0}deg)`;
        arrow.innerHTML = '▲'; 
        
        const tooltip = document.createElement('div');
        tooltip.className = 'nav-tooltip';
        tooltip.style.transform = `translateX(-50%) rotate(-${hs.rotation || 0}deg)`;
        tooltip.textContent = "Aller vers : " + hs.targetName;
        arrow.appendChild(tooltip);

        // Permet le clic pour changer de scène si on ne glisse pas
        let isDragging = false;

        const onPointerDown = (e) => {
            isDragging = false;
            let startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            let startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

            const onPointerMove = (moveEvent) => {
                let currentX = moveEvent.clientX || (moveEvent.touches ? moveEvent.touches[0].clientX : 0);
                let currentY = moveEvent.clientY || (moveEvent.touches ? moveEvent.touches[0].clientY : 0);

                if (Math.abs(currentX - startX) > 3 || Math.abs(currentY - startY) > 3) {
                    isDragging = true;
                }

                const rect = viewerWrapper.getBoundingClientRect();
                let xPercent = ((currentX - rect.left) / rect.width) * 100;
                let yPercent = ((currentY - rect.top) / rect.height) * 100;

                // Restreindre dans l'image
                xPercent = Math.max(0, Math.min(100, xPercent));
                yPercent = Math.max(0, Math.min(100, yPercent));

                hs.x = xPercent;
                hs.y = yPercent;

                arrow.style.left = xPercent + '%';
                arrow.style.top = yPercent + '%';
            };

            const onPointerUp = () => {
                window.removeEventListener('mousemove', onPointerMove);
                window.removeEventListener('mouseup', onPointerUp);
                window.removeEventListener('touchmove', onPointerMove);
                window.removeEventListener('touchend', onPointerUp);

                if (!isDragging) {
                    loadViewer(hs.targetId);
                }
            };

            window.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);
            window.addEventListener('touchmove', onPointerMove);
            window.addEventListener('touchend', onPointerUp);
        };

        arrow.addEventListener('mousedown', onPointerDown);
        arrow.addEventListener('touchstart', onPointerDown);

        hotspotsContainer.appendChild(arrow);
    });
}

function updateBrandName(val) {
    const brandDisp = document.getElementById('displayBrand');
    if (brandDisp) brandDisp.textContent = val || "VISITE VIRTUELLE";
}

document.getElementById('exportBtn').addEventListener('click', async () => {
    if (Object.keys(scenesData).length === 0) {
        setStatus("Rien à exporter");
        return;
    }

    setStatus("Création du ZIP en cours...");
    const zip = new JSZip();
    const imgFolder = zip.folder("images");

    const exportConfig = {};
    for (let id in scenesData) {
        imgFolder.file(scenesData[id].name, scenesData[id].file);
        exportConfig[id] = {
            id: id,
            imagePath: "images/" + scenesData[id].name,
            hotspots: scenesData[id].hotspots
        };
    }

    const brandInputEl = document.getElementById('brandInput');
    const brandVal = brandInputEl ? brandInputEl.value : 'VISITE VIRTUELLE';
    
    const tourHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandVal}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: Arial, sans-serif; background: #e5e5e5; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .brand-badge { position: absolute; top: 20px; left: 20px; background: #fff; padding: 8px 16px; font-weight: bold; border: 2px solid #000; z-index: 10; text-transform: uppercase; }
        #viewerWrapper { position: relative; display: inline-block; max-width: 100%; max-height: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 2px solid #000; background: #fff; }
        #photoViewer { max-width: 100%; max-height: 100vh; display: block; object-fit: contain; }
        #hotspotsContainer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .nav-arrow { position: absolute; width: 44px; height: 44px; background: #000; color: #fff; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-size: 18px; transition: transform 0.2s, background 0.2s; }
        .nav-arrow:hover { background: #333; transform: translate(-50%, -50%) scale(1.15); }
        .nav-tooltip { visibility: hidden; background: #fff; color: #000; border: 2px solid #000; padding: 4px 8px; position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.75rem; text-transform: uppercase; font-weight: bold; z-index: 20; }
        .nav-arrow:hover .nav-tooltip { visibility: visible; }
    </style>
</head>
<body>
    <div class="brand-badge">${brandVal}</div>
    <div id="viewerWrapper">
        <img id="photoViewer" />
        <div id="hotspotsContainer"></div>
    </div>
    <script>
        const scenesData = ${JSON.stringify(exportConfig)};
        const photoViewer = document.getElementById('photoViewer');
        const hotspotsContainer = document.getElementById('hotspotsContainer');

        function loadScene(sceneId) {
            const scene = scenesData[sceneId];
            photoViewer.src = scene.imagePath;
            hotspotsContainer.innerHTML = '';

            scene.hotspots.forEach(hs => {
                const arrow = document.createElement('div');
                arrow.className = 'nav-arrow';
                arrow.style.left = hs.x + '%';
                arrow.style.top = hs.y + '%';
                arrow.style.transform = \`translate(-50%, -50%) rotate(\${hs.rotation || 0}deg)\`;
                arrow.innerHTML = '▲';
                
                const tooltip = document.createElement('div');
                tooltip.className = 'nav-tooltip';
                tooltip.style.transform = \`translateX(-50%) rotate(-\${hs.rotation || 0}deg)\`;
                tooltip.textContent = "Aller vers : " + hs.targetName;
                arrow.appendChild(tooltip);

                arrow.onclick = () => loadScene(hs.targetId);
                hotspotsContainer.appendChild(arrow);
            });
        }

        const firstSceneId = Object.keys(scenesData)[0];
        if(firstSceneId) loadScene(firstSceneId);
    <\\/script>
</body>
</html>`;

    zip.file("index.html", tourHtml);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visite_interactive_standard.zip";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exportation terminée");
});