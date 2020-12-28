'use strict';
const GLOBAL_SCALE = 50;
var Property = function () {
    this.CameraMode = 'Follow';
    this.DrawGrid = true;
    this.ShowAxis = true;
    this.PointSize = 1;
};
/* Color setting*/
const BACKGROUND_COLOR = "rgb(255, 255, 255)";

const property = new Property();

// initialize gui by dat.gui
function initGui() {
    const gui = new dat.GUI({width: 300});

    gui.add(property, 'CameraMode', ['Above', 'Follow', 'Bird', 'Subjective']).onChange(setCameraMode);
    gui.add(property, 'DrawGrid').onChange(setGridVis);
    gui.add(property, 'ShowAxis').onChange(setAxisVis);
    gui.add(property, 'PointSize', 0.0, 4.0, 0.1).onChange(setPointSize);
}

let scene, camera, renderer;
let grid;
let axis;
let clock = new THREE.Clock();

let mouseHandler;
let wheelHandler;
let viewControls;

let pointClouds = new PointClouds();

function init() {
    initGui();
    initTumbnail();

    // create a scene, that holds all elements such as cameras and points.
    scene = new THREE.Scene();

    // create a camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);

    // create a render and set the setSize
    renderer = new THREE.WebGLRenderer({antialias: false});
    renderer.setClearColor(new THREE.Color(BACKGROUND_COLOR));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // create grid plane
    grid = new THREE.GridHelper(500, 50);
    scene.add(grid);

    axis = new THREE.AxesHelper(10);
    scene.add(axis)


    // position and point the camera to the center of the scene
    camera.position.x = -100;
    camera.position.y = 60;
    camera.position.z = 30;
    camera.rotation.x = 0;
    camera.rotation.y = 0;
    camera.rotation.z = 0;

    let lineGeo = new THREE.Geometry();
    for (let i = 0; i < 16; i++) {
        lineGeo.vertices.push(new THREE.Vector3(0, 0, 0));
    }

    // add the output of the renderer to the html element
    // this line must be before initialization TrackBallControls(othrewise, dat.gui won't be work).
    document.getElementById("WebGL-output").appendChild(renderer.domElement);

    // create a view controller that
    viewControls = new ViewControls(camera);

    // create a mouse action listener
    let mouseListener = function (btn, act, pos, vel) {
        if (btn == 0 && act != 0) {
            viewControls.addRot(vel[0], vel[1]);
        } else if (btn == 2 && act != 0) {
            viewControls.addMove(vel[0], vel[1])
        }
    };
    // create a mouse wheel action listener
    let wheelListener = function (rot) {
        viewControls.addZoom(rot);
    };
    mouseHandler = new MouseHandler(renderer.domElement, mouseListener);
    wheelHandler = new WheelHandler(renderer.domElement, wheelListener);
    setCameraMode(property.CameraMode);
    viewControls.update(100);
    render();
}

function ParasePointCloudMsg(msg) {
    if (msg.length == 0) {
        return;
    }
    const buffer = Base64ToUint8Array(msg);

    const is_bigendian = buffer[0] === Endianness();
    let frame_id = "";
    for (let i = 0; i < 8; i++) {
        frame_id += String.fromCharCode(buffer[5 + i]);
    }
    const r = buffer[13];
    const g = buffer[14];
    const b = buffer[15];

    let points = [];
    const length = ((buffer[1] & 0xFF) << 24) | ((buffer[2] & 0xFF) << 16) | ((buffer[3] & 0xFF) << 8) | (buffer[4] & 0xFF) - 16;
    if (length % 12 === 0) {
        const points_cnt = length / 12;
        for (let i = 0; i < points_cnt; i++) {
            let p = [];
            for (let j = 0; j < 3; j++) {
                let val;
                if (is_bigendian) {
                    val = ((buffer[16+ i * 12 + j * 4 + 3] & 0xFF) << 24) | ((buffer[16+ i * 12 + j * 4 + 2] & 0xFF) << 16) | ((buffer[16+ i * 12 + j * 4 + 1] & 0xFF) << 8) | (buffer[16+ i * 12 + j * 4 + 0] & 0xFF);
                } else {
                    val = ((buffer[16+ i * 12 + j * 4 + 0] & 0xFF) << 24) | ((buffer[16+ i * 12 + j * 4 + 1] & 0xFF) << 16) | ((buffer[16+ i * 12 + j * 4 + 2] & 0xFF) << 8) | (buffer[16+ i * 12 + j * 4 + 3] & 0xFF);
                }

                const sign = (val & 0x80000000) ? -1 : 1;
                const exponent = ((val >> 23) & 0xFF) - 127;
                var mantissa = 1 + ((val & 0x7FFFFF) / 0x7FFFFF);
                p[j] = sign * mantissa * Math.pow(2, exponent);
            }
            points.push(new THREE.Vector3(p[0], p[1], p[2]));
        }
    }
    pointClouds.AddPointCloud(frame_id, points.slice(1), r, g, b);
}

function Base64ToUint8Array(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

let thumbEnlarge = false; // if thumbnail is clicked, that is enlarged and this flag is set
const THUMB_SCALING = 4; // thumbnail scaling magnification
const THUMB_HEIGHT = 96; // normally thumbnail height (width is doubled height)
const CANVAS_SIZE = [2048, 1024]; // thumbnail image resolution
function initTumbnail() {
    let thumb = document.getElementById("thumb");
    thumb.style.width = THUMB_HEIGHT * 2 + 'px';
    thumb.style.height = THUMB_HEIGHT + 'px';
    thumb.style.transition = 'all 0.5s ease-in-out'; // enable animation when enlarge and shrinking
    thumb.style.zIndex = '10001'; // thumbnail is drawn over two stats
    thumb.setAttribute("width", CANVAS_SIZE[0]);
    thumb.setAttribute("height", CANVAS_SIZE[1]);
    thumb.addEventListener('click', onThumbClick);
}

function onThumbClick() {

    thumbEnlarge = !thumbEnlarge; // inverse flag
    if (!thumbEnlarge) {
        document.getElementById("thumb").style.transform = 'translate(0px, 0px) scale(1)';
    } else {
        let x = THUMB_HEIGHT * (THUMB_SCALING - 1);
        let y = THUMB_HEIGHT / 2 * (THUMB_SCALING - 1);
        document.getElementById("thumb").style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + THUMB_SCALING + ')';
    }
}

function setCameraMode(val) {
    let suffix = "_rot";
    if (property.FixAngle) {
        suffix = "_fix";
    }
    viewControls.setMode(val + suffix);
}

function setGridVis(val) {
    grid.visible = val;
}

function setAxisVis(val) {
    axis.visible = val;
}

function setPointSize(val) {
    pointClouds.SetPointSize(val);
}

// render method that updates each stats, camera frames, view controller, and renderer.
function render() {
    let delta = clock.getDelta();
    viewControls.update(delta);
    pointClouds.Update(scene);

    // render using requestAnimationFrame
    requestAnimationFrame(render);
    // render the Scene
    renderer.render(scene, camera);
}

// window resize function
// The function is called in index.ejs
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function Endianness() {
    let uInt32 = new Uint32Array([0xFF00]);
    let uInt8 = new Uint8Array(uInt32.buffer);
    return uInt8[0];
};

function HexAndFloat(is_bigendian) {

}