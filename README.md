Game Difficulty - Main drivers
---

1. game should allow free building style
 - player needs to be aware and plan on what they can build
 + gives the player control on where to build and to choose their own path
1. game should not be overly easy
 - not be able to build too many towers over the number of enemies
 - the towers cannot be too powerful
 + gives the player a challenge and interest in trying to win it
1. game should not be overly hard
 - the amount of towers cannot be too little
 - the towers cannot be too weak
 - there cannot be too many enemies
 + prevents the player from being frustrated and bored
1. the game pace should not be too slow
 - player needs to be able to do things often enough
 + keeps the player interested
1. the game pace should not be too fast
 + allows the player to have time to make choices
1. every gameplay should not feel the same
 - enough randomization to make a difference
 - look of things should be interesting enough
 - enough content to provide difference across gamplays
 + keeps the player interested to play again

Game Difficulty - Rules
---
* number of towers and effectiveness of towers vs. number enemies and enemy resiliency = killrate
* rate of income vs. cost of towers = buildrate
* number of tower types and number of enemy types and variation in randomization

constants:
 - cost of things
variables:
 - rate of enemies

```
function enemyResiliency(enemiesPerSecond, enemyStrength) {
    return enemiesPerSecond * enemyStrength
}
function towerEffectiveness(towerStrength, towerShootRatePerSecond) {
    return towerStrength * towerShootRatePerSecond
}
function killRate(towerStrength, towerShootRatePerSecond, enemiesPerSecond, enemyStrength) {
    return towerEffectiveness(towerStrength, towerShootRatePerSecond) / enemyResiliency(enemiesPerSecond, enemyStrength)
}
function income(enemiesPerSecond, valueOfEnemies) {
    return enemiesPerSecond * valueOfEnemies
}
function buildRate(enemiesPerSecond, valueOfEnemies, costOfTowers) {
    return income(enemiesPerSecond, valueOfEnemies) / costOfTowers
}
```

Min and Max constraints
```
valueOfEnemies = enemyTypes.map(e => e.price).reduce(sum, 0)
costOfTowers = towerTypes.map(t => t.cost).reduce(sum, 0)

enemiesPerSecond = boring-because-nothing-seems-be-happening < x < frustrating-because-cannot-keep-track-over-what-is-happening
                   10/s < x < 20/s
buildRate = boring-because-cannot-do-shit < x < boring-because-the-game-has-no-experience-curve
            0.06/s < x < 1/s
killRate = frustrating-because-game-is-too-difficult < x < boring-because-game-is-too-easy
           0.8 < x < 1.2
```

```
enemiesPerSecond = 10

enemyDesigns.map(e => {
    towerDesigns.map(t => {
        if (t.projectileBuilder) {
            console.log(t.drawing.name, 'kill-rate', killRate(t.power, t.fireRate / 1000, enemiesPerSecond, e.health),
                                        'build-rate', buildRate(enemiesPerSecond, e.price, t.cost))
        }
        if (t.beamBuilder) {
            console.log(t.drawing.name, 'kill-rate', killRate(t.powerConsumptionOnHit, t.maxEnergy / t.powerConsumptionOnHit, enemiesPerSecond, e.health),
                                        'build-rate', buildRate(enemiesPerSecond, e.price, t.cost))
        }
    })
})
```
