//variable declaration
let physicsWorld, // physics world object
stats,            // frame data and such

scene,            // threejs scene
camera,
renderer,        // threejs render thingy

playerScene,     // player POV scene
playerCamera,
playerRender,

rigidBodies = [], tmpTrans, // array for all threejs meshes that have a physics object
                            //  and temporary ammojs transform object
windowHeight = window.innerHeight, windowWidth = window.innerWidth,//window.innerWidth,

raycaster, mouse, intersects = [], selectedObj = null,
cameraSpeed = 1.5,

falseCamera, falseScene, renderTexture, screenMaterial, display,
falseCamera2, falseScene2, renderTexture2, screenMaterial2, display2

let playerObj = null, playerTransform,
cameraMove = {left: false, right: false, forward: false, back: false} 
let colGroupPlane = 1, colGroupRedBall = 1, colGroupGreenBall = 1, colGroupBlock = 1
const STATE = {DISABLE_DEACTIVATION : 4}

{ //player variables
    var playerProps = {
        playerSpeed : 45,
        X : 0,
        Y : 0,
        Z : 0,
        jumpForce: 2,
        jumping: false,
        maxSpeed : 1,
        friction : 2,
        rollingFriction : 1000,
        gravity: 6,
        mass: 3,
        spawnPlayer: function(X,Y,Z){},
    }
    var playerMovement =
    {
        left: 0, 
        right: 0, 
        forward: 0, 
        back: 0, 
        up: 0, 
        jumpTimer: 0,
        jumpDuration: 1 / 1000000
    }
}

var ballProps = {
    X : 0,
    Y : 0,
    Z : 0,
    r : 0,
    friction : 4,
    rollingFriction : 10,
    color : 0x000000,
    spawnBall: function(){},
}
var blockProps = {
    X : 0,
    Y : 0,
    Z : 0,
    L : 0,
    W : 0,
    H : 0,
    color : 0x2c8726,
    spawnBlock: function(L,W,H){},
    static : true
}

SpawnObjs = 
{
    createBall:
    function()
    {
        let quat = {x: 0, y: 0, z: 0, w: 1}
        let mass = 1

        //threeJS Section
        var geometry = new THREE.SphereBufferGeometry(ballProps.r)
        var material = new THREE.MeshToonMaterial({
            opacity: 0.1,
            color: ballProps.color,
            wireframe: ballProps.wireframe,
        })
        let ball = new THREE.Mesh(geometry, material)
        let ball2 = new THREE.Mesh(geometry, material)

        ball.position.set(ballProps.X, ballProps.Y, ballProps.Z)
        ball2.position.set(ballProps.X, ballProps.Y, ballProps.Z)

        ball.castShadow = true
        ball.receiveShadow = false

        ball2.castShadow = true
        ball2.receiveShadow = false

        scene.add(ball)
        playerScene.add(ball2)

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
        ball2.userData.physicsBody = body

        if(ballProps.r > 0)
        {rigidBodies.push(ball) 
         rigidBodies.push(ball2)} 
    },

    createBlock:
    function(L,W,H)
    {    
        let scale = {x: W, y: H, z: L}
        let quat = {x: 0, y: 0, z: 0, w: 1}
        let mass = 0

        //threeJS Section
        var geometry = new THREE.BoxBufferGeometry()
        var material = new THREE.MeshToonMaterial({
            opacity: 0.1,
            color: blockProps.color,
        })

        let blockPlane = new THREE.Mesh(geometry, material)
        let blockPlane2 = new THREE.Mesh(geometry, material)

        blockPlane.position.set(blockProps.X, blockProps.Y, blockProps.Z)
        blockPlane.scale.set(scale.x, scale.y, scale.z)

        blockPlane2.position.set(blockProps.X, blockProps.Y, blockProps.Z)
        blockPlane2.scale.set(scale.x, scale.y, scale.z)
        
        blockPlane.castShadow = true
        blockPlane.receiveShadow = false

        blockPlane2.castShadow = true
        blockPlane2.receiveShadow = false

        scene.add(blockPlane)
        playerScene.add(blockPlane2)

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
        blockPlane2.userData.physicsBody = body

        //if(blockProps.L > 0 && blockProps.W > 0 && blockProps.H > 0) 
        rigidBodies.push(blockPlane)
        rigidBodies.push(blockPlane2)
    },

    createPlayer:
    function(X, Y, Z)
    {
        // Object defintion stuff
        
        let quat = {x: 0, y: 0, z: 0, w: 1}
        let mass = playerProps.mass
        var geometry = new THREE.CapsuleGeometry(5, 5)
        var material = new THREE.MeshToonMaterial({
            opacity: 0.1,
            color: 0xffffff,
            wireframe: true
        })
        let player = playerObj = new THREE.Mesh(geometry, material)
        let player2 = playerObj = new THREE.Mesh(geometry, material)

        player.position.set(X, Y, Z)
        player2.position.set(X, Y, Z)
        
        // player.position.set(playerProps.X, playerProps.Y, playerProps.Z)

        
        player.castShadow = true
        player.receiveShadow = false

        player2.castShadow = true
        player2.receiveShadow = false
    
        scene.add(player)
        scene.add(player2)
        
        // Ammo.js stuff
        
        playerTransform = new Ammo.btTransform()
        playerTransform.setIdentity()
        playerTransform.setOrigin( new Ammo.btVector3(X, Y, Z ) )
        playerTransform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) )
        let motionState = new Ammo.btDefaultMotionState( playerTransform )

        let colShape = new Ammo.btCapsuleShape(5, 5)
        colShape.setMargin( 0.05 )

        let localInertia = new Ammo.btVector3(0, 0, 0)
        colShape.calculateLocalInertia( mass, localInertia )

        let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia )
        let body = new Ammo.btRigidBody( rbInfo )
        let zeroVec = new Ammo.btVector3(0,0,0)
        body.setAngularFactor(zeroVec)

        physicsWorld.addRigidBody( body, colGroupRedBall, colGroupPlane | colGroupGreenBall )
        
        body.setFriction(playerProps.friction)
        body.setRollingFriction(playerProps.rollingFriction)
        body.setActivationState(STATE.DISABLE_DEACTIVATION)

        player.userData.physicsBody = body
        player2.userData.physicsBody = body

        rigidBodies.push(player)
        rigidBodies.push(player2)

    }
}

