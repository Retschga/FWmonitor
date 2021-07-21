/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

// Heavily based on ffwdme.js

const EARTH_RADIUS = 6378137;
const DEG_TO_RAD_FACTOR = Math.PI / 180;

var polylinePoints = null;
var instructions = null;

var nav_parseJSON = async (json) => {
    polylinePoints = nav_decodePolyline(json.routes[0].geometry, false);
    instructions = json.routes[0].segments[0].steps;
    console.log('parsed route', instructions, polylinePoints);
};

/**
 * Decode an x,y or x,y,z encoded polyline
 * @param {*} encodedPolyline
 * @param {Boolean} includeElevation - true for x,y,z polyline
 * @returns {Array} of coordinates
 */
var nav_decodePolyline = (encodedPolyline, includeElevation) => {
    // array that holds the points
    let points = [];
    let index = 0;
    const len = encodedPolyline.length;
    let lat = 0;
    let lng = 0;
    let ele = 0;
    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encodedPolyline.charAt(index++).charCodeAt(0) - 63; // finds ascii
            // and subtract it by 63
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        shift = 0;
        result = 0;
        do {
            b = encodedPolyline.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

        if (includeElevation) {
            shift = 0;
            result = 0;
            do {
                b = encodedPolyline.charAt(index++).charCodeAt(0) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            ele += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        }
        try {
            let location = [lat / 1e5, lng / 1e5];
            if (includeElevation) location.push(ele / 100);
            points.push(location);
        } catch (e) {
            console.log(e);
        }
    }
    return points;
};

var nav_geo_distance = function (p1, p2) {
    // convert degrees to radians
    var lat1 = p1.lat * DEG_TO_RAD_FACTOR;
    var lat2 = p2.lat * DEG_TO_RAD_FACTOR;
    var a =
        Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos((p2.lng - p1.lng) * DEG_TO_RAD_FACTOR);

    return parseInt(EARTH_RADIUS * Math.acos(Math.min(a, 1)));
};

var nav_geo_closestOnLine = function (s1, s2, p) {
    var x1 = s1.lat,
        y1 = s1.lng,
        x2 = s2.lat,
        y2 = s2.lng,
        px = p.lat,
        py = p.lng;
    var xDelta = x2 - x1;
    var yDelta = y2 - y1;

    //p1 and p2 cannot be the same point
    if (xDelta === 0 && yDelta === 0) {
        return s1;
    }

    var u = ((px - x1) * xDelta + (py - y1) * yDelta) / (xDelta * xDelta + yDelta * yDelta);

    var closestPoint;
    if (u < 0) {
        closestPoint = [x1, y1];
    } else if (u > 1) {
        closestPoint = [x2, y2];
    } else {
        closestPoint = [x1 + u * xDelta, y1 + u * yDelta];
    }

    return { lat: closestPoint[0], lng: closestPoint[1] };
};

/**
 * Tries to map the current position on the route.
 *
 * @param {ffwdme.LatLng} pos
 *   A ffwdme LatLng object
 * @param {Object} direction_index
 *   The index of the directions of the route to start
 *   searching for the nearest point of the route.
 * @param {Object} path_index
 *   The index of the single paths representing the direction
 *   above the start searching.
 * @param {Object} direction_max
 *   The maximum number of directions to go through.
 *
 * @return {Object}
 *   A hashtable containing the following information:
 *   directionIndex (int): The direction index of the nearest point found.
 *   prevPathIndex (int): The path index of the nearest point found.
 *   nextPathIndex (int): The path index of the nearest point found.
 *   distance (float): The distance to from the nearest point found to the captured position.
 *   point: (ffwdme.LatLng):The nearest point found on the route (keys: lat, lng).
 */
var nav_nearestTo = function (pos, instructions_index, maxIterations) {
    var nearest = {
        distance: 999999,
        point: null,
        directionIndex: null,
        prevPathIndex: null,
        nextPathIndex: null
    };

    var len = maxIterations ? Math.min(maxIterations, instructions.length) : instructions.length;

    for (var i = instructions_index; i < len; i++) {
        var instruction = instructions[i];
        var pathEnd = instruction.way_points[1];
        var pathStart = instruction.way_points[0];

        for (var j = pathStart; j < pathEnd; j++) {
            var point = nav_geo_closestOnLine(
                { lat: polylinePoints[j][0], lng: polylinePoints[j][1] },
                { lat: polylinePoints[j + 1][0], lng: polylinePoints[j + 1][1] },
                pos
            );

            var distance = nav_geo_distance(pos, point);

            // not closer than before
            if (nearest.distance < distance) continue;

            nearest.distance = distance;
            nearest.point = point;
            nearest.instructionsIndex = i;
            nearest.prevPathIndex = j;
            nearest.nextPathIndex = j + 1;
        }
    }
    return nearest;
};
