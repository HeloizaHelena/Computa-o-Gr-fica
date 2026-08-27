(function () {

const canvas = document.getElementById("canvasCarro");
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
gl.clearColor(0.1, 0.1, 0.1, 1.0);
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
const vBase = new Float32Array([ //rosto
    -0.75, -0.5,
    -0.75, 0.0,
    0.5, -0.5,

    0.5, 0.0,
    0.5, -0.5,
    -0.75, 0.0
]);

const vFrente = new Float32Array([
    0.5, -0.5,
    0.5, 0.0,
    0.86, -0.16,

    0.81, -0.5,
    0.86, -0.16,
    0.5, -0.5
]);

const vVidros = new Float32Array([
    -0.65, 0.0,
    0.0, 0.0,
    -0.25, 0.37,

    0.0, 0.0,
    0.5, 0.0,
    0.25, 0.37
]);

const vTopo = new Float32Array([
    -0.25, 0.37,
    0.25, 0.37,
    0.0, 0.0
])

desenharGrupo(vBase, 0.7, 0.0, 0.1);  //base 
desenharGrupo(vFrente, 0.7, 0.0, 0.1);  //frente

desenharGrupo(vVidros, 0.85, 0.85, 1);  //vidros
desenharGrupo(vTopo, 0.7, 0.0, 0.1);  //frente

desenharCirculo(0.81, -0.325, 0.175, 40, 0.7, 0.0, 0.1); // círculo bico

desenharCirculo(0.87, -0.25, 0.05, 40, 1, 0.8, 0.0); // círculo lanterna

desenharCirculo(-0.65, -0.25, 0.26, 40, 0.7, 0.0, 0.1); // círculo trás

desenharCirculo(-0.5, -0.45, 0.2, 40, 0.1, 0.1, 0.2); // roda esq
desenharCirculo(-0.5, -0.45, 0.12, 40, 0.8, 0.8, 0.8); // roda dentro esq

desenharCirculo(0.5, -0.45, 0.2, 40, 0.1, 0.1, 0.2); // roda dir
desenharCirculo(0.5, -0.45, 0.12, 40, 0.8, 0.8, 0.8); // roda  dentro dir

})();