//Ammojs Initialization
Ammo().then( start )

function movePlayer()
{
    let moveX =  playerMovement.right - playerMovement.left;
    let moveZ =  playerMovement.back - playerMovement.forward;

    if (playerMovement.up == 1) 
    {
        // Start the jump
        timeOfJump = clock.getDelta()
        playerProps.jumping = true;
        playerMovement.moveY = playerProps.jumpForce / playerProps.gravity;
        playerMovement.jumpTimer+= clock.getDelta;
    } 
    else if (playerMovement.jumping && playerMovement.jumpTimer < (timeOfJump + playerMovement.jumpDuration)                                   ) 
    {
        // Continue the jump
        playerMovement.moveY = playerProps.jumpForce / playerProps.gravity;
        playerMovement.jumpTimer+= clock.getDelta;
    }
    else
    {
        // End the jump
        playerMovement.moveY = 0
        playerProps.jumping = false;
        playerMovement.jumpTimer = 0;
    }

    if( moveX == 0 && playerMovement.moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3( moveX, playerMovement.moveY, moveZ )
    resultantImpulse.op_mul(playerProps.playerSpeed);

    let physicsBody = playerObj.userData.physicsBody;
    // apply force is the most normal 
    // applyImpulse is the yeet function
    // setLinearVelocity imposes an even force
    physicsBody.applyImpulse( resultantImpulse ); 
}
/**
 * function to call the setup functions
 */
function start()
{
    tmpTrans = new Ammo.btTransform()
    setupPhysicsWorld() 
    setupGraphics()
    setupGUI()
    SpawnObjs.createBlock(100,100,2)
    SpawnObjs.createPlayer(0,4,0)
    animate1()
    animate2()
}

/**
 * mouse coordinate getter
 */
function getMouse(event)
{
    mouse.x =  ( event.clientX /windowWidth )  * 2 - 1
    mouse.y = -( event.clientY / windowHeight ) * 2 + 1
}

/**
 * Key pressed event handler
 */
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
            playerMovement.forward = 1
            break
        case 65: // A key
            playerMovement.left = 1
            break
        case 83: // S key
            playerMovement.back = 1
            break
        case 68: // D key
            playerMovement.right = 1
            break
        case 32: //space bar
            playerMovement.up = 1
            break
    }
}
/**
 * Key released event handler
 */
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
            playerMovement.forward = 0
            break
        case 65: // A key
            playerMovement.left = 0
            break
        case 83: // S key
            playerMovement.back = 0
            break
        case 68: // D key
            playerMovement.right = 0
            break
        case 32: //space bar
        playerMovement.up = 0 
        break
    }
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    playerCamera.aspect = window.innerWidth / window.innerHeight
    playerCamera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )
    playerRender.setSize(window.innerWidth, window.innerHeight )
}

