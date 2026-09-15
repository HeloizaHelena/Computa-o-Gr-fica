const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource = `#version 300 es

in vec2 aPosition;

uniform mat3 u_viewTransform;
uniform mat3 u_modelTransform;

void main() {

    vec3 position =
        u_viewTransform *
        u_modelTransform *
        vec3(aPosition, 1.0);

    gl_Position =
        vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

uniform vec3 uColor;

out vec4 outColor;

void main() {

    outColor =
        vec4(uColor, 1.0);
}
`;

function createShader(gl, type, source) {

    const shader =
        gl.createShader(type);

    gl.shaderSource(
        shader,
        source
    );

    gl.compileShader(shader);

    if (
        !gl.getShaderParameter(
            shader,
            gl.COMPILE_STATUS
        )
    ) {

        const error =
            gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(error);
    }

    return shader;
}

function createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource
) {

    const vertexShader =
        createShader(
            gl,
            gl.VERTEX_SHADER,
            vertexShaderSource
        );

    const fragmentShader =
        createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );

    const program =
        gl.createProgram();

    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );

    gl.linkProgram(program);

    if (
        !gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        )
    ) {

        throw new Error(
            gl.getProgramInfoLog(program)
        );
    }

    return program;
}


const program =
    createProgram(
        gl,
        vertexShaderSource,
        fragmentShaderSource
    );


// ==================================================
// CLASSE RENDERER
// ==================================================

class Renderer {

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.positionLocation =
            gl.getAttribLocation(
                program,
                "aPosition"
            );

        this.colorLocation =
            gl.getUniformLocation(
                program,
                "uColor"
            );

        this.viewTransformLocation =
            gl.getUniformLocation(
                program,
                "u_viewTransform"
            );

        this.modelTransformLocation =
            gl.getUniformLocation(
                program,
                "u_modelTransform"
            );

        this.viewTransform =
            m3.identity();

        this.verticesBuffer =
            gl.createBuffer();
    }

    defineViewTransform(viewTransform) {
        this.viewTransform =
            viewTransform;
    }

    draw(object) {
        const gl = this.gl;

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            this.verticesBuffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            object.vertices,
            gl.STATIC_DRAW
        );

        gl.enableVertexAttribArray(
            this.positionLocation
        );

        gl.vertexAttribPointer(
            this.positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.uniform3fv(
            this.colorLocation,
            object.color
        );

        gl.uniformMatrix3fv(
            this.modelTransformLocation,
            false,
            object.modelTransform
        );

        gl.uniformMatrix3fv(
            this.viewTransformLocation,
            false,
            this.viewTransform
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            object.vertices.length / 2
        );
    }
}

// ==================================================
// AUXILIARY FUNCTIONS
// ==================================================

function rectangleVertices(x,y,width,height){
    return [
        x, y,
        x+width, y+height,
        x, y+height,

        x, y,
        x+width, y,
        x+width, y+height
    ];
}

function circleVertices(radius,numSegments){
    const vertices = [];

    for (let i = 0; i < numSegments; i++) {
        const theta1 =
            (i / numSegments) *
            2 * Math.PI;

        const theta2 =
            ((i + 1) / numSegments) *
            2 * Math.PI;


        vertices.push(
            0,
            0
        );

        vertices.push(
            radius * Math.cos(theta1),
            radius * Math.sin(theta1)
        );


        vertices.push(
            radius * Math.cos(theta2),
            radius * Math.sin(theta2)
        );
    }

    return vertices;
}




// ==================================================
// ROBO VERTICES
// ==================================================
function torsoVertices() {
    // largura 1, altura 2, centrado em (0,0)
    return new Float32Array(rectangleVertices(-0.25, -0.5, 0.5, 1.0));
}


function joints(){
    return new Float32Array(circleVertices(0.072, 56));
}

function limbVertices() {
    // um "braço"/"perna" fino e comprido, com a ARTICULAÇÃO na origem
    // (largura pequena, altura negativa pra ele "pendurar" abaixo do pivô)
    return new Float32Array(rectangleVertices(-0.05, -0.5, 0.1, 0.5));
}

function upperLimbVertices(length, width) {
    // pivô no topo (junta com o torso), estende para baixo
    return new Float32Array(rectangleVertices(-width/2, -length, width, length));
}

