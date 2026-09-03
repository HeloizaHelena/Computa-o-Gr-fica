const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

const canvasCoordinates =
    document.getElementById("canvasCoordinates");

const webglCoordinates =
    document.getElementById("webglCoordinates");

// --------------------------------------------------
// cores (teclas 0 a 9)
// --------------------------------------------------

const colorPalette = [
    [1.0, 1.0, 1.0], // 0 branco
    [1.0, 0.0, 0.0], // 1 vermelho
    [0.0, 1.0, 0.0], // 2 verde
    [0.0, 0.0, 1.0], // 3 azul
    [1.0, 1.0, 0.0], // 4 amarelo
    [0.0, 1.0, 1.0], // 5 ciano
    [1.0, 0.0, 1.0], // 6 magenta
    [1.0, 0.5, 0.0], // 7 laranja
    [0.5, 0.0, 0.5], // 8 roxo
    [0.4, 0.4, 0.4], // 9 cinza
];

let currentColorIndex = 3; // azul
let currentColor = colorPalette[currentColorIndex];

// Guarda os últimos dois pontos clicados, para poder redesenhar
// a mesma linha com outra cor quando o usuário aperta uma tecla
let lastLine = { x1: 0, y1: 0, x2: 0, y2: 0 };

// --------------------------------------------------
// 1. iniciais (serão sobrescritos pela 1 chamada de drawLine)
// --------------------------------------------------

let vertices = new Float32Array([0.0, 0.0]);
let colors = new Float32Array(currentColor);
let pointSizes = new Float32Array([10.0]);

// --------------------------------------------------
// 2. BUFFERS
// --------------------------------------------------

const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

const pointSizesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pointSizesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointSizes, gl.STATIC_DRAW);

// --------------------------------------------------
// 3. VERTEX SHADER
// --------------------------------------------------

const vertexShaderSource = `#version 300 es

in vec2 aPosition;
in vec3 aColor;
in float aPointSize;

out vec3 vColor;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = aPointSize;
    vColor = aColor;
}
`;

// --------------------------------------------------
// 4. FRAGMENT SHADER
// --------------------------------------------------

const fragmentShaderSource = `#version 300 es

precision mediump float;

in vec3 vColor;

out vec4 outColor;

void main() {
    outColor = vec4(vColor, 1.0);
}
`;

// --------------------------------------------------
// 5. COMPILAR SHADERS
// --------------------------------------------------

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }

    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// --------------------------------------------------
// 6. CRIAR PROGRAMA
// --------------------------------------------------

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// --------------------------------------------------
// 7. LOCAL DOS ATRIBUTOS
// --------------------------------------------------

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");
const pointSizeLocation = gl.getAttribLocation(program, "aPointSize");

// --------------------------------------------------
// 8. CONFIGURAR ATRIBUTOS
// --------------------------------------------------

gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, pointSizesBuffer);
gl.enableVertexAttribArray(pointSizeLocation);
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);

// --------------------------------------------------
// Bresenham
// --------------------------------------------------

function bresenham(x1, y1, x2, y2) {

    let points = [];

    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);

    let sx = (x1 < x2) ? 1 : -1;
    let sy = (y1 < y2) ? 1 : -1;

    let x = x1;
    let y = y1;

    // Se a inclinação for <= 1, pertence ao eixo x
    if (dx >= dy) {
        let p = 2 * dy - dx;
        let incInf = 2 * dy;
        let incSup = 2 * (dy - dx);
        points.push([x, y]);

        while (x !== x2) {
            x += sx;
            if (p < 0) {
                p += incInf;
            } else {
                y += sy;
                p += incSup;
            }
            points.push([x, y]);
        }

    } else {
        let p = 2 * dx - dy;
        let incInf = 2 * dx;
        let incSup = 2 * (dx - dy);
        points.push([x, y]);

        while (y !== y2) {
            y += sy;
            if (p < 0) {
                p += incInf;
            } else {
                x += sx;
                p += incSup;
            }
            points.push([x, y]);
        }
    }

    return points;
}

// --------------------------------------------------
// CONVERSÃO CANVAS -> WEBGL
// --------------------------------------------------

function canvasToWebGL(x, y) {
    const webglX = (x / canvas.width) * 2 - 1;
    // O sinal é invertido porque o eixo Y do canvas cresce para baixo
    // e o do WebGL cresce para cima
    const webglY = -((y / canvas.height) * 2 - 1);
    return [webglX, webglY];
}

// --------------------------------------------------
// atualizar buffers e redesenhar linhas
// --------------------------------------------------

function updateBuffersAndDraw(points) {

    let verticesArray = [];
    for (const point of points) {
        const [wx, wy] = canvasToWebGL(point[0], point[1]);
        verticesArray.push(wx, wy);
    }
    vertices = new Float32Array(verticesArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const numPoints = points.length;
    const colorsArray = new Float32Array(numPoints * 3);
    const sizesArray = new Float32Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
        colorsArray[i * 3] = currentColor[0];
        colorsArray[i * 3 + 1] = currentColor[1];
        colorsArray[i * 3 + 2] = currentColor[2];
        sizesArray[i] = 10.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorsArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, pointSizesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizesArray, gl.STATIC_DRAW);

    drawScene();
}

// --------------------------------------------------
// FUNÇÃO 1: imprimir uma linha de qualquer ponto
// --------------------------------------------------

function drawLine(x1, y1, x2, y2) {
    lastLine = { x1, y1, x2, y2 };
    const points = bresenham(x1, y1, x2, y2);
    updateBuffersAndDraw(points);
}

// --------------------------------------------------
// FUNÇÃO 2: alterar a cor da linha
// --------------------------------------------------

function changeColor(index) {
    if (index < 0 || index > 9) return;

    currentColorIndex = index;
    currentColor = colorPalette[index];

    // Redesenha a linha atual (mesmas coordenadas), só muda a cor
    const points = bresenham(lastLine.x1, lastLine.y1, lastLine.x2, lastLine.y2);
    updateBuffersAndDraw(points);
}

// --------------------------------------------------
// INTERAÇÃO COM O MOUSE
// --------------------------------------------------

canvas.addEventListener("mousedown", mouseClick, false);

let firstPoint = null;
let secondPoint = null;

function mouseClick(event) {

    if (event.button !== 0) return; // só botão esquerdo

    const x = event.offsetX;
    const y = event.offsetY;

    canvasCoordinates.textContent = `Canvas: (${x}, ${y})`;

    const [webglX, webglY] = canvasToWebGL(x, y);
    webglCoordinates.textContent =
        `WebGL: (${webglX.toFixed(3)}, ${webglY.toFixed(3)})`;

    if ((firstPoint !== null && secondPoint !== null) || firstPoint === null) {
        firstPoint = { x, y };
        secondPoint = null;
        return; // só um ponto marcado ainda, nada a desenhar
    }

    secondPoint = { x, y };
    drawLine(firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y);
}

// --------------------------------------------------
//  (0 a 9 trocam a cor)
// --------------------------------------------------

document.addEventListener("keydown", (event) => {
    if (event.key >= "0" && event.key <= "9") {
        changeColor(Number(event.key));
    }
});

// --------------------------------------------------
// LIMPAR TELA
// --------------------------------------------------

gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// DESENHAR
// --------------------------------------------------

const numComponents = 2;

gl.useProgram(program);

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, vertices.length / numComponents);
}

// Linha inicial exigida: entre (0,0) e (0,0), na cor azul
drawLine(0, 0, 0, 0);
