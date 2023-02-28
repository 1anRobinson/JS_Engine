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
cameraSpeed = 1.5,
falseCamera, falseScene, renderTexture, screenMaterial, display
let playerObj = null, moveDirection = {left: 0, right: 0, forward: 0, back: 0}, 
cameraMove = {left: false, right: false, forward: false, back: false} 
let colGroupPlane = 1, colGroupRedBall = 1, colGroupGreenBall = 1, colGroupBlock = 1
const STATE = {DISABLE_DEACTIVATION : 4}
//Ammojs Initialization
Ammo().then( start )

/**
 * function to call setup function
 */
function start()
{
    tmpTrans = new Ammo.btTransform()
    setupPhysicsWorld() 
    setupGraphics()
    setupGUI()
    animate()
}

function getMouse(event)
{
    mouse.x =  ( event.clientX /window.innerWidth )  * 2 - 1
    mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1
}

function keyDown(e) 
{
    console.log(e.keyCode)
    switch(e.keyCode)
    {
        case 73: // I key
            cameraMove.forward = true
            break
        case 74: // J key
            cameraMove.left = true
            break
        case 75: // K key
            cameraMove.back = true
            break
        case 76: // L key
            cameraMove.right = true
            break

        case 87: // W key
            moveDirection.forward = 1
            break
        case 65: // A key
            moveDirection.left = 1
            break
        case 83: // S key
            moveDirection.back = 1
            break
        case 68: // D key
            moveDirection.right = 1
            break
    }
}

function keyUp(e) {
    switch(e.keyCode)
    {
        case 73: // I key
            cameraMove.forward = false
            break
        case 74: // J key
            cameraMove.left = false
            break
        case 75: // K key
            cameraMove.back = false
            break
        case 76: // L key
            cameraMove.right = false
            break
        
        case 87: // W key
            moveDirection.forward = 0
            break
        case 65: // A key
            moveDirection.left = 0
            break
        case 83: // S key
            moveDirection.back = 0
            break
        case 68: // D key
            moveDirection.right = 0
            break
    }
}

window.addEventListener('mousemove', getMouse, false)
window.addEventListener('keydown', keyDown, false)
window.addEventListener('keyup', keyUp, false)

function onMouseOver()
{
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects( scene.children )

    for (let i = 0; i < intersects.length; i++)
    {
        console.log('bruh')
        intersects[i].object.material.wireframe = true
        //intersects[i].object.material.opacity = 0.5
    }
}

function onMouseOff()
{
    for (let i = 0; i < scene.children.length; i++)
    {
        if(scene.children[i].material)
        {
            scene.children[i].material.wireframe = false
        }
    }
}

/**
 * function to initiate the physics world
 */
function setupPhysicsWorld()
{
    let collisionConfig      = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher           = new Ammo.btCollisionDispatcher(collisionConfig),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver               = new Ammo.btSequentialImpulseConstraintSolver()

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfig)
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0))
}
/**
 * funtion to set up the threejs environment for displaying things on the screen
*/
function setupGraphics()
{
    clock = new THREE.Clock()          // clock for timing
    mouse = new THREE.Vector2()        // mouse vector for coordinates
    raycaster = new THREE.Raycaster()  // raycaster to shoot from mouse

    stats = new Stats()            // statistics object
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    scene = new THREE.Scene()         //actual scene
    scene.background = new THREE.Color( 0x282A36 )

    falseScene = new THREE.Scene()
    falseScene.background = new THREE.Color( 0xFF00FF )

    // get the div element
    devWindow = document.getElementById('devWindow')

    //Setup the camera
    {
        camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 )
        camera.position.set( 0, 15, 50 )
        // dummyCamera = new THREE.OrthographicCamera(
        //     window.innerWidth / - 2, 
        //     window.innerWidth / 2, 
        //         window.innerHeight / 2,
        //         window.innerHeight / - 2,
        //         - 10000, 
        //         10000 )
        // dummyCamera.position.z = 1
        camera.lookAt(new THREE.Vector3(0, 0, 0))
    }
    falseCamera = new THREE.OrthographicCamera(
        window.innerWidth / -2, 
        window.innerWidth / 2,
        window.innerHeight / 2, 
        window.innerHeight / -2,
        -10000, 
        10000)
    falseCamera.position.z = 1

    renderTexture = new THREE.WebGLRenderTarget(
        256, //resolution x
        256, //resolution y
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBFormat
        })

    screenMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: {value: renderTexture.texture}
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        depthWrite: false
      })

      // plane to display rendered texture
      display = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight)
      quad = new THREE.Mesh(display, screenMaterial)
      quad.position.z = -100
      falseScene.add(quad)

    //Setup the renderer
    {
        renderer = new THREE.WebGLRenderer( { 
            antialias: false,
            precision: "lowp",
            powerPreference: "low-power",
        } )
        renderer.setClearColor( 0xbfd1e5 )
        renderer.setPixelRatio( window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight )
        renderer.gammaInput = false
        renderer.gammaOutput = false
        renderer.shadowMap.enabled = true
        document.body.appendChild( renderer.domElement )
    }

    //Add hemisphere light
    {
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 )
        hemiLight.color.setHSL( 0.6, 0.6, 0.6 )
        hemiLight.groundColor.setHSL( 0.1, 1, 0.4 )
        hemiLight.position.set( 0, 50, 0 )
        scene.add( hemiLight )
    }

    //Add directional light
    {
        let dirLight = new THREE.DirectionalLight( 0xEA3E6D , 1)
        dirLight.color.setHSL( 0.1, 1, 0.95 )
        dirLight.position.set( -1, 1.75, 1 )
        dirLight.position.multiplyScalar( 100 )
        scene.add( dirLight )

        dirLight.castShadow = true

        dirLight.shadow.mapSize.width = 2048
        dirLight.shadow.mapSize.height = 2048

        let d = 50

        dirLight.shadow.camera.left = -d
        dirLight.shadow.camera.right = d
        dirLight.shadow.camera.top = d
        dirLight.shadow.camera.bottom = -d

        dirLight.shadow.camera.far = 13500
    }
}

