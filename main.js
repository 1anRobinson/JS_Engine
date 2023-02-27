
//variable declaration
let physicsWorld, // physics world object
stats,            // frame data and such
devWindow,          // html fucking div
scene,            // threejs scene
camera,           // threejs camera
renderer,        // threejs render thingy
rigidBodies = [], tmpTrans, // array for all threejs meshes that have a physics object
                            //  and temporary ammojs transform object
raycaster, mouse, intersects = [], selectedObj = null,
falseCamera, falseScene, falseWidth = 840, falseHeight = 240, renderTexture, screenMaterial, display;

let colGroupPlane = 1,colGroupRedBall = 1, colGroupGreenBall = 1, colGroupBlock = 1;

//Ammojs Initialization
Ammo().then( start )

/**
 * function to call setup function
 */
function start()
{
    tmpTrans = new Ammo.btTransform();
    setupPhysicsWorld(); 
    setupGraphics();
    setupGUI();
    animate();
}

function getMouse(event)
{
    mouse.x =  ( event.clientX /window.innerWidth )  * 2 - 1;
    mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
}
window.addEventListener('mousemove', getMouse, false);

function onMouseOver()
{
    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObjects( scene.children );

    for (let i = 0; i < intersects.length; i++)
    {
        console.log('bruh')
        intersects[i].object.material.wireframe = true;
        //intersects[i].object.material.opacity = 0.5;
    }
}

function onMouseOff()
{
    for (let i = 0; i < scene.children.length; i++)
    {
        if(scene.children[i].material)
        {
            scene.children[i].material.wireframe = false;
        }
    }
}

    /**
 * function to initiate the physics world
 * 
 * physicsWorld         - dynamic physics world (other varients exist like
 *                        Ammo.btSoftRigidDynamicsWorld)
 * collisionConfig      - configures the collision configurations
 * overlappingPairCache - uses the broadphase algorithm to compute the amount of pairs 
 *                        of object bounding boxes that are colliding (also includes
 *                        those that collide but not intersect)
 * dispatcher           - can be used to register a callback that filters the overlapping
 *                        boxes so the collisions are processed by the rest of the system
 * solver               - makes objects interact properly by taking into account gravity
 *                        game logic forces, collisions, and constraints
 * 
 * (the bt's are from bullet physics the parent project)
 */
function setupPhysicsWorld()
{
    let collisionConfig      = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher           = new Ammo.btCollisionDispatcher(collisionConfig),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver               = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfig);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
}
/**
 * funtion to set up the threejs environment for displaying things on the screen
*/
function setupGraphics()
{
    clock = new THREE.Clock();          // clock for timing
    mouse = new THREE.Vector2();        // mouse vector for coordinates
    raycaster = new THREE.Raycaster();  // raycaster to shoot from mouse

    stats = new Stats();            // statistics object
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    scene = new THREE.Scene();         //actual scene
    scene.background = new THREE.Color( 0x282A36 );

    falseScene = new THREE.Scene();
    falseScene.background = new THREE.Color( 0xFF00FF );

    // get the div element
    devWindow = document.getElementById('devWindow');

    //Setup the camera
    {
        camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );
        camera.position.set( 0, 15, 50 );
        // dummyCamera = new THREE.OrthographicCamera(
        //     window.innerWidth / - 2, 
        //     window.innerWidth / 2, 
        //         window.innerHeight / 2,
        //         window.innerHeight / - 2,
        //         - 10000, 
        //         10000 );
        // dummyCamera.position.z = 1;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
    falseCamera = new THREE.OrthographicCamera(
        window.innerWidth / -2, 
        window.innerWidth / 2,
        window.innerHeight / 2, 
        window.innerHeight / -2,
        -10000, 
        10000);
    falseCamera.position.z = 1;

    renderTexture = new THREE.WebGLRenderTarget(
        256, //resolution x
        256, //resolution y
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBFormat
        });

    screenMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: {value: renderTexture.texture}
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        depthWrite: false
      });

      // plane to display rendered texture
      display = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
      quad = new THREE.Mesh(display, screenMaterial);
      quad.position.z = -100;
      falseScene.add(quad);

    //Setup the renderer
    {
        renderer = new THREE.WebGLRenderer( { 
            antialias: false,
            precision: "lowp",
            powerPreference: "low-power",
        } );
        renderer.setClearColor( 0xbfd1e5 );
        renderer.setPixelRatio( window.devicePixelRatio * 0.4);
        renderer.setSize(window.innerWidth, window.innerHeight );
        renderer.gammaInput = false;
        renderer.gammaOutput = false;
        renderer.shadowMap.enabled = true;
        document.body.appendChild( renderer.domElement );
    }

    //Add hemisphere light
    {
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
        hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
        hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
        hemiLight.position.set( 0, 50, 0 );
        scene.add( hemiLight );
    }

    //Add directional light
    {
        let dirLight = new THREE.DirectionalLight( 0xEA3E6D , 1);
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1.75, 1 );
        dirLight.position.multiplyScalar( 100 );
        scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;

        let d = 50;

        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        dirLight.shadow.camera.far = 13500;
    }
}

