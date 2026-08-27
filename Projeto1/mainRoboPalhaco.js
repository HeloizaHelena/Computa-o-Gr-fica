(function () {
const canvas = document.getElementById("glCanvasFan");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}


// --------------------------------------------------
// 3. VERTEX SHADER
// --------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
// --------------------------------------------------
// 4. FRAGMENT SHADER
// --------------------------------------------------
const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() {
    outColor = uColor;
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

gl.useProgram(program);

// --------------------------------------------------
// 7. LOCAIS
// --------------------------------------------------

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");

// --------------------------------------------------
// 8. CONFIGURAR ATRIBUTO
// --------------------------------------------------
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// --------------------------------------------------
// 9. LIMPAR TELA
// --------------------------------------------------
gl.clearColor(0.1, 0.2, 0.5, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// FUNÇÃO: CÍRCULO (TRIANGLE_FAN)
// --------------------------------------------------
function desenharCirculo(cx, cy, radius, numSides, r, g, b) {
    const vertices = [cx, cy]; // centro

    for (let i = 0; i <= numSides; i++) {
        const angle = i * 2 * Math.PI / numSides;
        vertices.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }

    const data = new Float32Array(vertices);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, r, g, b, 1.0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSides + 2);
}

// --------------------------------------------------
// FUNÇÃO: TRIÂNGULOS 
// --------------------------------------------------
function desenharGrupo(verticesArray, r, g, b) {
    if (!verticesArray || verticesArray.length === 0) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, r, g, b, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, verticesArray.length / 2);
}

// --------------------------------------------------
// vértices
// --------------------------------------------------
const vQuadrado = new Float32Array([ //rosto
    -0.5,  0.5,
     0.5,  0.5,
    -0.5, -0.5,

    -0.5, -0.5,
     0.5,  0.5,
     0.5, -0.5,
]);

const vChapeuesq = new Float32Array([
    -0.37, 0.5,
    0.0, 0.5,
    0.0, 0.95,

]);

const vChapeudir = new Float32Array([
    0.37, 0.5,
    0.0, 0.5,
    0.0, 0.95,

]);

const vGravatab = new Float32Array([
    -0.25, -0.67,
    -0.25, -0.5,
    0.0, -0.6,

    0.25, -0.67,
    0.25, -0.5,
    0.0, -0.6
]);

const vGravata = new Float32Array([
    -0.25, -0.65,
    -0.25, -0.5,
    0.0, -0.55,

    0.25, -0.65,
    0.25, -0.5,
    0.0, -0.55
]);

const vBoca = new Float32Array([
    -0.25, -0.35,
    -0.25, -0.4,
    0.25, -0.4,

    0.25, -0.35,
    0.25, -0.4,
    -0.25, -0.35
]);

const vOculos = new Float32Array([
    -0.4, 0.35,
    -0.4, 0.0,
    0.4, 0.35,

    0.4, 0.0,
    0.4, 0.35,
    -0.4, 0.0
]);

const vOculosFrente = new Float32Array([
    -0.36, 0.32,
    -0.36, 0.02,
    0.36, 0.32,

    0.36, 0.02,
    0.36, 0.32,
    -0.36, 0.02
]);

const vTriangNariz = new Float32Array([
    -0.15, 0.0,
    0.15, 0.0,
    0.0, 0.12
]);





desenharGrupo(vQuadrado, 0.6, 0.6, 0.65); // quadrado

desenharGrupo(vChapeuesq, 1, 0, 0);  //chapeu

desenharGrupo(vChapeudir, 1, 1, 0);  //chapeu

desenharGrupo(vGravatab, 0.0, 0.60, 0.3);  //gravata baixo
desenharGrupo(vGravata, 0.3, 0.80, 0.2);  //gravata cima

desenharCirculo(0.0, -0.60, 0.1, 40, 0.0, 0.60, 0.3); // círculo gravata sombra
desenharCirculo(0.00, -0.58, 0.08, 40, 0.3, 0.80, 0.2); // círculo gravata



//desenharCirculo(0.0, -0.28, 0.18, 40, 0.70, 0.0, 0.0); // sorriso
//desenharCirculo(0.0, -0.23, 0.2, 40, 0.98, 0.93, 0.8); // cobertura boca

desenharGrupo(vBoca, 0.9, 0.8, 0.0);

desenharCirculo(0.0, -0.12, 0.12, 40, 0.70, 0.0, 0.0); // nariz base
desenharCirculo(0.0, -0.1, 0.1, 40, 0.85, 0.08, 0.0); // nariz claro
desenharCirculo(0.07, -0.06, 0.02, 40, 1, 0.95, 0.95); // nariz brilho

desenharGrupo(vOculos, 0.2, 0.2, 0.2); //base óculos
desenharGrupo(vOculosFrente, 0.47, 0.47, 0.47); //Oculos frente
desenharGrupo(vTriangNariz, 0.6, 0.6, 0.65); //triangulo do oculos

desenharCirculo(0.25, 0.17, 0.1, 40, 0.9, 0.1, 0.0); // base olho dir
desenharCirculo(0.25, 0.17, 0.03, 40, 1 , 1, 0); // iris olho dir
desenharCirculo(-0.25, 0.17, 0.1, 40, 0.9, 0.1, 0.0); // base olho esq
desenharCirculo(-0.25, 0.17, 0.03, 40, 1 , 1, 0); // iris olho esq


desenharCirculo(0.56, 0.5, 0.20, 40, 1, 0.57, 0.1); // cabelo laranja 1dir
desenharCirculo(0.75, 0.35, 0.18, 40, 1, 0.57, 0.1); // cabelo laranja 2dir
desenharCirculo(0.62, 0.25, 0.15, 40, 1, 0.57, 0.1); // cabelo laranja 3dir

desenharCirculo(-0.56, 0.5, 0.20, 40, 1, 0.57, 0.1); // cabelo laranja 1esq
desenharCirculo(-0.75, 0.35, 0.18, 40, 1, 0.57, 0.1); // cabelo laranja 2esq
desenharCirculo(-0.62, 0.25, 0.15, 40, 1, 0.57, 0.1); // cabelo laranja 3esq


})();
