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
var recessTeacher; // The mermaid teacher in the cafeteria who starts recess
var recessStarted = false; // Flag so recess only triggers once
var isSliding = false; // Flag while the player is auto climbing/sliding
var isOnSwing = false; // Flag while the player is riding the swing
var swing1Graphics; // Ropes + seat for the unicorn's swing
var swing2Graphics; // Ropes + seat for the player's swing (visible even at rest)
var unicornSwingTween; // The forever-swinging tween for the unicorn
var mathTeacher; // The teacher in the playground who starts math class
var mathClassStarted = false; // Flag so the math-class countdown only triggers once
var mathGroup; // Group holding the math-quiz UI so we can clear it
var mathQuestions = []; // The list of generated math questions
var mathIndex = 0; // Which question we're on
var mathScore = 0; // How many the player got right
var menuGroup; // Group holding the cafeteria lunch menu text so we can clear it
var lunchLady; // The lunch lady NPC
var missionText; // The text for the mission dialogue
var recessText; // The text for the recess teacher dialogue
var sparkle; // The collectible item for the mission
var missionComplete = false; // A flag to track mission status
var missionAccepted = false; // A flag to track if the mission has been given
var inventory = []; // An array to hold the keys of collected items
var inventoryGroup; // A group to display the inventory items
var background; // Variable for the background image
var location = "classroom";
var foodGroup; // Group for food items
var game = new Phaser.Game(config);
var trayY = 416;
var itemMenu; // Variable for the inventory item interaction menu

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

    // --- Build a playground background texture (so no image file is needed) ---
    const pg = this.add.graphics();
    pg.fillStyle(0x87ceeb, 1); // Sky blue
    pg.fillRect(0, 0, 1024, 1024);
    pg.fillStyle(0x7cfc00, 1); // Green grass
    pg.fillRect(0, 640, 1024, 384);
    pg.fillStyle(0xffd700, 1); // Yellow sun
    pg.fillCircle(150, 150, 80);
    // A simple slide
    pg.fillStyle(0xff6347, 1);
    pg.fillRect(760, 420, 30, 230);
    pg.fillTriangle(760, 420, 760, 640, 920, 640);
    // A ladder for the slide
    pg.lineStyle(8, 0x8b4513, 1);
    pg.beginPath();
    pg.moveTo(700, 420); pg.lineTo(700, 640); // Left rail
    pg.moveTo(745, 420); pg.lineTo(745, 640); // Right rail
    // Rungs to climb
    pg.moveTo(700, 460); pg.lineTo(745, 460);
    pg.moveTo(700, 510); pg.lineTo(745, 510);
    pg.moveTo(700, 560); pg.lineTo(745, 560);
    pg.moveTo(700, 610); pg.lineTo(745, 610);
    pg.strokePath();
    // Swing set frames (the ropes + seat are drawn separately so they can move)
    pg.lineStyle(12, 0x8b4513, 1);
    pg.beginPath();
    pg.moveTo(300, 640); pg.lineTo(360, 380); pg.lineTo(480, 380); pg.lineTo(540, 640);
    pg.strokePath();
    // A second swing set on the left for our player to ride
    pg.beginPath();
    pg.moveTo(40, 640); pg.lineTo(100, 380); pg.lineTo(220, 380); pg.lineTo(280, 640);
    pg.strokePath();
    pg.generateTexture('playground', 1024, 1024);
    pg.destroy();

    // --- Create the Recess Teacher (mermaid) for the cafeteria ---
    recessTeacher = this.physics.add.sprite(700, 600, 'mermaid');
    recessTeacher.setScale(2);
    recessTeacher.setImmovable(true);
    recessTeacher.setVisible(false);
    recessTeacher.body.enable = false;
    this.physics.add.collider(player, recessTeacher);

    // --- Create the Math Teacher (mermaid) for the playground ---
    mathTeacher = this.physics.add.sprite(600, 720, 'mermaid');
    mathTeacher.setScale(2);
    mathTeacher.setImmovable(true);
    mathTeacher.setVisible(false);
    mathTeacher.body.enable = false;
    this.physics.add.collider(player, mathTeacher);

    // --- Create the Dialogue Text ---
    missionText = this.add.text(0, 0, 'Hi Elin! Can you find my lost sparkle?', {
        fontSize: '24px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x: 15, y: 10 }, borderRadius: 10
    }).setOrigin(0.5, 1).setVisible(false); // Center it above the NPC and hide it

    // --- Create the Recess Teacher Dialogue Text ---
    recessText = this.add.text(0, 0, 'It is time for recess!', {
        fontSize: '24px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x: 15, y: 10 }, borderRadius: 10
    }).setOrigin(0.5, 1).setVisible(false);

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

    // --- Create Menu Group (cafeteria lunch menu text) ---
    menuGroup = this.add.group();

    // --- Create Math Quiz UI Group ---
    mathGroup = this.add.group();


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
    if (itemMenu) {
        itemMenu.destroy();
        itemMenu = null;
    }

    // Loop through our inventory array and display each item
    inventory.forEach((itemKey, index) => {
        const x = (this.cameras.main.width / 2 - 200) + 40 + (index * 70); // Position items horizontally
        const y = this.cameras.main.height - 50; // Center vertically in the inventory bar
        const itemSprite = this.add.sprite(x, y, itemKey).setScrollFactor(0);
        
        itemSprite.setInteractive();
        if (itemKey !== 'sparkle')
        {
            itemSprite.on('pointerdown', () => {
                showItemMenu.call(this, itemKey, index, x, y);
            });
        }

        inventoryGroup.add(itemSprite);
    });
}

