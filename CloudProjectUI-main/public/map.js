var map, datasource
document.addEventListener('DOMContentLoaded', function () {

    var complaintsApiUrl = 'https://cmp404-complaints-service-c2e9f0e2dzcbdpg4.austriaeast-01.azurewebsites.net/complaints';
    var publicServicesApiUrl = 'https://cmp404-public-service-g5guhradbtf7g7fj.austriaeast-01.azurewebsites.net/publicService';
    var routeApiUrl = 'https://cmp404-route-service-ggabgjcqdvd9a4em.austriaeast-01.azurewebsites.net/routes';
    var searchApiUrl = 'https://cmp404-route-service-ggabgjcqdvd9a4em.austriaeast-01.azurewebsites.net/search';
    var routeWarningDistanceMeters = 75;
    var servicePatchDistanceMeters = 30;
    var complaintsCache = [];
    var servicesCache = [];
    var serviceMarkers = [];
    var complaintMarkers = [];


    map = new atlas.Map('myMap', {
        // this is where we choose where da map goes
        center: [55.405403, 25.348766],
        zoom: 10,
        style: 'road',

        authOptions: {
            authType: 'subscriptionKey',
            // THIS IS MY SUBSCRIPTION KEY PLEASE BE CAREFUL WITH IT!! (for azure maps)
            subscriptionKey: 'CT7mBaGOBWqBJzJBtcZCRpR12PlJrx3xCk3wmFX3yG3SomtPu5W4JQQJ99CDAC5RqLJ1MK9iAAAgAZMP1RiB'
        }
    });


    function addMarkers(map) {

        // This is where you wanna add new locations in case you want to add more custom markers! 

        const locations = [
            { name: 'Pothole', lat: 25.321694, lon: 55.384251, category: 'obstruction' },
            { name: 'Road obstruction', lat: 25.321680, lon: 55.384251, category: 'obstruction' }
        ];

        locations.forEach(function (location) {
            const color = getCategoryColor(location.category);

            const marker = new atlas.HtmlMarker({
                position: [location.lon, location.lat],
                color: color,
                // incase you want to change what shows up on the marker, this here takes care of that
                text: location.name.charAt(0),
                htmlContent: createCustomMarkerHtml(location, color)
            });
            map.events.add('click', marker, function () {
                showPopup(map, location);
            });
            map.markers.add(marker);
        });
    }

    async function fetchComplaints() {
        try {
            const response = await fetch(complaintsApiUrl);

            if (!response.ok) {
                throw new Error('Complaints API returned ' + response.status);
            }

            complaintsCache = await response.json();
            return complaintsCache;
        } catch (error) {
            console.warn('Could not load complaints:', error);
            complaintsCache = [];
            return complaintsCache;
        }
    }

    function getCoordinateValue(item, names) {
        for (const name of names) {
            if (item[name] != null) {
                return Number(item[name]);
            }
        }

        return null;
    }

    async function loadPublicServiceMarkers() {
        try {
            const response = await fetch(publicServicesApiUrl);

            if (!response.ok) {
                throw new Error('Public service API returned ' + response.status);
            }

            const services = await response.json();
            servicesCache = services;

            serviceMarkers.forEach(function (marker) {
                map.markers.remove(marker);
            });
            serviceMarkers = [];

            services.forEach(function (service) {
                const lon = getCoordinateValue(service, ['xCoord', 'xcoord', 'x', 'lon', 'longitude']);
                const lat = getCoordinateValue(service, ['yCoord', 'ycoord', 'y', 'lat', 'latitude']);

                if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) {
                    return;
                }

                const location = {
                    name: service.type || 'Accessibility service',
                    lat: lat,
                    lon: lon,
                    category: 'service'
                };

                const marker = new atlas.HtmlMarker({
                    position: [lon, lat],
                    htmlContent: createServiceMarkerHtml(location)
                });

                map.events.add('click', marker, function () {
                    showServicePopup(map, location);
                });

                map.markers.add(marker);
                serviceMarkers.push(marker);
            });
        } catch (error) {
            console.warn('Could not load public services:', error);
        }
    }

    async function loadComplaintMarkers() {
        const complaints = await fetchComplaints();
        const services = await fetchPublicServices();

        complaintMarkers.forEach(function (marker) {
            map.markers.remove(marker);
        });
        complaintMarkers = [];

        complaints.forEach(function (complaint) {
            if (isComplaintPatchedByService(complaint, services)) {
                return;
            }

            const point = getPointFromRecord(complaint);

            if (!point) {
                return;
            }

            const location = {
                name: complaint.description || 'Reported issue',
                lat: point[1],
                lon: point[0],
                category: 'obstruction'
            };
            const color = getCategoryColor(location.category);
            const marker = new atlas.HtmlMarker({
                position: [location.lon, location.lat],
                color: color,
                text: location.name.charAt(0),
                htmlContent: createCustomMarkerHtml(location, color)
            });

            map.events.add('click', marker, function () {
                showPopup(map, location);
            });

            map.markers.add(marker);
            complaintMarkers.push(marker);
        });
    }

    function createCustomMarkerHtml(location, color) {
        // css style customization if u wanna change at all
        return `
        <div style="
            background-color: ${color};
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.2)'"
           onmouseout="this.style.transform='scale(1)'">
            ${location.name.charAt(0)}
        </div>
    `;
    }

    function createServiceMarkerHtml(location) {
        return `
        <div style="
            background-color: #ffeb3b;
            border-radius: 50%;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
            font-weight: bold;
            font-size: 16px;
            border: 3px solid #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            cursor: pointer;
        " title="${location.name}">
            S
        </div>
    `;
    }

    function getCategoryColor(category) {
        // i dont know what categories we can have so i only added this for neow
        const colors = {
            obstruction: '#e74c3c'
        };
        return colors[category] || '#95a5a6';
    }
    const popup = new atlas.Popup({
        pixelOffset: [0, -30],
        closeButton: true
    });

    function keepPopupInputsClickable() {
        setTimeout(function () {
            var popupContent = document.querySelector('.atlas-popup-content');

            if (!popupContent) {
                return;
            }

            ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'touchstart', 'touchend'].forEach(function (eventName) {
                popupContent.addEventListener(eventName, function (event) {
                    event.stopPropagation();
                });
            });

            var issueInput = document.getElementById('issueInput');
            if (issueInput) {
                issueInput.focus();
            }
        }, 0);
    }

    async function postComplaint(x, y, description) {
        const data = {
            xCoord: x,
            yCoord: y,
            description: description,
            approved: false
        };

        const response = await fetch(complaintsApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Complaint API returned ' + response.status + ': ' + errorText);
        }

        return response.json();
    }

    function showPopup(map, location) {
        // can change popup here 2 shwo what youd like
        const content = `
            <div style="padding: 12px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #333;">${location.name}</h3>
                <p style="margin: 0 0 4px 0; color: #666;">
                    Category: <strong>${location.category}</strong>
                </p>
                <p style="margin: 0; color: #999; font-size: 12px;">
                    ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
                </p>
            </div>
        `;

        popup.setOptions({
            position: [location.lon, location.lat],
            content: content
        });

        popup.open(map);
    }

    function showServicePopup(map, location) {
        const content = `
            <div style="padding: 12px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #333;">${location.name}</h3>
                <p style="margin: 0 0 4px 0; color: #666;">
                    Accessibility service
                </p>
                <p style="margin: 0; color: #999; font-size: 12px;">
                    ${Number(location.lat).toFixed(4)}, ${Number(location.lon).toFixed(4)}
                </p>
            </div>
        `;

        popup.setOptions({
            position: [location.lon, location.lat],
            content: content
        });

        popup.open(map);
    }

    function setSearchStatus(message) {
        const status = document.getElementById('searchStatus');

        if (status) {
            status.textContent = message;
        }
    }

    async function searchPlace(query) {
        const response = await fetch(searchApiUrl + '?query=' + encodeURIComponent(query));

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Search service returned ' + response.status + ': ' + errorText);
        }

        const searchResults = await response.json();

        if (!searchResults.results || searchResults.results.length === 0) {
            throw new Error('No matching location found.');
        }

        const firstResult = searchResults.results[0];

        if (!firstResult.position) {
            throw new Error('The selected search result did not include coordinates.');
        }

        return {
            lon: firstResult.position.lon,
            lat: firstResult.position.lat,
            name: firstResult.address?.freeformAddress || firstResult.poi?.name || query
        };
    }

    async function setSearchLocation(kind) {
        const inputId = kind === 'start' ? 'startSearchInput' : 'endSearchInput';
        const input = document.getElementById(inputId);
        const query = input ? input.value.trim() : '';

        if (query === '') {
            setSearchStatus('Enter a location first.');
            return;
        }

        try {
            setSearchStatus('Searching...');
            const result = await searchPlace(query);

            if (kind === 'start') {
                setStart(result.lon, result.lat);
            } else {
                setEnd(result.lon, result.lat);
            }

            map.setCamera({
                center: [result.lon, result.lat],
                zoom: 13
            });
            setSearchStatus((kind === 'start' ? 'Start' : 'End') + ' set to ' + result.name);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchStatus(error.message);
        }
    }

    function setupSearchControls() {
        const startButton = document.getElementById('startSearchButton');
        const endButton = document.getElementById('endSearchButton');
        const startInput = document.getElementById('startSearchInput');
        const endInput = document.getElementById('endSearchInput');

        if (startButton) {
            startButton.addEventListener('click', function () {
                setSearchLocation('start');
            });
        }

        if (endButton) {
            endButton.addEventListener('click', function () {
                setSearchLocation('end');
            });
        }

        if (startInput) {
            startInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    setSearchLocation('start');
                }
            });
        }

        if (endInput) {
            endInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    setSearchLocation('end');
                }
            });
        }
    }

    function buildRouteRequestBody() {
        return {
            startLon: startpos[0],
            startLat: startpos[1],
            endLon: endpos[0],
            endLat: endpos[1]
        };
    }

    async function drawRouteAndCheckWarnings() {
        if (startpos == null || endpos == null) {
            return;
        }

        datasource.clear();
        datasource.add([startPoint, endPoint]);

        const response = await fetch(routeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildRouteRequestBody())
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Route service returned ' + response.status + ': ' + errorText);
        }

        const directions = await response.json();
        datasource.add(directions);
        await checkRouteForComplaints(directions);
    }

    function extractRouteCoordinates(directions) {
        const coordinates = [];

        function visitGeometry(geometry) {
            if (!geometry) {
                return;
            }

            if (geometry.type === 'LineString') {
                coordinates.push(...geometry.coordinates);
            }

            if (geometry.type === 'MultiLineString') {
                geometry.coordinates.forEach(function (line) {
                    coordinates.push(...line);
                });
            }
        }

        if (directions && directions.type === 'FeatureCollection') {
            directions.features.forEach(function (feature) {
                visitGeometry(feature.geometry);
            });
        } else if (directions && directions.geometry) {
            visitGeometry(directions.geometry);
        }

        return coordinates;
    }

    function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function distanceMeters(pointA, pointB) {
        const earthRadiusMeters = 6371000;
        const lat1 = degreesToRadians(pointA[1]);
        const lat2 = degreesToRadians(pointB[1]);
        const deltaLat = degreesToRadians(pointB[1] - pointA[1]);
        const deltaLon = degreesToRadians(pointB[0] - pointA[0]);

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function distancePointToSegmentMeters(point, segmentStart, segmentEnd) {
        const metersPerDegreeLat = 111320;
        const metersPerDegreeLon = 111320 * Math.cos(degreesToRadians(point[1]));
        const px = point[0] * metersPerDegreeLon;
        const py = point[1] * metersPerDegreeLat;
        const ax = segmentStart[0] * metersPerDegreeLon;
        const ay = segmentStart[1] * metersPerDegreeLat;
        const bx = segmentEnd[0] * metersPerDegreeLon;
        const by = segmentEnd[1] * metersPerDegreeLat;
        const dx = bx - ax;
        const dy = by - ay;

        if (dx === 0 && dy === 0) {
            return distanceMeters(point, segmentStart);
        }

        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
        const closest = [ax + t * dx, ay + t * dy];
        const deltaX = px - closest[0];
        const deltaY = py - closest[1];

        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    function isComplaintNearRoute(complaint, routeCoordinates) {
        const complaintLon = getCoordinateValue(complaint, ['xCoord', 'xcoord', 'x', 'lon', 'longitude']);
        const complaintLat = getCoordinateValue(complaint, ['yCoord', 'ycoord', 'y', 'lat', 'latitude']);

        if (complaintLon == null || complaintLat == null || Number.isNaN(complaintLon) || Number.isNaN(complaintLat)) {
            return false;
        }

        const complaintPoint = [complaintLon, complaintLat];

        for (let index = 1; index < routeCoordinates.length; index++) {
            const distance = distancePointToSegmentMeters(complaintPoint, routeCoordinates[index - 1], routeCoordinates[index]);

            if (distance <= routeWarningDistanceMeters) {
                return true;
            }
        }

        return false;
    }

    function getPointFromRecord(record) {
        const lon = getCoordinateValue(record, ['xCoord', 'xcoord', 'x', 'lon', 'longitude']);
        const lat = getCoordinateValue(record, ['yCoord', 'ycoord', 'y', 'lat', 'latitude']);

        if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) {
            return null;
        }

        return [lon, lat];
    }

    async function fetchPublicServices() {
        try {
            const response = await fetch(publicServicesApiUrl);

            if (!response.ok) {
                throw new Error('Public service API returned ' + response.status);
            }

            servicesCache = await response.json();
            return servicesCache;
        } catch (error) {
            console.warn('Could not load public services for route check:', error);
            return servicesCache;
        }
    }

    function isComplaintPatchedByService(complaint, services) {
        const complaintPoint = getPointFromRecord(complaint);

        if (!complaintPoint) {
            return false;
        }

        return services.some(function (service) {
            const servicePoint = getPointFromRecord(service);

            return servicePoint && distanceMeters(complaintPoint, servicePoint) <= servicePatchDistanceMeters;
        });
    }

    async function checkRouteForComplaints(directions) {
        const routeCoordinates = extractRouteCoordinates(directions);

        if (routeCoordinates.length < 2) {
            return;
        }

        const complaints = await fetchComplaints();
        const services = await fetchPublicServices();
        const routeComplaints = complaints.filter(function (complaint) {
            return !isComplaintPatchedByService(complaint, services) &&
                isComplaintNearRoute(complaint, routeCoordinates);
        });

        if (routeComplaints.length > 0) {
            alert('There is an obstruction/broken road detected on this path');
        }
    }
    window.test = function test() {
        console.log("working!!");
    }
    var startMarker = null;
    var startpos = null;
    var startPoint = null;
    window.setStart = function setStart(position1, position2) {

        if (startMarker != null) {
            map.markers.remove(startMarker);
        }
        startpos = [position1, position2]
        startMarker = new atlas.HtmlMarker({
            position: startpos,
            color: "#e80000"
        });
        console.log(startpos);
        map.markers.remove(currentMarker);
        map.markers.add(startMarker);
        popup.close();


        startPoint = new atlas.data.Feature(new atlas.data.Point(startpos), {
            iconImage: 'pin-blue'
        });
        if (endpos != null) {
            drawRouteAndCheckWarnings().catch(function (error) {
                console.error('Route request failed:', error);
                alert('Could not calculate route: ' + error.message);
            });
        }
    }
    var routeRequestURL = null
    var endMarker = null;
    var endpos = null;
    var endPoint = null;
    window.setEnd = function setEnd(position1, position2) {
        if (endMarker != null) {
            map.markers.remove(endMarker);
        }
        endpos = [position1, position2]
        endMarker = new atlas.HtmlMarker({
            position: endpos,
            color: "#0cb300"
        });
        console.log(startpos);
        map.markers.remove(currentMarker);
        map.markers.add(endMarker);
        popup.close();
        endPoint = new atlas.data.Feature(new atlas.data.Point(endpos), {
            title: 'Redmond',
            iconImage: 'pin-red'
        });
        if (startpos != null) {
            drawRouteAndCheckWarnings().catch(function (error) {
                console.error('Route request failed:', error);
                alert('Could not calculate route: ' + error.message);
            });
        }
    }
    window.writePopup = function writePopup(position) {
        const content = document.createElement('div');
        content.style.padding = '12px';
        content.style.maxWidth = '250px';

        const title = document.createElement('h3');
        title.textContent = 'Report Issue';
        title.style.margin = '0 0 8px 0';
        title.style.color = '#333';

        const label = document.createElement('label');
        label.htmlFor = 'issueInput';
        label.textContent = 'Description';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'issueInput';
        input.placeholder = 'Describe the issue';
        input.style.width = '100%';
        input.style.marginTop = '5px';
        input.style.boxSizing = 'border-box';

        const submitButton = document.createElement('button');
        submitButton.type = 'button';
        submitButton.textContent = 'Submit Report';
        submitButton.style.marginTop = '12px';
        submitButton.addEventListener('click', function (event) {
            event.stopPropagation();
            saveIssueData(position[0], position[1]);
        });

        [content, input, submitButton].forEach(function (element) {
            ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'touchstart', 'touchend', 'keydown', 'keyup'].forEach(function (eventName) {
                element.addEventListener(eventName, function (event) {
                    event.stopPropagation();
                });
            });
        });

        content.appendChild(title);
        content.appendChild(label);
        content.appendChild(document.createElement('br'));
        content.appendChild(input);
        content.appendChild(document.createElement('br'));
        content.appendChild(submitButton);

        popup.setOptions({
            position: [position[0], position[1]],
            content: content
        });

        popup.open(map);
        setTimeout(function () {
            input.focus();
        }, 0);
    };

    window.saveIssueData = async function (lon, lat) {
        const inputElement = document.getElementById('issueInput');
        const issueText = inputElement.value;

        if (issueText.trim() === "") {
            alert("no description :(");
            return;
        }

        let savedComplaint;
        try {
            savedComplaint = await postComplaint(lon, lat, issueText);
            console.log('Saved complaint:', savedComplaint);
            complaintsCache.push(savedComplaint);
        } catch (error) {
            console.error('Error during complaint POST request:', error);
            alert('Could not submit report. Make sure complaints-service API is running on https://cmp404-complaints-service-c2e9f0e2dzcbdpg4.austriaeast-01.azurewebsites.net and check the browser console.');
            return;
        }

        popup.close();
        if (currentMarker) {
            map.markers.remove(currentMarker);
        }

        const reportedLocation = {
            name: issueText,
            lat: lat,
            lon: lon,
            category: 'obstruction'
        };
        const color = getCategoryColor(reportedLocation.category);
        const marker = new atlas.HtmlMarker({
            position: [reportedLocation.lon, reportedLocation.lat],
            color: color,
            text: reportedLocation.name.charAt(0),
            htmlContent: createCustomMarkerHtml(reportedLocation, color)
        });
        map.events.add('click', marker, function () {
            showPopup(map, reportedLocation);
        });
        map.markers.add(marker);
        complaintMarkers.push(marker);
    };

    function popupAsk(map, position) {
        // can change popup here 2 shwo what youd like
        const content = `
            <div style="padding: 12px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; color: #333;">what do you wanna do!</h3>
                <button onclick="setStart(${position[0]},${position[1]})">start loc</button><button onclick="setEnd(${position[0]},${position[1]})">end loc</button><button onclick="writePopup([${position[0]},${position[1]}])">report issue</button>
                </p>
                <p style="margin: 0; color: #999; font-size: 12px;">
                    ${position[0]}, ${position[1]}
                </p>
            </div>
        `;

        popup.setOptions({
            position: [position[0], position[1]],
            content: content
        });

        popup.open(map);
        keepPopupInputsClickable();
    }

    // Wait for the map to be ready before adding data
    map.events.add('ready', function () {
        console.log('Map is ready');
        setupSearchControls();
        loadComplaintMarkers();
        loadPublicServiceMarkers();
        setInterval(loadComplaintMarkers, 10000);
        setInterval(loadPublicServiceMarkers, 10000);
        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        map.layers.add(new atlas.layer.LineLayer(datasource, null, {
            strokeColor: '#2272B9',
            strokeWidth: 5,
            lineJoin: 'round',
            lineCap: 'round'
        }), 'labels');


        //archaic map controls that i hate so i removed etoo
        //addControls(map);
    });


    // This is for when you click to add a marker
    var currentMarker = null;
    map.events.add('contextmenu', function (e) {
        // Get the coordinates of the click
        console.log(e.target)
        var position = e.position;
        if (currentMarker) {
            map.markers.remove(currentMarker);
        }
        var longitude = position[0];
        var latitude = position[1];
        popupAsk(map, position);
        currentMarker = new atlas.HtmlMarker({
            position: position
        });
        map.markers.add(currentMarker);
    });

});
