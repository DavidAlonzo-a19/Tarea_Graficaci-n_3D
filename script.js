// ==============================================================================
// 1. CONFIGURACIÓN DEL CANVAS Y CENTRO DE PANTALLA
// ==============================================================================
const canvas = document.getElementById('lienzo3D');
const ctx = canvas.getContext('2d');
const CENTRO_X = canvas.width / 2;
const CENTRO_Y = canvas.height / 2;

// Paleta visual propia (Parte 3): violeta (lejos) -> ámbar (cerca) y vértices lima
const PALETA = {
    ejes: '#334155',
    aristaLejana: { r: 167, g: 139, b: 250 }, // #a78bfa violeta
    aristaCercana: { r: 251, g: 191, b: 36 }, // #fbbf24 ámbar
    vertice: '#a3e635',                        // lima
    bordeVertice: '#0f172a'
};

// ==============================================================================
// 2. TEMAS 3.1 & 3.2: GEOMETRÍA TRIDIMENSIONAL (MODELOS LOCALES 3D)
// ==============================================================================
// Definición de los 8 vértices del cubo centrado en el origen (0,0,0)
const modeloCuboLocal = [
    {x: -80, y: -80, z: -80}, // V0: Inferior Trasero Izq
    {x:  80, y: -80, z: -80}, // V1: Inferior Trasero Der
    {x:  80, y:  80, z: -80}, // V2: Superior Trasero Der
    {x: -80, y:  80, z: -80}, // V3: Superior Trasero Izq
    {x: -80, y: -80, z:  80}, // V4: Inferior Frontal Izq
    {x:  80, y: -80, z:  80}, // V5: Inferior Frontal Der
    {x:  80, y:  80, z:  80}, // V6: Superior Frontal Der
    {x: -80, y:  80, z:  80}  // V7: Superior Frontal Izq
];

// Aristas del cubo (Pares de índices de vértices que forman líneas)
const aristasCubo = [
    // Cara Trasera (Z = -80)
    [0, 1], [1, 2], [2, 3], [3, 0],
    // Cara Frontal (Z = +80)
    [4, 5], [5, 6], [6, 7], [7, 4],
    // Aristas Longitudinales
    [0, 4], [1, 5], [2, 6], [3, 7]
];

// ---- OPCIÓN A: Pirámide de base cuadrada (5 vértices, 8 aristas) ----
const modeloPiramideLocal = [
    {x: -80, y: -80, z: -80}, // V0: Base trasera izq
    {x:  80, y: -80, z: -80}, // V1: Base trasera der
    {x:  80, y: -80, z:  80}, // V2: Base frontal der
    {x: -80, y: -80, z:  80}, // V3: Base frontal izq
    {x:   0, y:  80, z:   0}  // V4: Ápice (vértice superior)
];
const aristasPiramide = [
    // Base cuadrada (4 aristas)
    [0, 1], [1, 2], [2, 3], [3, 0],
    // Aristas laterales hacia el ápice (4 aristas)
    [0, 4], [1, 4], [2, 4], [3, 4]
];

// ---- OPCIÓN B: Prisma triangular (6 vértices, 9 aristas) ----
// Triángulo equilátero de lado 160 (altura ≈ 139) extruido 160 sobre el eje Z
const modeloPrismaLocal = [
    {x: -80, y: -70, z: -80}, // V0: Triángulo trasero, esquina izq
    {x:  80, y: -70, z: -80}, // V1: Triángulo trasero, esquina der
    {x:   0, y:  70, z: -80}, // V2: Triángulo trasero, punta superior
    {x: -80, y: -70, z:  80}, // V3: Triángulo frontal, esquina izq
    {x:  80, y: -70, z:  80}, // V4: Triángulo frontal, esquina der
    {x:   0, y:  70, z:  80}  // V5: Triángulo frontal, punta superior
];
const aristasPrisma = [
    // Triángulo trasero (3 aristas)
    [0, 1], [1, 2], [2, 0],
    // Triángulo frontal (3 aristas)
    [3, 4], [4, 5], [5, 3],
    // Aristas longitudinales que unen ambos triángulos (3 aristas)
    [0, 3], [1, 4], [2, 5]
];

// ---- OPCIÓN C: Octaedro (6 vértices, 12 aristas) ----
// Un vértice sobre cada semieje (±X, ±Y, ±Z) a distancia 110 del origen
const modeloOctaedroLocal = [
    {x:  110, y:    0, z:    0}, // V0: +X
    {x: -110, y:    0, z:    0}, // V1: -X
    {x:    0, y:  110, z:    0}, // V2: +Y (cúspide superior)
    {x:    0, y: -110, z:    0}, // V3: -Y (cúspide inferior)
    {x:    0, y:    0, z:  110}, // V4: +Z
    {x:    0, y:    0, z: -110}  // V5: -Z
];
const aristasOctaedro = [
    // Cada vértice se conecta con todos excepto con su opuesto (6 x 4 / 2 = 12)
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [2, 5],
    [3, 4], [3, 5]
];