function setupGUI()
{
    var gui = new dat.GUI()

    var playerProps = {
        playerSpeed : 1.0,
        X : 0,
        Y : 0,
        Z : 0,
        friction : 4,
        rollingFriction : 10,
        spawnPlayer: function(){}
    }
    var ballProps = {
        X : 0,
        Y : 0,
        Z : 0,
        r : 0,
        friction : 4,
        rollingFriction : 10,
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
        wireframe : false,
        static : true
    }

    ballProps.spawnBall = 
        function createBall()
        {
            let quat = {x: 0, y: 0, z: 0, w: 1}
            let mass = 1

            //threeJS Section
            var geometry = new THREE.SphereBufferGeometry(ballProps.r)
            var material = new THREE.MeshToonMaterial({
                opacity: 0.1,
                color: 0xC24034,
                wireframe: ballProps.wireframe
                // blending: THREE.NormalBlending,
                // depthTest: true,
            })
            let ball = new THREE.Mesh(geometry, material)
            ball.position.set(ballProps.X, ballProps.Y, ballProps.Z)
            
            ball.castShadow = true
            ball.receiveShadow = false

            scene.add(ball)

            //Ammojs Section
            let transform = new Ammo.btTransform()
            transform.setIdentity()
            transform.setOrigin( new Ammo.btVector3( ballProps.X, ballProps.Y, ballProps.Z ) )
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) )
            let motionState = new Ammo.btDefaultMotionState( transform )

            let colShape = new Ammo.btSphereShape( ballProps.r )
            colShape.setMargin( 0.05 )

            let localInertia = new Ammo.btVector3( ballProps.X, ballProps.Y, ballProps.Z )
            colShape.calculateLocalInertia( mass, localInertia )

            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia )
            let body = new Ammo.btRigidBody( rbInfo )

            body.setFriction(ballProps.friction);
            body.setRollingFriction(ballProps.rollingFriction);
            physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall )
            
            ball.userData.physicsBody = body
            if(ballProps.r > 0) rigidBodies.push(ball)
        }

    blockProps.spawnBlock = 
        function createBlock()
        {    
            let scale = {x: 100, y: 2, z: 100}
            let quat = {x: 0, y: 0, z: 0, w: 1}
            let mass = 0

            //threeJS Section
            var geometry = new THREE.BoxBufferGeometry()
            var material = new THREE.MeshToonMaterial({
                opacity: 0.1,
                color: 0x7BFA50,
                wireframe: blockProps.wireframe,
                // blending: THREE.NormalBlending,
                // depthTest: true,
            })

            let blockPlane = new THREE.Mesh(geometry, material)
            blockPlane.position.set(blockProps.X, blockProps.Y, blockProps.Z)
            blockPlane.scale.set(scale.x, scale.y, scale.z)

            blockPlane.castShadow = true
            blockPlane.receiveShadow = false

            scene.add(blockPlane)

            //Ammojs Section
            let transform = new Ammo.btTransform()
            transform.setIdentity()
            transform.setOrigin( new Ammo.btVector3( blockProps.X, blockProps.Y, blockProps.Z ) )
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) )
            let motionState = new Ammo.btDefaultMotionState( transform )

            let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) )
            colShape.setMargin( 0.05 )

            let localInertia = new Ammo.btVector3( blockProps.X, blockProps.Y, blockProps.Z )
            colShape.calculateLocalInertia( mass, localInertia )

            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia )
            let body = new Ammo.btRigidBody( rbInfo )

            physicsWorld.addRigidBody( body, colGroupPlane, colGroupRedBall | colGroupGreenBall )
            blockPlane.userData.physicsBody = body
            //if(blockProps.L > 0 && blockProps.W > 0 && blockProps.H > 0) 
            rigidBodies.push(blockPlane)
        }
    playerProps.spawnPlayer = 
        function createPlayer()
        {
            let quat = {x: 0, y: 0, z: 0, w: 1}
            let mass = 1
            var geometry = new THREE.CapsuleGeometry(5, 5)
            var material = new THREE.MeshToonMaterial({
                opacity: 0.1,
                color: 0x2ca7db
            })
            let player = playerObj = new THREE.Mesh(geometry, material)
            player.position.set(playerProps.X, playerProps.Y, playerProps.Z)
            
            player.castShadow = true
            player.receiveShadow = false

            scene.add(player)

            let transform = new Ammo.btTransform()
            transform.setIdentity()
            transform.setOrigin( new Ammo.btVector3( playerProps.X, playerProps.Y, playerProps.Z ) )
            transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) )
            let motionState = new Ammo.btDefaultMotionState( transform )

            let colShape = new Ammo.btCapsuleShape(5, 5)
            colShape.setMargin( 0.05 )

            let localInertia = new Ammo.btVector3( playerProps.X, playerProps.Y, playerProps.Z )
            colShape.calculateLocalInertia( mass, localInertia )

            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia )
            let body = new Ammo.btRigidBody( rbInfo )

            physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall )
            
            body.setFriction(playerProps.friction)
            body.setRollingFriction(playerProps.rollingFriction)
            body.setActivationState(STATE.DISABLE_DEACTIVATION)

            player.userData.physicsBody = body
            rigidBodies.push(player)
        }

    const placeFolder = gui.addFolder('Place...')
    const modifyFolder = gui.addFolder('Modify...')

    const objFolder = placeFolder.addFolder('Object...')
    const colFolder = placeFolder.addFolder('Collision...')
    
    const ballFolder = objFolder.addFolder('Ball')
    const blockFolder = objFolder.addFolder('Block')
    const playerFolder = objFolder.addFolder('Player')

    const trigFolder = colFolder.addFolder('Trigger')
    //Ball GUI stuff
    {
        const ballPos = ballFolder.addFolder('Position')
        ballPos.add(ballProps, 'X').name('X Position')
        ballPos.add(ballProps, 'Y').name('Y Position')
        ballPos.add(ballProps, 'Z').name('Z Position')
        
        ballFolder.add(ballProps, 'wireframe').name('wireframe')
        ballFolder.add(ballProps, 'r').name('Radius')
        ballFolder.add(ballProps, 'spawnBall').name('Place Ball')
    }
    //Block GUI stuff
    {
        const blockPos = blockFolder.addFolder('Position')
        blockPos.add(blockProps, 'X').name('X Position')
        blockPos.add(blockProps, 'Y').name('Y Position')
        blockPos.add(blockProps, 'Z').name('Z Position')

        blockFolder.add(blockProps, 'wireframe').name('wireframe')
        blockFolder.add(blockProps, 'spawnBlock').name('Place Cube')
    }
    //Player GUI stuff
    {
        const playerPos = playerFolder.addFolder('Position')
        playerPos.add(playerProps, 'X').name('X Position')
        playerPos.add(playerProps, 'Y').name('Y Position')
        playerPos.add(playerProps, 'Z').name('Z Position')

        playerFolder.add(playerProps, 'spawnPlayer').name('Spawn Player')
    }
}