function lowerLimbVertices(length, width) {
    // mesmo formato, mas o pivô agora é o cotovelo/joelho
    return new Float32Array(rectangleVertices(-width/2, -length, width, length));
}

function handVertices() {
    return new Float32Array(circleVertices(0.08, 24));
}

function footVertices(length, height) {
    // Se length for negativo, o pé começa recuado para a esquerda e vai até 0
    const startX = length >= 0 ? -0.02 : 0.02 - Math.abs(length);
    return new Float32Array(rectangleVertices(startX, -height, Math.abs(length), height));
}


// ==================================================
// CLASSE SCENE OBJECT
// ==================================================

class SceneObject {
    constructor(vertices, color) {
        this.vertices = vertices;
        this.color = color;
        this.modelTransform = m3.identity();
    }
}

class Limb extends SceneObject {
    constructor(color, jointX, jointY, jointColor) {
        super(limbVertices(), color);
        this.jointX = jointX;
        this.jointY = jointY;
        this.theta = 0.0;

        // a junta é um SceneObject próprio, sempre na mesma posição do pivô
        this.joint = new SceneObject(joints(), jointColor);
    }

    updateModelTransform(robotModelTransform) {
        const pivotTranslation = m3.translation(this.jointX, this.jointY);

        const localTransform = m3.multiply(
            pivotTranslation,
            m3.rotation(this.theta)
        );

        this.modelTransform = m3.multiply(robotModelTransform, localTransform);

        // a junta só translada (não rotaciona com o membro, fica "fixa" no pivô)
        this.joint.modelTransform = m3.multiply(robotModelTransform, pivotTranslation);
    }

    draw(renderer) {
        renderer.draw(this);
        renderer.draw(this.joint);
    }
}

// ==================================================
// FUNÇÕES AUXILIARES DA CABEÇA
// ==================================================

// Converte a chamada de círculo com centro deslocado (cx, cy) para Float32Array de TRIANGLES
function offsetCircleVertices(cx, cy, radius, numSegments = 32) {
    const vertices = [];
    for (let i = 0; i < numSegments; i++) {
        const theta1 = (i / numSegments) * 2 * Math.PI;
        const theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(cx, cy);
        vertices.push(cx + radius * Math.cos(theta1), cy + radius * Math.sin(theta1));
        vertices.push(cx + radius * Math.cos(theta2), cy + radius * Math.sin(theta2));
    }
    return new Float32Array(vertices);
}