// Catálogo de figuras disponibles en el selector del HTML
const FIGURAS = {
    cubo:     { nombre: 'Cubo',      vertices: modeloCuboLocal,      aristas: aristasCubo },
    piramide: { nombre: 'Pirámide',  vertices: modeloPiramideLocal,  aristas: aristasPiramide },
    prisma:   { nombre: 'Prisma',    vertices: modeloPrismaLocal,    aristas: aristasPrisma },
    octaedro: { nombre: 'Octaedro',  vertices: modeloOctaedroLocal,  aristas: aristasOctaedro }
};

// Figura activa (por defecto la que esté seleccionada en el HTML)
let figuraActual = FIGURAS[document.getElementById('figura').value];

// ==============================================================================
// 3. TEMA 3.3: PIPELINE DE TRANSFORMACIONES TRIDIMENSIONALES
// ==============================================================================
function transformarVertice3D(v, params) {
    let { tx, ty, tz, sx, sy, sz, rx, ry, rz, shxy, shxz } = params;

    // Convertir ángulos a radianes
    let radX = rx * Math.PI / 180;
    let radY = ry * Math.PI / 180;
    let radZ = rz * Math.PI / 180;

    // --- 3.3.2 ESCALAMIENTO (S) ---
    let x1 = v.x * sx;
    let y1 = v.y * sy;
    let z1 = v.z * sz;

    // --- 3.3.4 SESGADO / SHEAR (Sh) ---
    let x2 = x1 + (shxy * y1) + (shxz * z1);
    let y2 = y1;
    let z2 = z1;

    // --- 3.3.3 ROTACIÓN EN EJE X (Pitch) ---
    let x3 = x2;
    let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
    let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

    // --- 3.3.3 ROTACIÓN EN EJE Y (Yaw) ---
    let x4 = x3 * Math.cos(radY) + z3 * Math.sin(radY);
    let y4 = y3;
    let z4 = -x3 * Math.sin(radY) + z3 * Math.cos(radY);

    // --- 3.3.3 ROTACIÓN EN EJE Z (Roll) ---
    let x5 = x4 * Math.cos(radZ) - y4 * Math.sin(radZ);
    let y5 = x4 * Math.sin(radZ) + y4 * Math.cos(radZ);
    let z5 = z4;

    // --- 3.3.1 TRASLACIÓN (T) ---
    let xFinal = x5 + tx;
    let yFinal = y5 + ty;
    let zFinal = z5 + tz;

    return { x: xFinal, y: yFinal, z: zFinal };
}

// ==============================================================================
// 4. TEMA 3.1: PROYECCIÓN PERSPECTIVA (3D A PANTALLA 2D)
// ==============================================================================
function proyectar3Da2D(v3d) {
    const distanciaCamara = 500;

    let zAjustado = v3d.z + distanciaCamara;
    if (zAjustado < 1) zAjustado = 1;

    // Factor de escala por perspectiva (división entre Z)
    let factorProyeccion = distanciaCamara / zAjustado;

    // Mapeo a píxeles en el lienzo
    let x2d = CENTRO_X + (v3d.x * factorProyeccion);
    let y2d = CENTRO_Y - (v3d.y * factorProyeccion); // Inversión en eje Y

    // Se devuelve también el factor para variar grosor y color según la profundidad
    return { x: x2d, y: y2d, factor: factorProyeccion };
}

// ==============================================================================
// 5. RETO: AUTO-ROTACIÓN CON requestAnimationFrame
// ==============================================================================
const VELOCIDAD_YAW = 60;      // grados por segundo
let autoRotando = false;
let anguloYawAuto = 30;        // se sincroniza con el deslizador Ry
let ultimoTiempo = null;
let idAnimacion = null;

function animarAutoRotacion(tiempoActual) {
    if (!autoRotando) return;

    if (ultimoTiempo === null) ultimoTiempo = tiempoActual;
    const delta = (tiempoActual - ultimoTiempo) / 1000; // segundos entre cuadros
    ultimoTiempo = tiempoActual;

    // Avanzar el ángulo y mantenerlo en el rango [-180, 180] del deslizador
    anguloYawAuto += VELOCIDAD_YAW * delta;
    if (anguloYawAuto > 180) anguloYawAuto -= 360;

    // Mantener el deslizador sincronizado con el ángulo actual
    document.getElementById('ry').value = Math.round(anguloYawAuto);

    renderizar();
    idAnimacion = requestAnimationFrame(animarAutoRotacion);
}

function alternarAutoRotacion() {
    const boton = document.getElementById('btnAutoRotar');
    autoRotando = !autoRotando;

    if (autoRotando) {
        anguloYawAuto = parseFloat(document.getElementById('ry').value);
        ultimoTiempo = null;
        boton.textContent = '⏸ Detener auto-rotación';
        boton.classList.add('activo');
        idAnimacion = requestAnimationFrame(animarAutoRotacion);
    } else {
        cancelAnimationFrame(idAnimacion);
        boton.textContent = '▶ Auto-rotación (Yaw)';
        boton.classList.remove('activo');
    }
}