function movePlayer()
{
    let scalingFactor = 20;

    let moveX =  moveDirection.right - moveDirection.left;
    let moveZ =  moveDirection.back - moveDirection.forward;
    let moveY =  0; 

    if( moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3( moveX, moveY, moveZ )
    resultantImpulse.op_mul(scalingFactor);

    let physicsBody = playerObj.userData.physicsBody;
    physicsBody.setLinearVelocity( resultantImpulse );
}

function animate()
{
    requestAnimationFrame(animate)
    stats.begin()
    let deltaTime = clock.getDelta()
    movePlayer()

    if(cameraMove.forward)
    (camera.position.z--)*cameraSpeed
    
    if(cameraMove.left)
    camera.position.x -= Math.sin(camera.rotation.y + Math.PI/2) * cameraSpeed
    camera.position.z -= -Math.cos(camera.rotation.y + Math.PI/2) * cameraSpeed
    
    if(cameraMove.back)
    (camera.position.z++)*cameraSpeed 
    
    if(cameraMove.right)
    camera.position.x -= Math.sin(camera.rotation.y - Math.PI/2) * cameraSpeed
    camera.position.z -= -Math.cos(camera.rotation.y - Math.PI/2) * cameraSpeed

    updatePhysics(deltaTime)
    onMouseOff()
    onMouseOver()
    renderer.setRenderTarget(renderTexture)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(falseScene, falseCamera)
    stats.end()
}

function updatePhysics( deltaTime ) 
{
    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 )

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) 
    {
        let objThree = rigidBodies[ i ]
        let objAmmo = objThree.userData.physicsBody
        let ms = objAmmo.getMotionState()
        if ( ms )
        {
            ms.getWorldTransform( tmpTrans )
            let p = tmpTrans.getOrigin()
            let q = tmpTrans.getRotation()
            objThree.position.set( p.x(), p.y(), p.z() )
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() )
        }
    }

}


