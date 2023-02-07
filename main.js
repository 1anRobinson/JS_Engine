            //variable declaration
            let physicsWorld, // physics world object
            scene,            // threejs scene
            camera,           // threejs camera
            renderer,        // threejs render thingy
            rigidBodies = [], tmpTrans; // array for all threejs meshes that have a physics object
                                        //  and temporary ammojs transform object
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
                // clock for timing
                clock = new THREE.Clock();

                //create the scene
                scene = new THREE.Scene();
                scene.background = new THREE.Color( 0x282A36 );

                //create camera
                camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );
                camera.position.set( 0, 30, 50 );
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                //Add hemisphere light
                let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
                hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
                hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
                hemiLight.position.set( 0, 50, 0 );
                scene.add( hemiLight );

                //Add directional light
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

                //Setup the renderer
                renderer = new THREE.WebGLRenderer( { antialias: true } );
                renderer.setClearColor( 0xbfd1e5 );
                renderer.setPixelRatio( window.devicePixelRatio );
                renderer.setSize( window.innerWidth, window.innerHeight );
                document.body.appendChild( renderer.domElement );

                renderer.gammaInput = true;
                renderer.gammaOutput = true;

                renderer.shadowMap.enabled = true;
            }

            function setupGUI()
            {
                var ballProps = {
                    X : 0,
                    Y : 0,
                    Z : 0,
                    r : 0,
                    spawnBall: function(){},
                }

                var blockProps = {
                    X : 0,
                    Y : 0,
                    Z : 0,
                    spawnBlock: function(){},
                }

                ballProps.spawnBall = 
                    function createBall()
                    {
                        let quat = {x: 0, y: 0, z: 0, w: 1};
                        let mass = 1;

                        //threeJS Section
                        var geometry = new THREE.SphereBufferGeometry(ballProps.r);
                        var material = new THREE.MeshPhongMaterial({
                            opacity: 0.1,
                            color: 0xC24034,
                            // wireframe: true,
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
                        rigidBodies.push(ball);
                    };
                
                blockProps.spawnBlock = 
                    function createBlock()
                    {    
                        let scale = {x: 50, y: 2, z: 50}
                        let quat = {x: 0, y: 0, z: 0, w: 1};
                        let mass = 0;

                        //threeJS Section
                        var geometry = new THREE.BoxBufferGeometry();
                        var material = new THREE.MeshPhongMaterial({
                            opacity: 0.1,
                            color: 0x7BFA50,
                            // blending: THREE.NormalBlending,
                            // depthTest: true,
                            //wireframe: true,
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
                    }


                var gui = new dat.GUI();
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
                ballFolder.add(ballProps, 'r').name('Radius')

                ballFolder.add(ballProps, 'spawnBall').name('Place Ball');

                blockFolder.add(blockProps, 'X').name('X Position')
                blockFolder.add(blockProps, 'Y').name('Y Position')
                blockFolder.add(blockProps, 'Z').name('Z Position')

                blockFolder.add(blockProps, 'spawnBlock').name('Place Cube');
            }

            function animate()
            {
                let deltaTime = clock.getDelta();
                updatePhysics(deltaTime);
                renderer.render(scene, camera);
                requestAnimationFrame(animate);
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
