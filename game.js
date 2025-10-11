var config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    width: 1024,
    height: 1024,
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
var game = new Phaser.Game(config);

function preload ()
{
    // Load assets (images, sounds, etc.)
    this.load.image('player', 'assets/unicorn.png'); 
    this.load.image('mermaid', 'assets/mermaid.png');
    this.load.image('classroom', 'assets/classroom.jpeg');
}

function create ()
{
    // Create game objects (player, enemies, etc.)
    // Create the background image
    this.add.image(0, 0, 'classroom').setOrigin(0, 0);

    player = this.physics.add.sprite(100, 100, 'player'); //Add player at position (100, 100)
    player.setCollideWorldBounds(true); //Prevent player from going off-screen
    player.setScale(0.5);
}

function update ()
{
    // Game logic (movement, collisions, etc.)
    const cursors = this.input.keyboard.createCursorKeys();

    if (cursors.left.isDown)
    {
        player.setVelocityX(-320);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(320);
        
    }
    else
    {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown)
    {
        player.setVelocityY(-320);
    }
    else if (cursors.down.isDown)
    {
        player.setVelocityY(320);
    }
    else
    {
        player.setVelocityY(0);
    }
}
