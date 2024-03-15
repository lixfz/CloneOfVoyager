// Create your bot
const mineflayer = require("mineflayer")
const collectBlock = require('mineflayer-collectblock').plugin
const bot = mineflayer.createBot({
    // host: 'n03',
    port: 55506,
    username: 'f',
})

let mcData

// Load collect block
bot.loadPlugin(collectBlock)

function getSurroundingBlocks(bot, x_distance, y_distance, z_distance) {
    const surroundingBlocks = new Set();

    for (let x = -x_distance; x <= x_distance; x++) {
        for (let y = -y_distance; y <= y_distance; y++) {
            for (let z = -z_distance; z <= z_distance; z++) {
                const block = bot.blockAt(bot.entity.position.offset(x, y, z));
                if (block && block.type !== 0) {
                    surroundingBlocks.add(block.name);
                }
            }
        }
    }
    // console.log(surroundingBlocks);
    return surroundingBlocks;
}

function getEquipment(bot) {
    const slots = bot.inventory.slots;
    const mainHand = bot.heldItem;
    return slots
        .slice(5, 9)
        .concat(mainHand, slots[45])
        .map(itemToObs);
}

function getInventory(bot) {
    return bot.inventory.items().map(itemToObs);
}

function itemToObs(item) {
    if (!item) return null;
    return item.name;
}

function getEntities(bot) {
    const entities = bot.entities;
    if (!entities) return {};
    // keep all monsters in one list, keep other mobs in another list
    const mobs = {};
    for (const id in entities) {
        const entity = entities[id];
        if (!entity.displayName) continue;
        if (entity.name === "player" || entity.name === "item") continue;
        if (entity.position.distanceTo(bot.entity.position) < 32) {
            if (!mobs[entity.name]) {
                mobs[entity.name] = entity.position.distanceTo(
                    bot.entity.position
                );
            } else if (
                mobs[entity.name] >
                entity.position.distanceTo(bot.entity.position)
            ) {
                mobs[entity.name] = entity.position.distanceTo(
                    bot.entity.position
                );
            }
        }
    }
    return mobs;
}

function getStatue(bot) {
    return {
        health: bot.health,
        food: bot.food,
        saturation: bot.foodSaturation,
        oxygen: bot.oxygenLevel,
        position: bot.entity.position,
        velocity: bot.entity.velocity,
        yaw: bot.entity.yaw,
        pitch: bot.entity.pitch,
        onGround: bot.entity.onGround,
        equipment: getEquipment(bot),
        name: bot.entity.username,
        timeSinceOnGround: bot.entity.timeSinceOnGround,
        isInWater: bot.entity.isInWater,
        isInLava: bot.entity.isInLava,
        isInWeb: bot.entity.isInWeb,
        isCollidedHorizontally: bot.entity.isCollidedHorizontally,
        isCollidedVertically: bot.entity.isCollidedVertically,
        biome: bot.blockAt(bot.entity.position)
            ? bot.blockAt(bot.entity.position).biome.name
            : "None",
        entities: getEntities(bot),
        // timeOfDay: this.getTime(),
        // inventoryUsed: bot.inventoryUsed(),
        elapsedTime: bot.globalTickCounter,
        voxels: getSurroundingBlocks(bot, 8, 2, 8),
        inventory: getInventory(bot),
        slot: bot.inventory.slots.map(itemToObs),
        chests: bot.findBlocks({
            matching: bot.registry.blocksByName.chest.id,
            maxDistance: 16,
            count: 999,
        })
    };
}

async function collectGrass() {
    console.log('start find')
    // Find a nearby grass block
    const grass = bot.findBlock({
        // matching: mcData.blocksByName.stone.id,
        // matching: mcData.blocksByName.grass_block.id,
        matching: mcData.blocksByName.oak_log.id,
        maxDistance: 64
    })
    if (grass) {
        // If we found one, collect it.
        try {
            // const targets = bot.collectBlock.findFromVein(grass, 1)
            // console.log('start collect ' + targets.length)
            console.log('collect>> ');
            // console.log(grass);
            await bot.collectBlock.collect(grass)
            // const obs = bot.inventory
            // console.log(obs);
            console.log(getStatue(bot));

            collectGrass() // Collect another grass block
        } catch (err) {
            console.log(err) // Handle errors, if any
        }
    } else {
        console.log('not found')
    }
}


// On spawn, start collecting all nearby grass
bot.once('spawn', async () => {
    console.log('on spawn')
    mcData = require('minecraft-data')(bot.version)
    // for (let key in mcData.blocksByName){
    //     if( mcData.blocksByName[key].diggable){
    //         console.log(key)
    //     }
    // }

    await bot.waitForChunksToLoad()
    // bot.chat("/clear @s");
    // bot.chat("/kill @s");

    bot.chat('bot Ready!')
    console.log(getStatue(bot));
    console.log('bot Ready!')

    //
    // console.log(getStatue(bot));
    // console.log('---');
    // collectGrass()
})


bot.on('chat', async (username, message) => {
    const args = message.split(' ')
    if (args[0] !== 'collect') return
    console.log(message)

    let count = 1
    if (args.length === 3) count = parseInt(args[1])

    let type = args[1]
    if (args.length === 3) type = args[2]

    const blockType = mcData.blocksByName[type]
    if (!blockType) {
        return
    }

    const blocks = bot.findBlocks({
        matching: blockType.id,
        // maxDistance: 64,
        maxDistance: 128,
        count: count
    })

    if (blocks.length === 0) {
        bot.chat("I don't see that block nearby.")
        return
    }

    const targets = []
    for (let i = 0; i < Math.min(blocks.length, count); i++) {
        targets.push(bot.blockAt(blocks[i]))
    }

    bot.chat(`Found ${targets.length} ${type}(s)`)

    try {
        await bot.collectBlock.collect(targets)
        // All blocks have been collected.
        bot.chat('Done')
        console.log(getStatue(bot))
    } catch (err) {
        // An error occurred, report it.
        bot.chat(err.message)
        console.log(err)
    }
})