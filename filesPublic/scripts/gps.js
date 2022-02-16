/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

/**
 *   https://gist.github.com/viktorbezdek/3957601
 *	Distance between two points
 * 	@param coords1 {lat: xx, lng: yy}
 * 	@param coords2 {lat: xx, lng: yy}
 * 	@returnd distance in meters
 */
function _getCoordsDistance(coords1, coords2) {
    // earth
    let R = 6371, // km
        lat1 = parseFloat(coords1.lat),
        lat2 = parseFloat(coords2.lat),
        lon1 = parseFloat(coords1.lng),
        lon2 = parseFloat(coords2.lng);

    // deg2rad
    lat1 = (lat1 / 180) * Math.PI;
    lat2 = (lat2 / 180) * Math.PI;
    lon1 = (lon1 / 180) * Math.PI;
    lon2 = (lon2 / 180) * Math.PI;

    // Equirectangular approximation
    // lower accuracy, higher performance
    const x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
    const y = lat2 - lat1;
    const d = Math.sqrt(x * x + y * y) * R;
    return Math.round(d * 1000);
}

function _getCoordsDistance_accurate(coords1, coords2) {
    const lat1 = coords1.lat;
    const lon1 = coords1.lng;
    const lat2 = coords2.lat;
    const lon2 = coords2.lng;

    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1000;
}
Number.prototype.toRad = function () {
    return (this * Math.PI) / 180;
};