// ==================================================
// CLASSE HEAD COMPOSTA
// ==================================================
class Head {
    constructor(scale = 0.55) {
        this.scale = scale;
        this.parts = [];

        // 1. Rosto (Quadrado)
        this.parts.push(new SceneObject(new Float32Array([
            -0.5,  0.5,   0.5,  0.5,  -0.5, -0.5,
            -0.5, -0.5,   0.5,  0.5,   0.5, -0.5
        ]), new Float32Array([0.6, 0.6, 0.65])));

        // 2. Chapéu (esquerdo e direito)
        this.parts.push(new SceneObject(new Float32Array([
            -0.37, 0.5,   0.0, 0.5,   0.0, 0.95
        ]), new Float32Array([1.0, 0.0, 0.0])));

        this.parts.push(new SceneObject(new Float32Array([
            0.37, 0.5,    0.0, 0.5,   0.0, 0.95
        ]), new Float32Array([1.0, 1.0, 0.0])));

        // 3. Gravata (fundo e frente)
        this.parts.push(new SceneObject(new Float32Array([
            -0.25, -0.67,  -0.25, -0.5,   0.0, -0.6,
             0.25, -0.67,   0.25, -0.5,   0.0, -0.6
        ]), new Float32Array([0.0, 0.60, 0.3])));

        this.parts.push(new SceneObject(new Float32Array([
            -0.25, -0.65,  -0.25, -0.5,   0.0, -0.55,
             0.25, -0.65,   0.25, -0.5,   0.0, -0.55
        ]), new Float32Array([0.3, 0.80, 0.2])));

        // Nós da gravata
        this.parts.push(new SceneObject(offsetCircleVertices(0.0, -0.60, 0.1, 24), new Float32Array([0.0, 0.60, 0.3])));
        this.parts.push(new SceneObject(offsetCircleVertices(0.0, -0.58, 0.08, 24), new Float32Array([0.3, 0.80, 0.2])));

        // 4. Boca
        this.parts.push(new SceneObject(new Float32Array([
            -0.25, -0.35,  -0.25, -0.4,   0.25, -0.4,
             0.25, -0.35,   0.25, -0.4,  -0.25, -0.35
        ]), new Float32Array([0.9, 0.8, 0.0])));

        // 5. Nariz (base, claro, brilho)
        this.parts.push(new SceneObject(offsetCircleVertices(0.0, -0.12, 0.12, 24), new Float32Array([0.70, 0.0, 0.0])));
        this.parts.push(new SceneObject(offsetCircleVertices(0.0, -0.10, 0.10, 24), new Float32Array([0.85, 0.08, 0.0])));
        this.parts.push(new SceneObject(offsetCircleVertices(0.07, -0.06, 0.02, 16), new Float32Array([1.0, 0.95, 0.95])));

        // 6. Óculos
        this.parts.push(new SceneObject(new Float32Array([
            -0.4, 0.35,   -0.4, 0.0,    0.4, 0.35,
             0.4, 0.0,     0.4, 0.35,  -0.4, 0.0
        ]), new Float32Array([0.2, 0.2, 0.2])));

        this.parts.push(new SceneObject(new Float32Array([
            -0.36, 0.32,  -0.36, 0.02,   0.36, 0.32,
             0.36, 0.02,   0.36, 0.32,  -0.36, 0.02
        ]), new Float32Array([0.47, 0.47, 0.47])));

        // Triângulo do óculos
        this.parts.push(new SceneObject(new Float32Array([
            -0.15, 0.0,   0.15, 0.0,   0.0, 0.12
        ]), new Float32Array([0.6, 0.6, 0.65])));

        // 7. Olhos
        this.parts.push(new SceneObject(offsetCircleVertices(0.25, 0.17, 0.1, 24), new Float32Array([0.9, 0.1, 0.0])));
        this.parts.push(new SceneObject(offsetCircleVertices(0.25, 0.17, 0.03, 16), new Float32Array([1.0, 1.0, 0.0])));
        this.parts.push(new SceneObject(offsetCircleVertices(-0.25, 0.17, 0.1, 24), new Float32Array([0.9, 0.1, 0.0])));
        this.parts.push(new SceneObject(offsetCircleVertices(-0.25, 0.17, 0.03, 16), new Float32Array([1.0, 1.0, 0.0])));

        // 8. Cabelo Laranja (Lado Direito e Esquerdo)
        const hairColor = new Float32Array([1.0, 0.57, 0.1]);
        this.parts.push(new SceneObject(offsetCircleVertices( 0.56, 0.50, 0.20, 20), hairColor));
        this.parts.push(new SceneObject(offsetCircleVertices( 0.75, 0.35, 0.18, 20), hairColor));
        this.parts.push(new SceneObject(offsetCircleVertices( 0.62, 0.25, 0.15, 20), hairColor));

        this.parts.push(new SceneObject(offsetCircleVertices(-0.56, 0.50, 0.20, 20), hairColor));
        this.parts.push(new SceneObject(offsetCircleVertices(-0.75, 0.35, 0.18, 20), hairColor));
        this.parts.push(new SceneObject(offsetCircleVertices(-0.62, 0.25, 0.15, 20), hairColor));
    }

    update(robotTransform) {
        // Posiciona a cabeça acima do tronco (y = 1.35) e aplica a escala
        const headTransform = m3.multiply(
            robotTransform,
            m3.multiply(
                m3.translation(0.0, 0.9),
                m3.scaling(this.scale, this.scale)
            )
        );

        // Aplica a mesma matriz a todas as subpartes
        for (const part of this.parts) {
            part.modelTransform = headTransform;
        }
    }

    draw(renderer) {
        for (const part of this.parts) {
            renderer.draw(part);
        }
    }
}

