/* 
Hector Mauricio Gonzalez Coello
A01328258
*/
var renderer = null, 
scene = null, 
camera = null,
root = null,
enemy= null,
group = null,
orbitControls = null,
mixer = null;

var duration = 1000; // ms
var currentTime = Date.now();
var now = null;
var enemies = [];

var score = 0;
var timer = 0;

var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;
var raycaster;

var canvas;

var isGameLoaded = false;
var isPlaying = false;

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function loadFBX()
{
    var loader = new THREE.FBXLoader();
    loader.load( 'models/Robot/robot_idle.fbx', function ( object )  {
        enemy = object;
        spawnEnemies();
        run();
    } );
}

function spawnEnemies() {
    for(let i=0; i<10; i++) {
        var spawnedEnemy = cloneFbx(enemy);

        spawnedEnemy.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        spawnedEnemy.scale.set(0.03, 0.03, 0.03);
        spawnedEnemy.position.x = Math.floor(Math.random() * (100 - -100 + 1)) + -100;
        spawnedEnemy.position.z = Math.floor(Math.random() * (0 - -100 + 1)) + -100;;
        spawnedEnemy.name = "Robot " + i;

        createIdleAnimation(spawnedEnemy);
        createDeadAnimation(spawnedEnemy);

        spawnedEnemy.idle.start();
        scene.add(spawnedEnemy);

        spawnedEnemy.mixer = new THREE.AnimationMixer( scene );
        spawnedEnemy.mixer.clipAction(spawnedEnemy.animations[ 0 ], spawnedEnemy ).play();
        spawnedEnemy.active = true;
        enemies.push(spawnedEnemy);
    }
}
function play() {
    isPlaying = true;
    timer = Date.now() + 5000;
    score = 0;
    minimumScore = Math.floor(Math.random() * (50 - 5 + 1)) + 5;
    $("#mission").html("Command Center: Your mission, kill " + minimumScore + ' robots!!');
    $("#mission").css("visibility", "visible");
    $("#resetButton").css("visibility", "visible");
    $("#playButton").css("visibility", "hidden");
    restartGame();
}

function playGame(){
    let time_left = Math.round((timer - Date.now())/1000);
    $("#timer").html("Time: " + time_left);
}

function updateTimer(){
    let time_left = Math.round((timer - Date.now())/1000);
    $("#timer").html("Time: " + time_left);
    if(time_left <= 0) {
        if(minimumScore <= score)
        {
            $("#gameStat").html("You Win!!!");
            $("#gameStat").css("visibility", "visible");
        }
        else
        {
            $("#gameStat").html("You Loose!!!");
            $("#gameStat").css("visibility", "visible");
        }
        isPlaying = false;
    }
}

function restartGame() {
    timer = Date.now() + 30000;
    score = 0;
    minimumScore = Math.floor(Math.random() * (50 - 5 + 1)) + 5;
    $("#mission").html("Command Center: Your mission, kill " + minimumScore + ' robots!!');
    isPlaying = true;
    $("#mission").css("visibility", "visible");
    $("#gameStat").html("Playing...Good Luck Chief!!!");
    $("#score").html("Total Kills: " + score);
    if(!isGameLoaded) {
        isGameLoaded = true;
        loadFBX();
    }
}
function animate() {
    now = Date.now();
    let deltat = now - currentTime;
    currentTime = now;
    enemies.forEach(function(robot) {
        robot.mixer.update(deltat * 0.001);
    })
    KF.update();
}


function run() {
    requestAnimationFrame(function(){ run();});
    // Render the scene
    renderer.render(scene, camera);

    // Spin the cube for next frame
    animate();
    if(isPlaying)
    {
        updateTimer();
    }
}

function createDeadAnimation(enemy) {
    let animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, 1], 
                    values:[
                            { x : 0 },
                            { x : - Math.PI  },
                    ],
                    target:enemy.rotation
                }
            ],
        loop: false,
        duration:duration
    });
    // Add animator to enemy object
    enemy.dead = animator;
}

function createIdleAnimation(enemy) {
    let animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, 0.5, 1], 
                    values:[
                            { y : -5 },
                            { y : 0  } ,
                            { y : -5 },
                    ],
                    target:enemy.position
                },
            ],
        loop: true,
        duration:duration*3
    });
    // Add animator to enemy object
    enemy.idle = animator;
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / canvas.width ) * 2 - 1;
    mouse.y = - ( event.clientY / canvas.height ) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        CLICKED = intersects[0].object.parent;
        if(isPlaying)
        {
            if(CLICKED.name.includes("Robot")) {
                let shootedEnemy = enemies.filter(obj => {
                    return obj.name === CLICKED.name;
                })[0];
    
                if(shootedEnemy.active) {
                    // Change animator
                    shootedEnemy.idle.stop();
                    shootedEnemy.dead.start();
                    shootedEnemy.active = false;
    
                    score += 1;
                    $("#score").html("Total Kills: " + score);
    
                    // Remove from scene once animation ends
                    async_await(duration*1.5).then(function() {
                        scene.remove(shootedEnemy);
                        // Add to scene again
                        async_await(duration*3).then(function() {
                            shootedEnemy.active = true;
                            shootedEnemy.rotation.x = 0;
                            shootedEnemy.idle.start();
                            scene.add(shootedEnemy);
                        });
                    });
                }
            }
        }
        
    } 
}

function createScene(_canvas) {
    $("#resetButton").css("visibility", "hidden");
    canvas = _canvas;
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);

    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
    camera.position.set(-5, 10, 80);
    scene.add(camera);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.target = new THREE.Vector3(0,20,0);
        
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    var spotLights = [];

    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 1, 1, 1 );
    scene.add( light );

    for(var sp of spotLights)
    {
        sp.castShadow = true;

        sp.shadow.camera.near = 1;
        sp.shadow.camera.far = 200;
        sp.shadow.camera.fov = 45;
        
        sp.shadow.mapSize.width = SHADOW_MAP_WIDTH;
        sp.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    }

    ambientLight = new THREE.AmbientLight ( 0x222222 );
    root.add(ambientLight);

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 5);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onDocumentMouseDown);
    
    // Now add the group to our scene
    scene.add( root );
}

// https://javascript.info/async-await
async function async_await(duration) 
{
    let promise = new Promise((resolve, reject) => {
      setTimeout(() => resolve("done!"), duration)
    });
    let result = await promise; 
    return result
}