import Phaser from 'phaser';

var config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 1024
    },
    physics: {
        default: 'arcade', // Use the Arcade Physics engine
        arcade: {
            gravity: { y: 0 }, // No gravity in a top-down game
            debug: false // Set to true for debugging physics
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var player; //Variable for the player sprite
var cursors; // Variable for keyboard controls
var missionGiver; // The unicorn who gives missions
var teacher; // The teacher NPC
var lunchLady; // The lunch lady NPC
var missionText; // The text for the mission dialogue
var sparkle; // The collectible item for the mission
var missionComplete = false; // A flag to track mission status
var missionAccepted = false; // A flag to track if the mission has been given
var inventory = []; // An array to hold the keys of collected items
var inventoryGroup; // A group to display the inventory items
var background; // Variable for the background image
var location = "classroom";
var foodGroup; // Group for food items
var game = new Phaser.Game(config);

function preload ()
{
    // Load assets (images, sounds, etc.)
    this.load.image('unicorn', 'assets/unicorn.png'); 
    this.load.image('mermaid', 'assets/mermaid.png');
    this.load.image('lunch_lady', 'assets/lunch_lady.png');
    this.load.image('classroom', 'assets/classroom.jpeg');
    this.load.image('cafeteria', 'assets/cafeteria.png');
    this.load.image('sparkle', 'assets/sparkle.png');
    this.load.image('fries', 'assets/fries.png');
    this.load.image('hamburger', 'assets/hamburger.png');
    this.load.image('hotdog', 'assets/hotdog.png');
    this.load.image('taco', 'assets/taco.png');
    this.load.image('chocolate_milkshake', 'assets/chocolate_milkshake.png');
    this.load.image('sprite', 'assets/sprite.png');
    this.load.audio('collectSound', 'assets/collect.mp3');
}

function create ()
{
    // Create game objects (player, enemies, etc.)
    // Create the background image
    background = this.add.image(0, 0, 'classroom').setOrigin(0, 0);

    player = this.physics.add.sprite(100, 100, 'unicorn'); //Add player at position (100, 100)
    player.setCollideWorldBounds(true); //Prevent player from going off-screen
    player.setScale(2);
    player.movementFlags = { up: false, down: false, left: false, right: false };

    // --- Create the Mission Giver NPC ---
    missionGiver = this.physics.add.sprite(875, 480, 'unicorn');
    missionGiver.setScale(2);
    missionGiver.setImmovable(true); // The player can't push the NPC
    missionGiver.setTint(0xaaaaff); // Tint the NPC blue to look different

    // Add collision between player and the mission giver
    this.physics.add.collider(player, missionGiver);

    // --- Create the Teacher NPC ---
    teacher = this.physics.add.sprite(520, 300, 'mermaid');
    teacher.setScale(2);
    teacher.setImmovable(true);
    this.physics.add.collider(player, teacher);

    // --- Create the Lunch Lady NPC ---
    lunchLady = this.physics.add.sprite(1150, 400, 'lunch_lady');
    lunchLady.setScale(2);
    lunchLady.setImmovable(true);
    lunchLady.setVisible(false);
    lunchLady.body.enable = false;
    this.physics.add.collider(player, lunchLady);

    // --- Create the Dialogue Text ---
    missionText = this.add.text(0, 0, 'Hi Elin! Can you find my lost sparkle?', {
        fontSize: '24px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x: 15, y: 10 }, borderRadius: 10
    }).setOrigin(0.5, 1).setVisible(false); // Center it above the NPC and hide it

    // --- Create the Mission Item ---
    sparkle = this.physics.add.sprite(0, 0, 'sparkle');
    sparkle.disableBody(true, true); // Start with the sparkle hidden and inactive

    // Add overlap check between player and sparkle
    this.physics.add.overlap(player, sparkle, collectSparkle, null, this);

    // --- Create Inventory Display ---
    const inventoryBg = this.add.graphics();
    inventoryBg.fillStyle(0xadd8e6, 0.5); // Light blue with 50% opacity
    // Positioned at the bottom center of the screen
    inventoryBg.fillRect(this.cameras.main.width / 2 - 200, this.cameras.main.height - 80, 400, 60);
    inventoryBg.setScrollFactor(0); // Fix to camera

    // A group to hold the sprites of items in our inventory
    inventoryGroup = this.add.group();

    // --- Create Food Group ---
    foodGroup = this.physics.add.group();


    // Make the camera follow the player
    this.cameras.main.startFollow(player);

    // Enable dragging
    player.setInteractive();

    // --- Create On-Screen Buttons ---

    // A helper function to create a button
    const createButton = (x, y, text) => {
        const button = this.add.text(x, y, text, {
            fontSize: '48px',
            fill: '#fff',
            backgroundColor: '#333',
            padding: { x: 20, y: 10 }
        })
        .setInteractive()
        .setScrollFactor(0) // Fix button to camera
        .setAlpha(0.7); // Make it slightly transparent
        return button;
    };

    const upButton = createButton(100, this.cameras.main.height - 150, '▲');
    const downButton = createButton(100, this.cameras.main.height - 70, '▼');
    const leftButton = createButton(30, this.cameras.main.height - 110, '◀');
    const rightButton = createButton(170, this.cameras.main.height - 110, '▶');

    // Add button event listeners
    upButton.on('pointerdown', () => player.movementFlags.up = true);
    downButton.on('pointerdown', () => player.movementFlags.down = true);
    leftButton.on('pointerdown', () => {
        player.movementFlags.left = true;
        player.flipX = false; // Flip sprite to face left
    });
    rightButton.on('pointerdown', () => {
        player.movementFlags.right = true;
        player.flipX = true; // Use default sprite orientation (facing right)
    });

    // Initialize keyboard cursor keys
    cursors = this.input.keyboard.createCursorKeys();

    upButton.on('pointerup', () => player.movementFlags.up = false).on('pointerout', () => player.movementFlags.up = false);
    downButton.on('pointerup', () => player.movementFlags.down = false).on('pointerout', () => player.movementFlags.down = false);
    leftButton.on('pointerup', () => player.movementFlags.left = false).on('pointerout', () => player.movementFlags.left = false);
    rightButton.on('pointerup', () => player.movementFlags.right = false).on('pointerout', () => player.movementFlags.right = false);
}

function updateInventoryDisplay() {
    // `this` will be the scene context
    inventoryGroup.clear(true, true); // Remove all old items from the display

    // Loop through our inventory array and display each item
    inventory.forEach((itemKey, index) => {
        const x = (this.cameras.main.width / 2 - 200) + 40 + (index * 70); // Position items horizontally
        const y = this.cameras.main.height - 50; // Center vertically in the inventory bar
        const itemSprite = this.add.sprite(x, y, itemKey).setScrollFactor(0);
        inventoryGroup.add(itemSprite);
    });
}

function collectSparkle(player, sparkle)
{
    // Hide the sparkle and disable its physics body
    sparkle.disableBody(true, true);
    missionComplete = true;

    inventory.push('sparkle'); // Add the item key to our inventory data
    updateInventoryDisplay.call(this); // Update the visual display

    // Play the collection sound effect
    this.sound.play('collectSound');
}

function collectFood(player, foodItem)
{
    foodItem.disableBody(true, true);
    inventory.push(foodItem.texture.key);
    updateInventoryDisplay.call(this);
    this.sound.play('collectSound');
}

function update ()
{
    // Game logic (movement, collisions, etc.)
    
    // --- Keyboard Controls ---
    // Reset velocity each frame
    player.setVelocity(0);

    // Check for horizontal movement (keyboard OR button flags)
    if (cursors.left.isDown || player.movementFlags.left) {
        player.setVelocityX(-320);
        player.flipX = false; // Flip left
    } else if (cursors.right.isDown || player.movementFlags.right) {
        player.setVelocityX(320);
        player.flipX = true; // Flip right
    }

    // Check for vertical movement (keyboard OR button flags)
    if (cursors.up.isDown || player.movementFlags.up) {
        player.setVelocityY(-320);
    } else if (cursors.down.isDown || player.movementFlags.down) {
        player.setVelocityY(320);
    }

    // --- NPC Interaction Logic ---
    // Calculate the distance between the player and the mission giver
    if (location === "classroom")
    {
        const distance = Phaser.Math.Distance.Between(player.x, player.y, missionGiver.x, missionGiver.y);

        if (distance < 150) {
            // --- Handle Mission Dialogue and State ---
            if (missionComplete) {
                missionText.setText('You found it! Thank you so much!');

                // Remove sparkle from inventory if present
                const itemIndex = inventory.indexOf('sparkle');
                if (itemIndex > -1) {
                    inventory.splice(itemIndex, 1);
                    updateInventoryDisplay.call(this);

                    // Teacher speaks
                    const teacherText = this.add.text(teacher.x, teacher.y - 50, 'It is lunch time!', {
                        fontSize: '24px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x: 15, y: 10 }, borderRadius: 10
                    }).setOrigin(0.5, 1);

                    let timeLeft = 5;
                    const countdownText = this.add.text(teacher.x, teacher.y - 100, timeLeft, {
                        fontSize: '96px', fill: '#fff', stroke: '#000', strokeThickness: 6
                    }).setOrigin(0.5).setScrollFactor(0);

                    // Countdown timer
                    this.time.addEvent({
                        delay: 1000,
                        callback: () => {
                            timeLeft--;
                            if (timeLeft > 0) {
                                countdownText.setText(timeLeft);
                            } else {
                                countdownText.destroy();
                                background.setTexture('cafeteria');
                                player.setPosition(100, 100);
                                teacherText.destroy();
                                teacher.setVisible(false);
                                teacher.body.enable = false;
                                lunchLady.setVisible(true);
                                lunchLady.body.enable = true;
                                location = "cafeteria";
                                missionText.setVisible(false);
                                missionGiver.x = 350;
                                missionGiver.y = 390;

                                const foodItems = ['fries', 'hotdog', 'hamburger', 'taco', 'chocolate_milkshake', 'sprite'];
                                let foodY = 20;
                                foodItems.forEach(item => {
                                    const foodItem = foodGroup.create(300, foodY, item);
                                    foodItem.setInteractive();
                                    foodItem.on('pointerdown', () => {
                                        if (Phaser.Math.Distance.Between(player.x, player.y, foodItem.x, foodItem.y) < 150) {
                                            collectFood.call(this, player, foodItem);
                                        }
                                    });
                                    foodY += 100;
                                });

                                this.add.text(600, 100, [
                                    'MENU',
                                    'Hamburgers',
                                    'Hot Dogs',
                                    'Tacos',
                                    'French Fries',
                                    'Chocolate Milk Shake',
                                    'Sprite'
                                ], { 
                                    fontSize: '32px', 
                                    fill: '#fff', 
                                    backgroundColor: '#333',
                                    padding: { x: 20, y: 20 },
                                    align: 'left'
                                }).setScrollFactor(0);
                            }
                        },
                        repeat: 4
                    });
                }
            } else if (missionAccepted) {
                missionText.setText('Have you found my sparkle yet?');
            } else {
                // This is the first time the player gets the mission
                missionText.setText('Hi Elin! Can you find my lost sparkle?');
                missionAccepted = true;

                // Spawn the sparkle in a random location
                let randomX, randomY;
                do {
                    randomX = Phaser.Math.Between(50, this.cameras.main.width - 50);
                    randomY = Phaser.Math.Between(50, this.cameras.main.height - 50);
                } while (Phaser.Math.Distance.Between(randomX, randomY, missionGiver.x, missionGiver.y) < 300); // Ensure it's far away

                sparkle.enableBody(true, randomX, randomY, true, true);
            }

            missionText.x = missionGiver.x;
            missionText.y = missionGiver.y - 120; // Position text above the NPC's head
            missionText.setVisible(true);
        } else {
            // If far, hide the text
            missionText.setVisible(false);
        }
    }
}