window.addEventListener('mousemove', getMouse, false)
window.addEventListener('keydown', keyDown, false)
window.addEventListener('keyup', keyUp, false)
window.addEventListener( 'resize', onWindowResize, false)

function onMouseOver()
{
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects( scene.children )

    for (let i = 0; i < intersects.length; i++)
    {
        console.log('bruh')
        intersects[i].object.material.opacity = 0.00000000000000005
        //intersects[i].object.material.opacity = 0.5
    }
}

function onMouseOff()
{
    for (let i = 0; i < scene.children.length; i++)
    {
        if(scene.children[i].material)
        {
            scene.children[i].material.opacity = 0.1
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
    stats.showPanel(0)             // make it visible
    document.body.appendChild(stats.dom) // add stats to html document

    scene = new THREE.Scene()         //actual scene
    scene.background = new THREE.Color( 0x282A36 )

    playerScene = new THREE.Scene()
    playerScene.background = new THREE.Color (0xFF00FF)

    falseScene = new THREE.Scene()
    falseScene.background = new THREE.Color( 0xFF0000 )

    falseScene2 = new THREE.Scene()
    falseScene2.background = new THREE.Color( 0xFF00FF )

    //Setup the cameras
    {
        camera = new THREE.PerspectiveCamera( 60, windowWidth / windowHeight, 0.2, 5000 )
        camera.position.set( 0, 15, 50 )
        camera.lookAt(new THREE.Vector3(0, 0, 0))
         // Player camera stuff
        playerCamera = new THREE.PerspectiveCamera( 60, windowWidth / windowHeight, 0.2, 5000 )
        playerCamera.position.set( playerProps.X, playerProps.Y, playerProps.Z )
        //playerCamera.lookAt(new THREE.Vector3(0, 0, 0))
    }
    // Fake scene stuff
    {
        falseCamera = new THREE.OrthographicCamera(
            windowWidth / -2, 
            windowWidth / 2,
            windowHeight / 2, 
            windowHeight / -2,
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
        display = new THREE.PlaneGeometry(windowWidth, windowHeight)
        quad = new THREE.Mesh(display, screenMaterial)
        quad.position.z = -100
        falseScene.add(quad)
    }

    // {
    //     falseCamera2 = new THREE.OrthographicCamera(
    //         windowWidth / -2, 
    //         windowWidth / 2,
    //         windowHeight / 2, 
    //         windowHeight / -2,
    //         -10000, 
    //         10000)
    //     falseCamera2.position.x = playerProps.X
    //     falseCamera2.position.y = playerProps.Y
    //     falseCamera2.position.z = playerProps.Z

    //     renderTexture2 = new THREE.WebGLRenderTarget(
    //         256, //resolution x
    //         256, //resolution y
    //         {
    //         minFilter: THREE.LinearFilter,
    //         magFilter: THREE.NearestFilter,
    //         format: THREE.RGBFormat
    //         })

    //     screenMaterial2 = new THREE.ShaderMaterial({
    //         uniforms: {
    //         tDiffuse: {value: renderTexture2.texture}
    //         },
    //         vertexShader: document.getElementById('vertexshader').textContent,
    //         fragmentShader: document.getElementById('fragmentshader').textContent,
    //         depthWrite: false
    //     })

    //     // plane to display rendered texture
    //     display2 = new THREE.PlaneGeometry(windowWidth, windowHeight)
    //     quad2 = new THREE.Mesh(display2, screenMaterial2)
    //     quad2.position.z = -100
    //     falseScene2.add(quad2)
    // }

    //Setup the renderer
    {

        renderer = new THREE.WebGLRenderer( { 
            canvas: document.getElementById('devWindow'),
            antialias: false,
            precision: "lowp",
            powerPreference: "low-power"
        } )
        renderer.setClearColor( 0xbfd1e5 )
        renderer.setPixelRatio( window.devicePixelRatio)
        renderer.setSize(windowWidth, windowHeight )
        renderer.gammaInput = false
        renderer.gammaOutput = false
        renderer.shadowMap.enabled = true
        document.body.appendChild( renderer.domElement )

        playerRender = new THREE.WebGL1Renderer({
            canvas: document.getElementById('playerPOV'),
            antialias: false,
            precision: "lowp",
            powerPreference: "low-power"
        })
        playerRender.setClearColor( 0xbfd1e5 )
        playerRender.setPixelRatio( window.devicePixelRatio)
        playerRender.setSize(windowWidth, windowHeight )
        playerRender.gammaInput = false
        playerRender.gammaOutput = false
        playerRender.shadowMap.enabled = true
        document.body.appendChild( playerRender.domElement )
    }
    //Add hemisphere light
    {
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 )
        hemiLight.color.setHSL( 0.6, 0.6, 0.6 )
        hemiLight.groundColor.setHSL( 0.1, 1, 0.4 )
        hemiLight.position.set( 0, 50, 0 )

        let hemiLight2 = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 )
        hemiLight2.color.setHSL( 0.6, 0.6, 0.6 )
        hemiLight2.groundColor.setHSL( 0.1, 1, 0.4 )
        hemiLight2.position.set( 0, 50, 0 )

        scene.add( hemiLight )
        playerScene.add(hemiLight2)
    }
    //Add directional light
    {
        let dirLight = new THREE.DirectionalLight( 0xEA3E6D , 1)
        dirLight.color.setHSL( 0.1, 1, 0.95 )
        dirLight.position.set( -1, 1.75, 1 )
        dirLight.position.multiplyScalar( 100 )

        let dirLight2 = new THREE.DirectionalLight( 0xEA3E6D , 1)
        dirLight2.color.setHSL( 0.1, 1, 0.95 )
        dirLight2.position.set( -1, 1.75, 1 )
        dirLight2.position.multiplyScalar( 100 )

        scene.add( dirLight )
        playerScene.add(dirLight2)

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

    ballProps.spawnBall = SpawnObjs.createBall
    blockProps.spawnBlock = SpawnObjs.createBlock
    playerProps.spawnPlayer = SpawnObjs.createPlayer

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
        
        ballFolder.add(ballProps, 'r').name('Radius')
        ballFolder.addColor(ballProps, 'color').name('Ball color')
        ballFolder.add(ballProps, 'spawnBall').name('Place Ball')
        
    }
    //Block GUI stuff
    {
        const blockPos = blockFolder.addFolder('Position')
        blockPos.add(blockProps, 'X').name('X Position')
        blockPos.add(blockProps, 'Y').name('Y Position')
        blockPos.add(blockProps, 'Z').name('Z Position')

        const blockDim = blockFolder.addFolder('Dimensions')
        blockDim.add(blockProps, 'L').name('Length')
        blockDim.add(blockProps, 'W').name('Width')
        blockDim.add(blockProps, 'H').name('Height')

        blockFolder.addColor(blockProps, 'color').name('Block color')
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

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth/2, window.innerHeight);
const material2 = new THREE.MeshBasicMaterial({map: new THREE.WebGLRenderTarget(window.innerWidth/2, window.innerHeight)});
function animate1()
{
    requestAnimationFrame(animate1)
    stats.begin()
    let deltaTime = clock.getDelta()
    movePlayer()
    
    {
    if(cameraMove.forward)
    camera.position.z-= cameraSpeed
    
    if(cameraMove.left)
    camera.position.x -= Math.sin(camera.rotation.y + Math.PI/2) * cameraSpeed
    camera.position.z -= -Math.cos(camera.rotation.y + Math.PI/2) * cameraSpeed
    
    if(cameraMove.back)
    camera.position.z+=cameraSpeed 
    
    if(cameraMove.right)
    camera.position.x -= Math.sin(camera.rotation.y - Math.PI/2) * cameraSpeed
    camera.position.z -= -Math.cos(camera.rotation.y - Math.PI/2) * cameraSpeed
    }
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

function animate2()
{
    requestAnimationFrame(animate2)
    let deltaTime = clock.getDelta()
    playerCamera.position.x = playerObj.position.x
    playerCamera.position.y = playerObj.position.y + 2
    playerCamera.position.z = playerObj.position.z


    updatePhysics(deltaTime)
    onMouseOff()
    onMouseOver()
    material2.map = renderTarget.texture;
    material2.needsUpdate = true;
    playerRender.render(playerScene, playerCamera)
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