function showItemMenu(itemKey, index, x, y) {
    if (itemMenu) itemMenu.destroy();
    const scene = this;

    // Create container with a high depth to ensure it's on top of all UI
    itemMenu = this.add.container(x, y - 100).setScrollFactor(0).setDepth(2000);

    // Background graphic
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.lineStyle(2, 0xffffff, 1);
    bg.fillRoundedRect(-75, -65, 150, 130, 10);
    bg.strokeRoundedRect(-75, -65, 150, 130, 10);
    itemMenu.add(bg);

    // Create Rectangles for buttons to provide a solid, reliable hit area
    const eatBtn = this.add.rectangle(0, -30, 130, 50, 0x444444).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const eatText = this.add.text(0, -30, 'Eat', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);

    const dropBtn = this.add.rectangle(0, 30, 130, 50, 0x444444).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const dropText = this.add.text(0, 30, 'Drop', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);

    itemMenu.add([eatBtn, eatText, dropBtn, dropText]);

    // Add hover effects for visual feedback
    eatBtn.on('pointerover', () => eatBtn.setFillStyle(0x666666));
    eatBtn.on('pointerout', () => eatBtn.setFillStyle(0x444444));
    dropBtn.on('pointerover', () => dropBtn.setFillStyle(0x666666));
    dropBtn.on('pointerout', () => dropBtn.setFillStyle(0x444444));

    eatBtn.on('pointerdown', (pointer, localX, localY, event) => {
        if (event) event.stopPropagation();
        if (itemMenu) {
            itemMenu.destroy();
            itemMenu = null;
        }
        inventory.splice(index, 1);
        updateInventoryDisplay.call(scene);
    });

    dropBtn.on('pointerdown', (pointer, localX, localY, event) => {
        if (event) event.stopPropagation();
        // Drop slightly in front of the player so they don't pick it up instantly
        const dropX = player.x + (player.flipX ? 50 : -50);
        const dropY = player.y + 20;

        if (itemKey === 'sparkle') {
            sparkle.enableBody(true, dropX, dropY, true, true);
            missionComplete = false;
        } else {
            const droppedItem = foodGroup.create(dropX, dropY, itemKey);
            droppedItem.setInteractive();
            droppedItem.on('pointerdown', () => {
                if (Phaser.Math.Distance.Between(player.x, player.y, droppedItem.x, droppedItem.y) < 150) {
                    collectFood.call(scene, player, droppedItem);
                }
            });
        }

        if (itemMenu) {
            itemMenu.destroy();
            itemMenu = null;
        }
        inventory.splice(index, 1);
        updateInventoryDisplay.call(scene);
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

// Draws a swing's two ropes and seat at the given angle (degrees) on a graphics object
function drawSwing(graphics, leftX, rightX, pivotY, length, angleDeg) {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const dx = length * Math.sin(rad);
    const dy = length * Math.cos(rad);
    graphics.clear();
    // The two ropes
    graphics.lineStyle(4, 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(leftX, pivotY);
    graphics.lineTo(leftX + dx, pivotY + dy);
    graphics.moveTo(rightX, pivotY);
    graphics.lineTo(rightX + dx, pivotY + dy);
    graphics.strokePath();
    // The seat connecting the bottoms of the ropes
    graphics.lineStyle(12, 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(leftX + dx, pivotY + dy);
    graphics.lineTo(rightX + dx, pivotY + dy);
    graphics.strokePath();
}

// Builds 4 multiple-choice options (the correct answer plus 3 nearby wrong ones), shuffled
function generateMathChoices(correct) {
    const choices = [correct];
    while (choices.length < 4) {
        const candidate = correct + Phaser.Math.Between(-10, 10);
        if (candidate >= 0 && !choices.includes(candidate)) {
            choices.push(candidate);
        }
    }
    Phaser.Utils.Array.Shuffle(choices);
    return choices;
}

// Sets up the 4-question math quiz (2 additions + 2 subtractions) and shows the first question
function startMathClass(scene) {
    mathQuestions = [];

    // Two addition questions with two-digit numbers
    for (let i = 0; i < 2; i++) {
        const a = Phaser.Math.Between(10, 99);
        const b = Phaser.Math.Between(10, 99);
        mathQuestions.push({ text: a + ' + ' + b + ' = ?', answer: a + b });
    }

    // Two subtraction questions that never go negative
    for (let i = 0; i < 2; i++) {
        const a = Phaser.Math.Between(10, 99);
        const b = Phaser.Math.Between(0, a); // b <= a, so a - b is never negative
        mathQuestions.push({ text: a + ' - ' + b + ' = ?', answer: a - b });
    }

    Phaser.Utils.Array.Shuffle(mathQuestions); // Mix up the order
    mathIndex = 0;
    mathScore = 0;
    showMathQuestion(scene);
}

// Displays the current math question with 4 answer buttons, or the final score when done
function showMathQuestion(scene) {
    mathGroup.clear(true, true); // Remove the previous question's UI
    const cx = scene.cameras.main.width / 2;

    // All questions answered -> show the score and let the player explore the classroom
    if (mathIndex >= mathQuestions.length) {
        const result = scene.add.text(cx, 250,
            'Great job, Elin!\nYou got ' + mathScore + ' out of ' + mathQuestions.length + '!\nNow you can walk around the classroom!', {
            fontSize: '44px', fill: '#fff', backgroundColor: '#333', align: 'center', padding: { x: 30, y: 25 }
        }).setOrigin(0.5).setScrollFactor(0);
        mathGroup.add(result);

        location = "freeplay"; // Movement is allowed again (no NPC interactions)

        // Clear the score message after a few seconds so it doesn't block the view
        scene.time.delayedCall(5000, () => {
            mathGroup.clear(true, true);
        });
        return;
    }

    const q = mathQuestions[mathIndex];

    const progress = scene.add.text(cx, 80, 'Question ' + (mathIndex + 1) + ' of ' + mathQuestions.length, {
        fontSize: '28px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setScrollFactor(0);
    mathGroup.add(progress);

    const qText = scene.add.text(cx, 200, q.text, {
        fontSize: '64px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.9)', padding: { x: 20, y: 15 }
    }).setOrigin(0.5).setScrollFactor(0);
    mathGroup.add(qText);

    const choices = generateMathChoices(q.answer);
    const positions = [
        { x: cx - 160, y: 420 },
        { x: cx + 160, y: 420 },
        { x: cx - 160, y: 560 },
        { x: cx + 160, y: 560 }
    ];

    let answered = false;
    const buttons = [];

    choices.forEach((choice, i) => {
        const pos = positions[i];
        const btn = scene.add.rectangle(pos.x, pos.y, 260, 100, 0x4444aa)
            .setScrollFactor(0).setInteractive({ useHandCursor: true });
        const btnText = scene.add.text(pos.x, pos.y, choice, { fontSize: '48px', fill: '#fff' })
            .setOrigin(0.5).setScrollFactor(0);
        mathGroup.add(btn);
        mathGroup.add(btnText);
        buttons.push({ btn: btn, value: choice });

        btn.on('pointerover', () => { if (!answered) btn.setFillStyle(0x6666cc); });
        btn.on('pointerout', () => { if (!answered) btn.setFillStyle(0x4444aa); });

        btn.on('pointerdown', () => {
            if (answered) return;
            answered = true;

            if (choice === q.answer) {
                btn.setFillStyle(0x00aa00); // Correct -> green
                mathScore++;
                scene.sound.play('collectSound'); // Happy sound for a correct answer
            } else {
                btn.setFillStyle(0xaa0000); // Wrong -> red
                // Also show which one was correct
                const correctBtn = buttons.find(b => b.value === q.answer);
                if (correctBtn) correctBtn.btn.setFillStyle(0x00aa00);
            }

            // Move on to the next question after a short pause
            scene.time.delayedCall(1300, () => {
                mathIndex++;
                showMathQuestion(scene);
            });
        });
    });
}

function update ()
{
    // Game logic (movement, collisions, etc.)
    
    // --- Keyboard Controls ---
    // Reset velocity each frame
    player.setVelocity(0);

    // While auto climbing/sliding/swinging or in math class, ignore player input
    if (isSliding || isOnSwing || location === "mathclass") {
        return;
    }

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
                                recessTeacher.setVisible(true);
                                recessTeacher.body.enable = true;
                                location = "cafeteria";
                                missionText.setVisible(false);
                                missionGiver.x = 350;
                                missionGiver.y = 390;

                                const foodItems = ['fries', 'hotdog', 'hamburger', 'taco', 'chocolate_milkshake', 'sprite'];
                                let foodY = 20;
                                foodItems.forEach(item => {
                                    const foodItem = foodGroup.create(300, foodY, item);
                                    foodItem.setInteractive();
                                    foodItem.setVisible(false);
                                    foodItem.on('pointerdown', () => {
                                        if (Phaser.Math.Distance.Between(player.x, player.y, foodItem.x, foodItem.y) < 150) {
                                            collectFood.call(this, player, foodItem);
                                        }
                                    });
                                    foodY += 100;
                                });

                                // Create Interactive Menu
                                const menuTitle = this.add.text(600, 40, 'MENU', { fontSize: '40px', fill: '#ff0' }).setScrollFactor(0);
                                menuGroup.add(menuTitle);

                                const menuItems = [
                                    { name: 'Hamburgers', key: 'hamburger' },
                                    { name: 'Hot Dogs', key: 'hotdog' },
                                    { name: 'Tacos', key: 'taco' },
                                    { name: 'French Fries', key: 'fries' },
                                    { name: 'Chocolate Milk Shake', key: 'chocolate_milkshake' },
                                    { name: 'Sprite', key: 'sprite' }
                                ];

                                let menuY = 100;
                                menuItems.forEach(item => {
                                    const menuText = this.add.text(600, menuY, item.name, { 
                                        fontSize: '28px', 
                                        fill: '#fff', 
                                        backgroundColor: '#333',
                                        padding: { x: 10, y: 5 }
                                    }).setInteractive().setScrollFactor(0);
                                    menuGroup.add(menuText);

                                    menuText.on('pointerdown', () => {
                                        // Find the food sprite and move it to the tray
                                        const foodSprite = foodGroup.getChildren().find(f => f.texture.key === item.key);
                                        if (foodSprite) 
                                        {
                                            foodSprite.setPosition(470, trayY);
                                            trayY += 10;
                                            foodSprite.setVisible(true);
                                            menuText.destroy();
                                        }
                                    });
                                    menuY += 50;
                                });
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
    else if (location === "cafeteria")
    {
        // --- Recess Teacher (mermaid) Interaction ---
        const recessDistance = Phaser.Math.Distance.Between(player.x, player.y, recessTeacher.x, recessTeacher.y);

        if (recessDistance < 150 && !recessStarted) {
            recessStarted = true; // Only trigger once

            recessText.x = recessTeacher.x;
            recessText.y = recessTeacher.y - 120;
            recessText.setVisible(true);

            // Countdown before moving to the playground
            let timeLeft = 5;
            const countdownText = this.add.text(recessTeacher.x, recessTeacher.y - 200, timeLeft, {
                fontSize: '96px', fill: '#fff', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0);

            this.time.addEvent({
                delay: 1000,
                callback: () => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        countdownText.setText(timeLeft);
                    } else {
                        countdownText.destroy();
                        recessText.setVisible(false);

                        // Remove the lunch menu and any leftover food
                        menuGroup.clear(true, true);
                        foodGroup.clear(true, true);

                        // Move everyone to the playground
                        background.setTexture('playground');
                        player.setPosition(100, 100);

                        recessTeacher.setVisible(false);
                        recessTeacher.body.enable = false;
                        lunchLady.setVisible(false);
                        lunchLady.body.enable = false;

                        // Put our unicorn friend on the swing and let it swing!
                        missionGiver.body.enable = false;
                        missionGiver.setVisible(true);
                        missionGiver.setDepth(2); // In front of the ropes
                        const swingPivotX = 420; // Center of the swing top bar
                        const swingPivotY = 380;
                        const ropeLength = 180;  // Distance from the bar down to the seat
                        const ropeLeftX = 400;   // Where the ropes attach to the top bar
                        const ropeRightX = 440;
                        // Graphics for the moving ropes + seat so they swing with the unicorn
                        swing1Graphics = this.add.graphics().setDepth(1);
                        const swingState = { angle: -25 };
                        unicornSwingTween = this.tweens.add({
                            targets: swingState,
                            angle: 25,
                            duration: 1400,
                            ease: 'Sine.easeInOut',
                            yoyo: true,    // Swing back the other way
                            repeat: -1,    // Keep swinging forever
                            onUpdate: () => {
                                const rad = Phaser.Math.DegToRad(swingState.angle);
                                const dx = ropeLength * Math.sin(rad);
                                const dy = ropeLength * Math.cos(rad);
                                missionGiver.x = swingPivotX + dx;
                                missionGiver.y = swingPivotY + dy - 20;
                                missionGiver.setAngle(swingState.angle); // Tilt with the swing

                                // Redraw the ropes and seat in their swung position
                                drawSwing(swing1Graphics, ropeLeftX, ropeRightX, swingPivotY, ropeLength, swingState.angle);
                            }
                        });

                        // Draw the player's swing at rest so it's visible before riding
                        swing2Graphics = this.add.graphics().setDepth(1);
                        drawSwing(swing2Graphics, 140, 180, 380, 180, 0);

                        // Bring out the math teacher to end recess later
                        mathTeacher.setVisible(true);
                        mathTeacher.body.enable = true;

                        location = "playground";
                    }
                },
                repeat: 4
            });
        }
    }
    else if (location === "playground")
    {
        // --- Auto climb the ladder and slide down ---
        // The ladder lives at roughly x 700-745, y 420-640 in the playground art.
        const onLadder = player.x > 690 && player.x < 755 && player.y > 400 && player.y < 660;

        if (onLadder && !isSliding) {
            isSliding = true;
            player.setVelocity(0);

            // 1) Climb up the ladder to the top of the slide
            this.tweens.add({
                targets: player,
                x: 775,
                y: 420,
                duration: 1200,
                ease: 'Linear',
                onComplete: () => {
                    player.flipX = true; // Face down the slide (to the right)
                    // 2) Slide down the slide surface, speeding up as it goes
                    this.tweens.add({
                        targets: player,
                        x: 915,
                        y: 640,
                        duration: 800,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            isSliding = false; // Player can move again
                        }
                    });
                }
            });
        }

        // --- Ride the second swing for 10 seconds ---
        // The left swing set sits at roughly x 80-240, y 400-660 in the playground art.
        const onSwing = player.x > 80 && player.x < 240 && player.y > 400 && player.y < 660;

        if (onSwing && !isOnSwing && !isSliding) {
            isOnSwing = true;
            player.setVelocity(0);
            player.setDepth(2); // In front of the ropes

            const pivotY = 380, length = 180;
            const leftX = 140, rightX = 180, centerX = 160; // Ropes and seat center
            const rideGraphics = swing2Graphics; // Reuse the resting swing's ropes + seat
            const rideState = { angle: -25 };

            const rideTween = this.tweens.add({
                targets: rideState,
                angle: 25,
                duration: 1200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    const rad = Phaser.Math.DegToRad(rideState.angle);
                    player.x = centerX + length * Math.sin(rad);
                    player.y = pivotY + length * Math.cos(rad) - 20;
                    player.setAngle(rideState.angle);
                    drawSwing(rideGraphics, leftX, rightX, pivotY, length, rideState.angle);
                }
            });

            // After 10 seconds, hop off the swing
            this.time.delayedCall(10000, () => {
                rideTween.stop();
                drawSwing(rideGraphics, leftX, rightX, pivotY, length, 0); // Leave the seat at rest
                player.setAngle(0);
                player.setPosition(centerX, 700); // Step off below the swing
                isOnSwing = false;
            });
        }

        // --- Touch the math teacher to end recess and start math class ---
        const mathDistance = Phaser.Math.Distance.Between(player.x, player.y, mathTeacher.x, mathTeacher.y);

        if (mathDistance < 130 && !mathClassStarted && !isOnSwing && !isSliding) {
            mathClassStarted = true;

            const endText = this.add.text(mathTeacher.x, mathTeacher.y - 120, 'Recess is over! Time for math!', {
                fontSize: '24px', fill: '#000', backgroundColor: 'rgba(255,255,255,0.8)', padding: { x: 15, y: 10 }, borderRadius: 10
            }).setOrigin(0.5, 1);

            let timeLeft = 5;
            const countdownText = this.add.text(this.cameras.main.width / 2, 150, timeLeft, {
                fontSize: '96px', fill: '#fff', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0);

            this.time.addEvent({
                delay: 1000,
                callback: () => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        countdownText.setText(timeLeft);
                    } else {
                        countdownText.destroy();
                        endText.destroy();

                        // Stop the playground swings and hide the playground characters
                        if (unicornSwingTween) unicornSwingTween.stop();
                        if (swing1Graphics) swing1Graphics.clear();
                        if (swing2Graphics) swing2Graphics.clear();
                        missionGiver.setVisible(false);
                        mathTeacher.setVisible(false);
                        mathTeacher.body.enable = false;
                        player.setAngle(0);

                        // Head back to the classroom for math class
                        background.setTexture('classroom');
                        player.setPosition(100, 100);
                        location = "mathclass";

                        startMathClass(this);
                    }
                },
                repeat: 4
            });
        }
    }
}
