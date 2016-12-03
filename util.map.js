"use strict";
var listUtils = require('util.list');

function getPathDistanceTo(from, to) {
    var result = PathFinder.search(from, { pos: to, range: 1 }, {
        //maxRooms: 2,
        plainCost: 1,
        swampCost: 1
    });
    if (!result.incomplete)
        return result.cost;
    else
        return null;
}
module.exports.getPathDistanceTo = getPathDistanceTo;
function getRangeDistanceTo(from, to) {
    if (from.roomName === to.roomName)
        return from.getRangeTo(to);
    else
        return Game.map.getRoomLinearDistance(from.roomName, to.roomName) * 50;
}
module.exports.getRangeDistanceTo = getRangeDistanceTo;

function findClosestCreepByPath(from, creeps, filter) {
    var bestCreep = null;
    var bestDistance = 9999;
    for (var key in creeps) {
        var creep = Game.creeps[creeps[key]];
        if (creep && (!filter || filter(creep))) {
            var distance = getPathDistanceTo(from, creep.pos);
            if (distance < bestDistance) {
                bestCreep = creep;
                bestDistance = distance;
            }
        }
    }
    if (bestCreep)
        return bestCreep;
    else
        return null;
}
module.exports.findClosestCreepByPath = findClosestCreepByPath;
function findClosestStructureByPath(from, structures, filter) {
    var bestStructure = null;
    var bestDistance = 9999;
    for (var key in structures) {
        var structure = Game.structures[structures[key]];
        if (!structure)
            structure = Game.getObjectById(structures[key]);
        if (structure && (!filter || filter(structure))) {
            var distance = getPathDistanceTo(from, structure.pos);
            if (distance < bestDistance) {
                bestStructure = structure;
                bestDistance = distance;
            }
        }
    }
    if (bestStructure)
        return bestStructure;
    else
        return null;
}
module.exports.findClosestStructureByPath = findClosestStructureByPath;

function findClosestCreepByRange(from, creeps, filter) {
    var bestCreep = null;
    var bestDistance = 9999;
    for (var key in creeps) {
        var creep = Game.creeps[creeps[key]];
        if (creep && (!filter || filter(creep))) {
            var distance = getRangeDistanceTo(from, creep.pos);
            if (distance < bestDistance) {
                bestCreep = creep;
                bestDistance = distance;
            }
        }
    }
    if (bestCreep)
        return bestCreep;
    else
        return null;
}
module.exports.findClosestCreepByRange = findClosestCreepByRange;
function findClosestStructureByRange(from, structures, filter) {
    var bestStructure = null;
    var bestDistance = 9999;
    for (var key in structures) {
        var structure = Game.structures[structures[key]];
        if (!structure)
            structure = Game.getObjectById(structures[key]);
        if (structure && (!filter || filter(structure))) {
            var distance = getRangeDistanceTo(from, structure.pos);
            if (distance < bestDistance) {
                bestStructure = structure;
                bestDistance = distance;
            }
        }
    }
    if (bestStructure)
        return bestStructure;
    else
        return null;
}
module.exports.findClosestStructureByRange = findClosestStructureByRange;

function findAnyCreep(from, creeps, filter) {
    for (var key in creeps) {
        var creep = Game.creeps[creeps[key]];
        if (!filter || filter(creep))
            return creep;
    }
    return null;
}
module.exports.findAnyCreep = findAnyCreep;
function findAnyStructure(from, structures, filter) {
    for (var key in structures) {
        var structure = Game.structures[structures[key]];
        if (!filter || filter(structure))
            return structure;
    }
    return null;
}
module.exports.findAnyStructure = findAnyStructure;

module.exports.findDropoff = function(from, base, amount) {
    var structure = findClosestStructureByRange(from, base.dropoffs, (x) => {
        if (x.store)
            return _.sum(x.store) !== x.storeCapacity;
        else
            return x.energy !== x.energyCapacity;
    });
    if (structure)
        return structure;
}
module.exports.findStorage = function(from, base, amount) {
    var structure = findClosestStructureByRange(from, base.pickups, (x) => {
        if (x.store)
            return x.store.energy >= amount;
        else
            return x.energy >= amount;
    });
    if (structure)
        return structure;
}

//Serialization
function serializePos(pos) {
    var x, y;
    if (pos.x < 10)
        x = '0' + pos.x;
    else
        x = pos.x.toString();
    if (pos.y < 10)
        y = '0' + pos.y;
    else
        y = pos.y.toString();
    return x + y + pos.roomName;
}
module.exports.serializePos = serializePos;
module.exports.deserializePos = function(pos) {
    if (_.isString(pos)) {
        var x = parseInt(pos.substr(0, 2));
        var y = parseInt(pos.substr(2, 4));
        var room = pos.substr(4);
        return new RoomPosition(x, y, room);
    }
    else if (_.isArray(pos))
        return new RoomPosition(pos[0], pos[1], pos[2]); //TODO: remove
    else
        return new RoomPosition(pos.x, pos.y, pos.roomName); //TODO: remove
}
module.exports.serializePath = function(path) {
    var results = [];
    for (var i = 0; i < path.length; i++) {
        var pos = path[i];
        listUtils.add(results, serializePos(pos));
    }
    return results;
}
module.exports.serializeRelativePath = function(path) {
    var result = '';
    for (var i = 0; i < path.length; i++)
        result = result + path[i].direction;
    return result;
}