function setupGUI()
{
    var gui = new dat.GUI();

    var ballProps = {
        X : 0,
        Y : 0,
        Z : 0,
        r : 0,
        spawnBall: function(){},
        wireframe : false
    }

    var blockProps = {
        X : 0,
        Y : 0,
        Z : 0,
        L : 0,
        W : 0,
        H : 0,
        spawnBlock: function(){},
        wireframe : false
    }

    ballProps.spawnBall = 
        function createBall()
        {
            let quat = {x: 0, y: 0, z: 0, w: 1};
            let mass = 1;

            //threeJS Section
            var geometry = new THREE.SphereBufferGeometry(ballProps.r);
            var material = new THREE.MeshToonMaterial({
                opacity: 0.1,
                color: 0xC24034,
                wireframe: ballProps.wireframe
                // blending: THREE.NormalBlending,
                // depthTest: true,
            });
            let ball = new THREE.Mesh(geometry, material);
            ball.position.set(ballProps.X, ballProps.Y, ballProps.Z);
            
            ball.castShadow = true;
            ball.receiveShadow = true;

            scene.add(ball);

            //Ammojs Section
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3( ballProps.X, ballProps.Y, ballProps.Z ) );
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
            let motionState = new Ammo.btDefaultMotionState( transform );

            let colShape = new Ammo.btSphereShape( ballProps.r );
            colShape.setMargin( 0.05 );

            let localInertia = new Ammo.btVector3( ballProps.X, ballProps.Y, ballProps.Z );
            colShape.calculateLocalInertia( mass, localInertia );

            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
            let body = new Ammo.btRigidBody( rbInfo );

            physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall );
            
            ball.userData.physicsBody = body;
            if(ballProps.r > 0) rigidBodies.push(ball);
        };

    blockProps.spawnBlock = 
        function createBlock()
        {    
            let scale = {x: 50, y: 2, z: 50}
            let quat = {x: 0, y: 0, z: 0, w: 1};
            let mass = 0;

            //threeJS Section
            var geometry = new THREE.BoxBufferGeometry();
            var material = new THREE.MeshToonMaterial({
                opacity: 0.1,
                color: 0x7BFA50,
                wireframe: blockProps.wireframe,
                // blending: THREE.NormalBlending,
                // depthTest: true,
            });

            let blockPlane = new THREE.Mesh(geometry, material);
            blockPlane.position.set(blockProps.X, blockProps.Y, blockProps.Z);
            blockPlane.scale.set(scale.x, scale.y, scale.z);

            blockPlane.castShadow = true;
            blockPlane.receiveShadow = true;

            scene.add(blockPlane);

            //Ammojs Section
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3( blockProps.X, blockProps.Y, blockProps.Z ) );
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
            let motionState = new Ammo.btDefaultMotionState( transform );

            let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
            colShape.setMargin( 0.05 );

            let localInertia = new Ammo.btVector3( blockProps.X, blockProps.Y, blockProps.Z );
            colShape.calculateLocalInertia( mass, localInertia );

            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
            let body = new Ammo.btRigidBody( rbInfo );

            physicsWorld.addRigidBody( body, colGroupPlane, colGroupRedBall | colGroupGreenBall );
            blockPlane.userData.physicsBody = body;
            //if(blockProps.L > 0 && blockProps.W > 0 && blockProps.H > 0) 
            rigidBodies.push(blockPlane);
        };

    const placeFolder = gui.addFolder('Place...')
    const modifyFolder = gui.addFolder('Modify...')

    const objFolder = placeFolder.addFolder('Object...')
    const colFolder = placeFolder.addFolder('Collision...')
    
    const ballFolder = objFolder.addFolder('Ball')
    const blockFolder = objFolder.addFolder('Block')

    const trigFolder = colFolder.addFolder('Trigger')

    const ballPos = ballFolder.addFolder('Position')
    ballPos.add(ballProps, 'X').name('X Position')
    ballPos.add(ballProps, 'Y').name('Y Position')
    ballPos.add(ballProps, 'Z').name('Z Position')

    ballFolder.add(ballProps, 'wireframe').name('wireframe')
    ballFolder.add(ballProps, 'r').name('Radius')
    ballFolder.add(ballProps, 'spawnBall').name('Place Ball');

    blockFolder.add(blockProps, 'X').name('X Position')
    blockFolder.add(blockProps, 'Y').name('Y Position')
    blockFolder.add(blockProps, 'Z').name('Z Position')
    blockFolder.add(blockProps, 'wireframe').name('wireframe')

    blockFolder.add(blockProps, 'spawnBlock').name('Place Cube');
}

function animate()
{
    requestAnimationFrame(animate);
    stats.begin();
    let deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    onMouseOff();
    onMouseOver();
    renderer.setRenderTarget(renderTexture);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(falseScene, falseCamera);
    stats.end();
}

function updatePhysics( deltaTime ) 
{
    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) 
    {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms )
        {
            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }

}