// ==================================================
// CLASSE WAIST (Cintura composta)
// ==================================================
class Waist {
    constructor(width = 0.44, height = 0.16, ballRadius = 0.08, bodyColor, ballColor) {
        this.parts = [];

        // 1. Retângulo central (centrado na origem)
        const rectData = new Float32Array(
            rectangleVertices(-width / 2, -height / 2, width, height)
        );
        this.parts.push(new SceneObject(rectData, bodyColor));

        // 2. Bola esquerda (encaixe da perna esquerda)
        const leftBallData = offsetCircleVertices(-width / 2, 0.0, ballRadius, 28);
        this.parts.push(new SceneObject(leftBallData, ballColor));

        // 3. Bola direita (encaixe da perna direita)
        const rightBallData = offsetCircleVertices(width / 2, 0.0, ballRadius, 28);
        this.parts.push(new SceneObject(rightBallData, ballColor));

        this.modelTransform = m3.identity();
    }

    update(robotTransform, yPos = -1.0) {
        // Posiciona a cintura na base do tronco
        const waistTransform = m3.multiply(
            robotTransform,
            m3.translation(0.0, yPos)
        );

        for (const part of this.parts) {
            part.modelTransform = waistTransform;
        }
    }

    draw(renderer) {
        for (const part of this.parts) {
            renderer.draw(part);
        }
    }
}
// ===================================================
// CLASSE ARM
// ===================================================
class Arm {
    constructor(shoulderX, shoulderY, restAngle, swingSign, color, jointColor, side = 1) {
        this.shoulderX = shoulderX;
        this.shoulderY = shoulderY;
        this.restAngle = restAngle;
        this.swingSign = swingSign;
        this.side = side; // +1 = direita, -1 = esquerda
        this.swingAmplitude = 0.3;
        this.upperLength = 0.35;
        this.forearmLength = 0.5;

        // Dobra espelhada
        this.forearmBend = (135 * Math.PI / 180) * this.side;

        this.upperArm = new SceneObject(upperLimbVertices(this.upperLength, 0.08), color);
        this.shoulderJoint = new SceneObject(joints(), jointColor);
        this.forearm = new SceneObject(lowerLimbVertices(this.forearmLength, 0.06), color);
        this.elbowJoint = new SceneObject(joints(), jointColor);
        this.hand = new SceneObject(handVertices(), jointColor);
    }

    update(robotTransform, phase) {
       const theta = this.restAngle + this.swingSign * this.side * Math.sin(phase) * this.swingAmplitude;

        const shoulderTranslation = m3.translation(this.shoulderX, this.shoulderY);
        const upperArmTransform = m3.multiply(
            robotTransform,
            m3.multiply(shoulderTranslation, m3.rotation(theta))
        );

        this.upperArm.modelTransform = upperArmTransform;
        this.shoulderJoint.modelTransform = m3.multiply(robotTransform, shoulderTranslation);

        const elbowTranslation = m3.translation(0, -this.upperLength);
        const forearmTransform = m3.multiply(
            upperArmTransform,
            m3.multiply(elbowTranslation, m3.rotation(this.forearmBend))
        );

        this.forearm.modelTransform = forearmTransform;
        this.elbowJoint.modelTransform = m3.multiply(upperArmTransform, elbowTranslation);

        const handTranslation = m3.translation(0, -this.forearmLength);
        this.hand.modelTransform = m3.multiply(forearmTransform, handTranslation);
    }

    draw(renderer) {
        renderer.draw(this.upperArm);
        renderer.draw(this.shoulderJoint);
        renderer.draw(this.forearm);
        renderer.draw(this.elbowJoint);
        renderer.draw(this.hand);
    }
}

// ==================================================
// CLASSE LEG
// ==================================================
class Leg {
    constructor(hipX, hipY, swingSign, color, jointColor, side = 1) {
        this.hipX = hipX;
        this.hipY = hipY;
        this.swingSign = swingSign;
        this.side = side; // +1 = direita, -1 = esquerda

        this.baseAngle = (45 * Math.PI / 180) * this.side;
        this.swingAmplitude = 20 * Math.PI / 180;

        this.upperLength = 0.30;
        this.lowerLength = 0.45;

        this.upperLeg = new SceneObject(upperLimbVertices(this.upperLength, 0.1), color);
        this.hipJoint = new SceneObject(joints(), jointColor);
        this.lowerLeg = new SceneObject(lowerLimbVertices(this.lowerLength, 0.09), color);
        this.kneeJoint = new SceneObject(joints(), jointColor);
        this.foot = new SceneObject(footVertices(0.2 * this.side, 0.05), jointColor);
    }