//Build planning
module.exports.getBuildPosition = function(room, center, minRadius, maxRadius, costs) {
    for (var max = minRadius; max <= maxRadius; max += 2) {
        var radius = max - minRadius;
        for (var i = 0; i < 5; i++) {
            var xOffset = Math.random() * radius * 2 - radius;
            xOffset += (xOffset > 0) ? minRadius : -minRadius; 
            var yOffset = Math.random() * radius * 2 - radius;
            yOffset += (yOffset > 0) ? minRadius : -minRadius;
            var x = Math.round(center.x + xOffset);
            var y = Math.round(center.y + yOffset);

            if (x >= 0 && y >= 0 && x < 50 && y < 50 && !costs.get(x, y)) {
                var results = room.lookAt(x, y);
                var valid = true;
                for (var j = 0; j < results.length; j++) {
                    if (results[j].type !== LOOK_TERRAIN || results[j].terrain === 'wall') {
                        valid = false;
                        break;
                    }
                }
                if (valid)
                    return new RoomPosition(x, y, room.name);
            }
        }
    }
    return null;
}

module.exports.findSpacesAround = function(pos) {
    var result = [];
    if (pos.y !== 0) {
        if (pos.x !== 0 && Game.map.getTerrainAt(pos.x - 1, pos.y - 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x - 1, pos.y - 1]);
        if (Game.map.getTerrainAt(pos.x, pos.y - 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x, pos.y - 1]);
        if (pos.x !== 49 && Game.map.getTerrainAt(pos.x + 1, pos.y - 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x + 1, pos.y - 1]);
    }
    if (pos.x !== 0 && Game.map.getTerrainAt(pos.x - 1, pos.y, pos.roomName) !== "wall")
        listUtils.add(result, [pos.x - 1, pos.y]);
    if (pos.x !== 49 && Game.map.getTerrainAt(pos.x + 1, pos.y, pos.roomName) !== "wall")
        listUtils.add(result, [pos.x + 1, pos.y]);
    if (pos.y !== 49) {
        if (pos.x !== 0 && Game.map.getTerrainAt(pos.x - 1, pos.y + 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x - 1, pos.y + 1]);
        if (Game.map.getTerrainAt(pos.x, pos.y + 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x, pos.y + 1]);
        if (pos.x !== 49 && Game.map.getTerrainAt(pos.x + 1, pos.y + 1, pos.roomName) !== "wall")
            listUtils.add(result, [pos.x + 1, pos.y + 1]);
    }
    return result;
}
module.exports.findContainerPos = function(center, openSpots) {
    var minX = center.x - 2;
    var minY = center.y - 2;
    var maxX = center.x + 2;
    var maxY = center.y + 2;

    if (minX < 2)
        minX = 2;
    if (minY < 2)
        minY = 2;
    if (maxX > 47)
        maxX = 47;
    if (maxY > 47)
        maxY = 47;

    var bestPos = null;
    var bestCount = 0;    

    //Top
    if (minY === center.y - 2) {
        for (var x = minX; x <= maxX; x++) {
            if (Game.map.getTerrainAt(x, minY, center.roomName) !== "wall") {
                var count = countPositionsAround(x, minY, openSpots);
                if (count > bestCount) {
                    bestCount = count;
                    bestPos = new RoomPosition(x, minY, center.roomName);
                }
            }
        }
    }    
    //Bottom
    if (maxY === center.y + 2) {
        for (var x = minX; x <= maxX; x++) {
            if (Game.map.getTerrainAt(x, maxY, center.roomName) !== "wall") {
                var count = countPositionsAround(x, maxY, openSpots);
                if (count > bestCount){
                    bestCount = count;
                    bestPos = new RoomPosition(x, maxY, center.roomName);
                }
            }
        }
    }
    //Left
    if (minX === center.x - 2) {
        for (var y = minY; y <= maxY; y++) {
            if (Game.map.getTerrainAt(minX, y, center.roomName) !== "wall") {
                var count = countPositionsAround(minX, y, openSpots);
                if (count > bestCount){
                    bestCount = count;
                    bestPos = new RoomPosition(minX, y, center.roomName);
                }
            }
        }
    }    
    //Right
    if (maxX === center.x + 2) {
        for (var y = minY; y <= maxY; y++) {
            if (Game.map.getTerrainAt(maxX, y, center.roomName) !== "wall") {
                var count = countPositionsAround(maxX, y, openSpots);
                if (count > bestCount){
                    bestCount = count;
                    bestPos = new RoomPosition(maxX, y, center.roomName);
                }
            }
        }
    }

    return bestPos;
}

function countPositionsAround(x, y, openSpots) {
    var result = 0;
    if (isOpen(x - 1, y - 1, openSpots))
        result++;
    if (isOpen(x, y - 1, openSpots))
        result++;
    if (isOpen(x + 1, y - 1, openSpots))
        result++;
    if (isOpen(x - 1, y, openSpots))
        result++;
    if (isOpen(x + 1, y, openSpots))
        result++;
    if (isOpen(x - 1, y + 1, openSpots))
        result++;
    if (isOpen(x, y + 1, openSpots))
        result++;
    if (isOpen(x + 1, y + 1, openSpots))
        result++;
    return result;
}

function isOpen(x, y, openSpots) {
    for (var i = 0; i < openSpots.length; i++) {
        var spot = openSpots[i];
        if (spot[0] === x && spot[1] === y)
            return true;
    }
    return false;
}