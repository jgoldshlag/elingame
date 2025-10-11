import Phaser from 'phaser';

var config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
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
var missionText; // The text for the mission dialogue
var sparkle; // The collectible item for the mission
var missionComplete = false; // A flag to track mission status
var missionAccepted = false; // A flag to track if the mission has been given
var inventory = []; // An array to hold the keys of collected items
var inventoryGroup; // A group to display the inventory items
var game = new Phaser.Game(config);

function preload ()
{
    // Load assets (images, sounds, etc.)
    this.load.image('unicorn', 'assets/unicorn.png'); 
    this.load.image('mermaid', 'assets/mermaid.png');
    this.load.image('classroom', 'assets/classroom.jpeg');
    this.load.image('sparkle', 'assets/sparkle.png');
    this.load.audio('collectSound', 'assets/collect.mp3');
}

function create ()
{
    // Create game objects (player, enemies, etc.)
    // Create the background image
    this.add.image(0, 0, 'classroom').setOrigin(0, 0);

    player = this.physics.add.sprite(100, 100, 'unicorn'); //Add player at position (100, 100)
    player.setCollideWorldBounds(true); //Prevent player from going off-screen
    player.setScale(2);
    player.movementFlags = { up: false, down: false, left: false, right: false };

    // --- Create the Mission Giver NPC ---
    missionGiver = this.physics.add.sprite(800, 250, 'unicorn');
    missionGiver.setScale(2);
    missionGiver.setImmovable(true); // The player can't push the NPC
    missionGiver.setTint(0xaaaaff); // Tint the NPC blue to look different

    // Add collision between player and the mission giver
    this.physics.add.collider(player, missionGiver);

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
    const switchButton = createButton(this.cameras.main.width - 150, this.cameras.main.height - 70, 'Switch');

    // --- Add character switch logic ---
    switchButton.on('pointerdown', () => {
        // Check the current texture key and switch to the other one
        if (player.texture.key === 'unicorn') {
            player.setTexture('mermaid');
        } else {
            player.setTexture('unicorn');
        }
    });

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
    const distance = Phaser.Math.Distance.Between(player.x, player.y, missionGiver.x, missionGiver.y);

    if (distance < 150) {
        // --- Handle Mission Dialogue and State ---
        if (missionComplete) {
            missionText.setText('You found it! Thank you so much!');
        } else if (missionAccepted) {
            missionText.setText('Have you found my sparkle yet?');
        } else {
            // This is the first time the player gets the mission
            missionText.setText('Hi Elin! Can you find my lost sparkle?');
            missionAccepted = true;

            // Spawn the sparkle in a random location
            let randomX, randomY;
            do {
                randomX = Phaser.Math.Between(50, config.width - 50);
                randomY = Phaser.Math.Between(50, config.height - 50);
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