    update(robotTransform, phase) {
       const theta = this.baseAngle + this.swingSign * this.side * Math.sin(phase) * this.swingAmplitude;
        const hipTranslation = m3.translation(this.hipX, this.hipY);
        const upperLegTransform = m3.multiply(
            robotTransform,
            m3.multiply(hipTranslation, m3.rotation(theta))
        );

        this.upperLeg.modelTransform = upperLegTransform;
        this.hipJoint.modelTransform = m3.multiply(robotTransform, hipTranslation);

        const kneeTranslation = m3.translation(0, -this.upperLength);
        const lowerLegTransform = m3.multiply(
            upperLegTransform,
            m3.multiply(kneeTranslation, m3.rotation(-theta))
        );

        this.lowerLeg.modelTransform = lowerLegTransform;
        this.kneeJoint.modelTransform = m3.multiply(upperLegTransform, kneeTranslation);

        const footTranslation = m3.translation(0, -this.lowerLength);
        this.foot.modelTransform = m3.multiply(lowerLegTransform, footTranslation);
    }

    draw(renderer) {
        renderer.draw(this.upperLeg);
        renderer.draw(this.hipJoint);
        renderer.draw(this.lowerLeg);
        renderer.draw(this.kneeJoint);
        renderer.draw(this.foot);
    }
}
// ==================================================
// CLASSE ROBOT
// ==================================================

class Robot {
    constructor(tx, ty) {
        this.tx = tx;
        this.ty = ty;

        const limbColor = new Float32Array([0.2, 0.2, 0.2]);
        const jointColor = new Float32Array([0.5, 0.5, 0.5]);

        this.torso = new SceneObject(torsoVertices(), new Float32Array([0.2, 0.22, 0.2]));

        // Nova cabeça composta (com escala 0.55 para caber no corpo)
        this.head = new Head(0.6);

        // Cria a cintura posicionada entre o tronco e as pernas
        this.waist = new Waist(0.35, 0.3, 0.15, limbColor, [0.2, 0.2, 0.2]);

        const armAngle = -25 * Math.PI / 180;

        this.rightArm = new Arm( 0.25,  0.25, -armAngle, +1, limbColor, jointColor,  1);
        this.rightLeg = new Leg( 0.15, -0.88,            +1, limbColor, jointColor,  1);
        this.leftArm  = new Arm(-0.25,  0.25,  armAngle, -1, limbColor, jointColor, -1);
        this.leftLeg  = new Leg(-0.15, -0.88,            -1, limbColor, jointColor, -1);
    }

    animate(t) {
        const robotTransform = m3.translation(this.tx, this.ty);

        this.torso.modelTransform = robotTransform;
        
        // Atualiza a cabeça inteira
        this.head.update(robotTransform);
        this.waist.update(robotTransform, -0.7); // Anima junto com o corpo

        this.rightArm.update(robotTransform, t);
        this.leftArm.update(robotTransform, t);
        this.rightLeg.update(robotTransform, t);
        this.leftLeg.update(robotTransform, t);
    }

    draw(renderer) {
        renderer.draw(this.torso);
        this.head.draw(renderer); // desenha todas as camadas na ordem correta
        this.waist.draw(renderer); // Desenha a cintura
        this.rightArm.draw(renderer);
        this.leftArm.draw(renderer);
        this.rightLeg.draw(renderer);
        this.leftLeg.draw(renderer);
    }
}
// ==================================================
// CLASSE SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl, program);

        this.viewTransform = m3.setClippingWindow(-2.0, -2.0, 2.0, 2.0);

        this.renderer.defineViewTransform(this.viewTransform);

        this.robot = new Robot(0.0, 0.0);

        this.time = 0.0;
    }

    update() {
        this.time += 0.05;
        this.robot.animate(this.time);
    }

    draw() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        this.robot.draw(this.renderer);
    }

    execute() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.execute());
    }

    init() {
        requestAnimationFrame(() => this.execute());
    }
}

// ==================================================
// CONFIGURAÇÃO INICIAL DO WEBGL
// ==================================================

gl.clearColor(
    0.1,
    0.1,
    0.1,
    1.0
);

gl.viewport(
    0,
    0,
    canvas.width,
    canvas.height
);


// ==================================================
// CRIAR CENA
// ==================================================

const scene =
    new Scene(gl,program);


// ==================================================
// INICIAR ANIMAÇÃO
// ==================================================

scene.init();