// ==============================================================================
// 6. BUCLE DE RENDERIZADO EN TIEMPO REAL
// ==============================================================================
// Mezcla lineal entre dos colores RGB (t = 0 -> a, t = 1 -> b)
function mezclarColor(a, b, t) {
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
}

function renderizar() {
    // 1. Obtener parámetros del panel
    const params = {
        tx: parseFloat(document.getElementById('tx').value),
        ty: parseFloat(document.getElementById('ty').value),
        tz: parseFloat(document.getElementById('tz').value),
        sx: parseFloat(document.getElementById('sx').value),
        sy: parseFloat(document.getElementById('sy').value),
        sz: parseFloat(document.getElementById('sz').value),
        rx: parseFloat(document.getElementById('rx').value),
        // Si la auto-rotación está activa, se usa el ángulo flotante (movimiento suave)
        ry: autoRotando ? anguloYawAuto : parseFloat(document.getElementById('ry').value),
        rz: parseFloat(document.getElementById('rz').value),
        shxy: parseFloat(document.getElementById('shxy').value),
        shxz: parseFloat(document.getElementById('shxz').value)
    };

    // 2. Actualizar indicadores numéricos
    document.getElementById('valTx').innerText = params.tx;
    document.getElementById('valTy').innerText = params.ty;
    document.getElementById('valTz').innerText = params.tz;
    document.getElementById('valSx').innerText = params.sx.toFixed(1);
    document.getElementById('valSy').innerText = params.sy.toFixed(1);
    document.getElementById('valSz').innerText = params.sz.toFixed(1);
    document.getElementById('valRx').innerText = params.rx + '°';
    document.getElementById('valRy').innerText = Math.round(params.ry) + '°';
    document.getElementById('valRz').innerText = params.rz + '°';
    document.getElementById('valShXY').innerText = params.shxy.toFixed(1);
    document.getElementById('valShXZ').innerText = params.shxz.toFixed(1);

    // 3. Limpiar lienzo
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 4. Dibujar ejes cartesianos de guía
    ctx.strokeStyle = PALETA.ejes;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTRO_X, 0); ctx.lineTo(CENTRO_X, canvas.height);
    ctx.moveTo(0, CENTRO_Y); ctx.lineTo(canvas.width, CENTRO_Y);
    ctx.stroke();

    // 5. Aplicar transformaciones 3D a la figura activa
    let verticesTransformados = figuraActual.vertices.map(v => transformarVertice3D(v, params));

    // 6. Proyectar a coordenadas 2D
    let vertices2D = verticesTransformados.map(proyectar3Da2D);

    // Rango de factores de perspectiva del cuadro actual (para normalizar el color)
    const factores = vertices2D.map(p => p.factor);
    const fMin = Math.min(...factores);
    const fMax = Math.max(...factores);
    const rango = (fMax - fMin) || 1;

    // 7. Renderizar aristas: color violeta->ámbar y grosor según cercanía (escala)
    ctx.lineCap = 'round';
    for (let arista of figuraActual.aristas) {
        let p1 = vertices2D[arista[0]];
        let p2 = vertices2D[arista[1]];

        const factorProm = (p1.factor + p2.factor) / 2;
        const t = (factorProm - fMin) / rango;           // 0 = lejos, 1 = cerca

        ctx.strokeStyle = mezclarColor(PALETA.aristaLejana, PALETA.aristaCercana, t);
        ctx.lineWidth = Math.max(0.8, 2.5 * factorProm * factorProm); // más cerca = más gruesa

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    // 8. Renderizar vértices (puntos lima con tamaño según la perspectiva)
    for (let p of vertices2D) {
        ctx.fillStyle = PALETA.vertice;
        ctx.strokeStyle = PALETA.bordeVertice;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.factor + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

// Muestra cuántos vértices y aristas tiene la figura activa
function actualizarInfoFigura() {
    document.getElementById('infoFigura').innerText =
        `${figuraActual.nombre}: ${figuraActual.vertices.length} vértices y ` +
        `${figuraActual.aristas.length} aristas`;
}

// Escuchar cambios en los deslizadores para refrescar en tiempo real
document.querySelectorAll('input[type=range]').forEach(input => {
    input.addEventListener('input', () => {
        // Si el usuario mueve Ry a mano durante la auto-rotación, continuar desde ahí
        if (input.id === 'ry') anguloYawAuto = parseFloat(input.value);
        renderizar();
    });
});

// Cambio de figura desde el selector
document.getElementById('figura').addEventListener('change', (e) => {
    figuraActual = FIGURAS[e.target.value];
    actualizarInfoFigura();
    renderizar();
});

// Botón de auto-rotación
document.getElementById('btnAutoRotar').addEventListener('click', alternarAutoRotacion);

// Ejecución inicial
actualizarInfoFigura();
renderizar();
